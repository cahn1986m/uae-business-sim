import type { ProductionCycle } from "@/lib/production";

/**
 * مرحلة "البيع" (المرحلة 9) — الجزء أ فقط: بيع يدوي متكرر بكمية يختارها
 * اللاعب، بدون مصادر زبائن (الجزء ب) أو تسهيلات تجار الجملة (الجزء ج).
 */

export type SalesChannel = "discount-market" | "wholesaler" | "boutique-trader";

export const CHANNEL_LABELS: Record<SalesChannel, string> = {
  "discount-market": "أسواق تخفيضات",
  wholesaler: "تجار جملة",
  "boutique-trader": "تجار صغار",
};

/** هامش الربح فوق تكلفة الوحدة الفعلية — لكل قناة. */
export const CHANNEL_MARGIN: Record<SalesChannel, number> = {
  "discount-market": 0.15,
  wholesaler: 0.25,
  "boutique-trader": 0.6,
};

/** القنوات التنين "أسواق تخفيضات"/"تجار جملة" تسحب من availableLargeUnits، و"تجار صغار" من availableSmallUnits. */
export const LARGE_UNIT_CHANNELS: SalesChannel[] = ["discount-market", "wholesaler"];

export type SalesTransaction = {
  transactionNumber: number;
  channel: SalesChannel;
  unitsSold: number;
  revenuePerUnit: number;
  totalRevenue: number;
};

/**
 * تكلفة الوحدة الفعلية — إجمالي purchaseCost لكل دورات الإنتاج مقسوم
 * على إجمالي finalProducedUnits لكلهم. رقم ثابت يُحسب مرة وحدة عند
 * أول عملية بيع (يُخزَّن بـsaleUnitCost بعدها)، مو معاد حسابه كل دورة.
 */
export function computeUnitCost(cycles: ProductionCycle[]): number {
  const totalCost = cycles.reduce((sum, c) => sum + c.purchaseCost, 0);
  const totalUnits = cycles.reduce((sum, c) => sum + c.finalProducedUnits, 0);
  return totalUnits > 0 ? totalCost / totalUnits : 0;
}

export function getRevenuePerUnit(unitCost: number, channel: SalesChannel): number {
  return Math.round(unitCost * (1 + CHANNEL_MARGIN[channel]));
}

/**
 * المخزون المتاح للبيع — يُحسب ديناميكياً دايماً من productionCycles +
 * salesTransactions (مجموع smallUnits/largeUnits لكل الدورات، مطروحاً
 * منه ما انباع فعلياً لحد الآن حسب القناة) — بدون أي حقل مخزَّن منفصل،
 * لتفادي تعارض تزامن بين المصدرين.
 */
export function getAvailableUnits(
  cycles: ProductionCycle[],
  transactions: SalesTransaction[]
): { availableSmallUnits: number; availableLargeUnits: number } {
  const totalSmall = cycles.reduce((sum, c) => sum + c.smallUnits, 0);
  const totalLarge = cycles.reduce((sum, c) => sum + c.largeUnits, 0);

  const soldSmall = transactions
    .filter((t) => t.channel === "boutique-trader")
    .reduce((sum, t) => sum + t.unitsSold, 0);
  const soldLarge = transactions
    .filter((t) => LARGE_UNIT_CHANNELS.includes(t.channel))
    .reduce((sum, t) => sum + t.unitsSold, 0);

  return {
    availableSmallUnits: totalSmall - soldSmall,
    availableLargeUnits: totalLarge - soldLarge,
  };
}

/** قناة "تجار صغار" مقفولة إلا لو دورة إنتاج واحدة على الأقل كانت productLineType="diversified". */
export function isBoutiqueTraderUnlocked(cycles: ProductionCycle[]): boolean {
  return cycles.some((c) => c.productLineType === "diversified");
}
