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
  MARKET_RESEARCH_CHANNELS,
  rollChannelOutcome,
  type ChannelOutcome,
  type MarketResearchChannelKey,
  type MarketResearchResults,
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
 * السوق قبل ما يأكّد توزيع الكريديت فعلياً.
 */
export async function advanceStage() {
  const userId = await requireUserId();
  const current = await getCurrentStage(userId);

  if (current === MARKET_RESEARCH_STAGE_ID) {
    const results = await getMarketResearchResults(userId);
    if (results?.confirmed !== true) {
      throw new Error("لازم تأكّد توزيع كريديت دراسة السوق قبل ما تكمّل.");
    }
  }

  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/**
 * إعادة البدء — يرجّع currentStage لـ1، وكمان يمسح تقدّم دراسة السوق
 * (الكريديت والنتائج) حتى تكون المرحلة جاهزة من الصفر بالجولة الجاية.
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
 * يتأكد إن التوزيع صالح (أرقام صحيحة غير سالبة، مجموعها ما يتخطى
 * الرصيد)، يحسب نتيجة كل قناة عشوائياً، ويخزّن النتائج مرة وحدة —
 * بعدها القراءة بس، ما تُعاد الحسبة.
 */
export async function confirmMarketResearchAllocation(
  _prevState: MarketResearchFormState,
  formData: FormData
): Promise<MarketResearchFormState> {
  const userId = await requireUserId();

  const amounts = {} as Record<MarketResearchChannelKey, number>;
  for (const { key } of MARKET_RESEARCH_CHANNELS) {
    const raw = formData.get(key);
    const amount = Number(raw);
    if (raw === null || raw === "" || !Number.isFinite(amount) || !Number.isInteger(amount) || amount < 0) {
      return { error: "كل المبالغ لازم تكون أرقام صحيحة وموجبة (أو صفر)." };
    }
    amounts[key] = amount;
  }

  const credit = await getMarketResearchCredit(userId);
  const total = Object.values(amounts).reduce((sum, n) => sum + n, 0);
  if (total > credit) {
    return { error: `مجموع التوزيع (${total}) أكبر من الرصيد المتاح (${credit}).` };
  }

  const outcomes = {} as Record<MarketResearchChannelKey, ChannelOutcome>;
  for (const { key } of MARKET_RESEARCH_CHANNELS) {
    outcomes[key] = rollChannelOutcome(key, amounts[key]);
  }

  const results: MarketResearchResults = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    outcomes,
  };

  await saveMarketResearchResults(userId, results);
  revalidatePath("/game");
  return null;
}
