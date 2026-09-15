"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/server";
import {
  getCurrentStage,
  setCurrentStage,
  getMarketResearchCredit,
  getMarketResearchResults,
  saveMarketResearchResults,
  resetMarketResearch,
  getFinancingDecision,
  saveFinancingDecision,
  resetFinancingDecision,
} from "@/lib/db";
import { TOTAL_STAGES } from "@/lib/game-stages";
import {
  MARKET_RESEARCH_SERVICES,
  rollServiceOutcome,
  type HotelTier,
  type MarketResearchResults,
  type MarketResearchServiceKey,
} from "@/lib/market-research";
import { getFinancingTier, type FinancingDecision } from "@/lib/financing";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;

async function requireUserId(): Promise<string> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    throw new Error("غير مسجل دخول");
  }
  return session.user.id;
}

/**
 * ينقل اللاعب للمرحلة التالية (يتوقف عند 10، ما يتخطاها). محمي كمان من
 * السيرفر (مو بس بإخفاء الزر بالواجهة) — ما يسمح يتخطى مرحلة دراسة
 * السوق قبل ما يأكّد قرار الشراء فعلياً (حتى لو القرار "ما بشتري شي").
 */
export async function advanceStage() {
  const userId = await requireUserId();
  const current = await getCurrentStage(userId);

  if (current === MARKET_RESEARCH_STAGE_ID) {
    const results = await getMarketResearchResults(userId);
    if (results?.confirmed !== true) {
      throw new Error("لازم تأكّد قرار دراسة السوق قبل ما تكمّل.");
    }
  }

  if (current === FINANCING_STAGE_ID) {
    const decision = await getFinancingDecision(userId);
    if (decision === null) {
      throw new Error("لازم تأكّد قرار التمويل قبل ما تكمّل.");
    }
  }

  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/**
 * إعادة البدء — يرجّع currentStage لـ1، وكمان يمسح تقدّم دراسة السوق
 * وقرار التمويل حتى تكون كل مرحلة جاهزة من الصفر بالجولة الجاية.
 * للتجربة أثناء البناء فقط.
 */
export async function restartGame() {
  const userId = await requireUserId();
  await setCurrentStage(userId, 1);
  await resetMarketResearch(userId);
  await resetFinancingDecision(userId);
  revalidatePath("/game");
}

export type MarketResearchFormState = { error: string } | null;

/**
 * يتأكد إن السلة صالحة (خدمات معروفة فقط، مجموع أسعارها ما يتخطى
 * الحد الأقصى)، ينفّذ الشراء دفعة وحدة: يحسب نتيجة فورية عشوائية
 * لدراسة الجدوى/الاستشاريين لو اتختارو، ويخزّن علم شبكة الفنادق بدون
 * نتيجة ظاهرة لو اتختارت. يخزّن كل شي مرة وحدة — بعدها القراءة بس.
 */
export async function confirmMarketResearchPurchase(
  _prevState: MarketResearchFormState,
  formData: FormData
): Promise<MarketResearchFormState> {
  const userId = await requireUserId();

  const validKeys = new Set(MARKET_RESEARCH_SERVICES.map((s) => s.key));
  const selected = [
    ...new Set(
      formData
        .getAll("services")
        .map(String)
        .filter((key): key is MarketResearchServiceKey => validKeys.has(key as MarketResearchServiceKey))
    ),
  ];

  const credit = await getMarketResearchCredit(userId);
  const total = MARKET_RESEARCH_SERVICES.filter((s) => selected.includes(s.key)).reduce(
    (sum, s) => sum + s.price,
    0
  );
  if (total > credit) {
    return { error: `مجموع الاختيارات (${total}) أكبر من الحد الأقصى (${credit}).` };
  }

  const outcomes: MarketResearchResults["outcomes"] = {};
  if (selected.includes("feasibility")) {
    outcomes.feasibility = rollServiceOutcome("feasibility");
  }
  if (selected.includes("consultants")) {
    outcomes.consultants = rollServiceOutcome("consultants");
  }

  const hotelConnection: HotelTier[] = [];
  if (selected.includes("hotel5star")) hotelConnection.push("5star");
  if (selected.includes("hotel2star")) hotelConnection.push("2star");

  const results: MarketResearchResults = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    purchased: selected,
    outcomes,
    ...(hotelConnection.length > 0 ? { hotelConnection } : {}),
  };

  await saveMarketResearchResults(userId, results);
  revalidatePath("/game");
  return null;
}

export type FinancingFormState = { error: string } | null;

/**
 * يتأكد إن اللاعب اختار مستوى تمويل معروف ورقم رأس مال ضمن نطاق نفس
 * المستوى (سيرفر-سايد، مو بس حدود الـinput بالواجهة)، ويخزّن قرار
 * التمويل مرة وحدة: startingCapital، investorEquityPercent الثابتة
 * حسب المستوى، financingStartedAt (توقيت التأكيد بالضبط)،
 * وfinancingDeadlineDays حسب المستوى.
 */
export async function confirmFinancingDecision(
  _prevState: FinancingFormState,
  formData: FormData
): Promise<FinancingFormState> {
  const userId = await requireUserId();

  const tierKey = String(formData.get("tier") ?? "");
  const tier = getFinancingTier(tierKey);
  if (!tier) {
    return { error: "لازم تختار مستوى تمويل." };
  }

  const rawAmount = formData.get(`amount_${tier.key}`);
  const amount = Number(rawAmount);
  if (
    rawAmount === null ||
    rawAmount === "" ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount < tier.min ||
    amount > tier.max
  ) {
    return {
      error: `رأس المال لازم يكون رقم صحيح بين ${tier.min.toLocaleString("ar")} و${tier.max.toLocaleString("ar")}.`,
    };
  }

  const decision: FinancingDecision = {
    startingCapital: amount,
    investorEquityPercent: tier.investorEquityPercent,
    financingStartedAt: new Date().toISOString(),
    financingDeadlineDays: tier.deadlineDays,
  };

  await saveFinancingDecision(userId, decision);
  revalidatePath("/game");
  return null;
}
