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
  getCurrentCapital,
  getLicensingResult,
  applyLicensingDecision,
  resetLicensing,
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
import {
  AGENCY_COST,
  AGENCY_DAYS,
  SELF_BASE_COST,
  SELF_BASE_DAYS,
  SELF_UNREADY_EXTRA_DAYS,
  rollSelfLicensingEvents,
  type LicensingPath,
  type LicensingResult,
} from "@/lib/licensing";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;
const LICENSING_STAGE_ID = 4;

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

  if (current === LICENSING_STAGE_ID) {
    const result = await getLicensingResult(userId);
    if (result === null) {
      throw new Error("لازم تأكّد مسار ترخيص قبل ما تكمّل.");
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
  await resetLicensing(userId);
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

export type LicensingFormState = { error: string } | null;

/**
 * يتأكد إن اللاعب اختار مسار معروف، يحسب التكلفة والأيام الإجمالية
 * (بما فيها مفاجآت مسار "self" العشوائية — تُرمى هون مرة وحدة، ما
 * تُعاد لاحقاً)، يرفض سيرفر-سايد لو التكلفة أكبر من currentCapital
 * المتاح، وإلا يخصم ويستهلك ويخزّن النتيجة النهائية مرة وحدة.
 */
export async function confirmLicensingDecision(
  _prevState: LicensingFormState,
  formData: FormData
): Promise<LicensingFormState> {
  const userId = await requireUserId();

  const path = String(formData.get("path") ?? "") as LicensingPath | "";
  if (path !== "agency" && path !== "self") {
    return { error: "لازم تختار مسار ترخيص." };
  }

  const currentCapital = await getCurrentCapital(userId);

  if (path === "agency") {
    if (AGENCY_COST > currentCapital) {
      return {
        error: `التكلفة (${AGENCY_COST.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
      };
    }

    const result: LicensingResult = {
      confirmed: true,
      decidedAt: new Date().toISOString(),
      path: "agency",
      totalCost: AGENCY_COST,
      totalDays: AGENCY_DAYS,
    };

    await applyLicensingDecision(userId, {
      path: "agency",
      cost: AGENCY_COST,
      days: AGENCY_DAYS,
      result,
    });
    revalidatePath("/game");
    return null;
  }

  // path === "self"
  const wasReady = formData.get("ready") === "on";
  const events = rollSelfLicensingEvents();
  const totalCost = SELF_BASE_COST + events.reduce((sum, e) => sum + e.extraCost, 0);
  const totalDays =
    SELF_BASE_DAYS +
    (wasReady ? 0 : SELF_UNREADY_EXTRA_DAYS) +
    events.reduce((sum, e) => sum + e.extraDays, 0);

  if (totalCost > currentCapital) {
    return {
      error: `التكلفة الإجمالية (${totalCost.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
    };
  }

  const result: LicensingResult = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    path: "self",
    totalCost,
    totalDays,
    wasReady,
    events,
  };

  await applyLicensingDecision(userId, { path: "self", cost: totalCost, days: totalDays, result });
  revalidatePath("/game");
  return null;
}
