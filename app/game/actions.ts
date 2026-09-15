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
} from "@/lib/db";
import { TOTAL_STAGES } from "@/lib/game-stages";
import {
  MARKET_RESEARCH_SERVICES,
  rollServiceOutcome,
  type HotelTier,
  type MarketResearchResults,
  type MarketResearchServiceKey,
} from "@/lib/market-research";

const MARKET_RESEARCH_STAGE_ID = 2;

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

  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/**
 * إعادة البدء — يرجّع currentStage لـ1، وكمان يمسح تقدّم دراسة السوق
 * (الحد الأقصى والنتائج) حتى تكون المرحلة جاهزة من الصفر بالجولة الجاية.
 * للتجربة أثناء البناء فقط.
 */
export async function restartGame() {
  const userId = await requireUserId();
  await setCurrentStage(userId, 1);
  await resetMarketResearch(userId);
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
