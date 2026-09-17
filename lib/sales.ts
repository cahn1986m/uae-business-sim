import type { ProductionCycle } from "@/lib/production";
import type { HotelTier } from "@/lib/market-research";

/**
 * مرحلة "البيع" (المرحلة 9). الجزء أ: بيع يدوي متكرر بثلاث قنوات.
 * الجزء ب: مصادر الزبائن — أثر الموقع (تلقائي مرة وحدة)، موظف مبيعات
 * (قرار توظيف مرة وحدة + عمولة مستمرة)، إعلانات (حملة متكررة). الجزء ج
 * (تسهيلات تجار الجملة) لسا ما اتبنى.
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
 * salesTransactions (بدون أي حقل "availableUnits" مخزَّن مباشرة، تفادياً
 * لتعارض تزامن). bonusSmallUnits/bonusLargeUnits استثناء مقصود: أرصدة
 * "افتراضية" ما إلها مصدر بالإنتاج الحقيقي (أثر الموقع/موظف المبيعات/
 * الإعلانات) — ما فيه طريقة تشتق قيمتها من productionCycles، فلازم
 * تنخزن كحقلين تراكميين منفصلين، وتُضاف هون فوق المجموع المحسوب.
 */
export function getAvailableUnits(
  cycles: ProductionCycle[],
  transactions: SalesTransaction[],
  bonusSmallUnits = 0,
  bonusLargeUnits = 0
): { availableSmallUnits: number; availableLargeUnits: number } {
  const totalSmall = cycles.reduce((sum, c) => sum + c.smallUnits, 0) + bonusSmallUnits;
  const totalLarge = cycles.reduce((sum, c) => sum + c.largeUnits, 0) + bonusLargeUnits;

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

// ---------------------------------------------------------------------------
// أثر الموقع — تلقائي، مرة وحدة بس عند أول دخول للمرحلة 9.
// ---------------------------------------------------------------------------

export type LocationBonusEventType = "prime-location" | "hotel-5star" | "hotel-2star";

export type LocationBonusResult = {
  type: LocationBonusEventType;
  success: boolean;
  message: string;
};

export const PRIME_LOCATION_BONUS_SMALL_UNITS = 40;
export const HOTEL_5STAR_BONUS_LARGE_UNITS = 60;
export const HOTEL_2STAR_SUCCESS_RATE = 0.5;
export const HOTEL_2STAR_BONUS_LARGE_UNITS = 25;
export const HOTEL_2STAR_FAILURE_COST = 1500;

/**
 * أربعة تأثيرات مستقلة عن بعضها (ممكن يتحقق أكتر من واحد معاً حسب
 * الأعلام الفعلية): موقع مميز (نجاح/فشل حسب تنويع السلة)، فندق 5
 * نجوم (بونص مضمون)، فندق نجمتين (50% نجاح/فشل عشوائي). بترجع دلتا
 * صافية لكل حقل — التطبيق الفعلي بقاعدة البيانات بضربة UPDATE وحدة.
 */
export function computeLocationBonus(
  primeLocation: boolean,
  cycles: ProductionCycle[],
  hotelConnection: HotelTier[]
): {
  results: LocationBonusResult[];
  bonusSmallDelta: number;
  bonusLargeDelta: number;
  capitalDelta: number;
} {
  const results: LocationBonusResult[] = [];
  let bonusSmallDelta = 0;
  let bonusLargeDelta = 0;
  let capitalDelta = 0;

  if (primeLocation) {
    if (isBoutiqueTraderUnlocked(cycles)) {
      bonusSmallDelta += PRIME_LOCATION_BONUS_SMALL_UNITS;
      results.push({
        type: "prime-location",
        success: true,
        message: "موقعك المميز جابلك زبائن إضافيين لأنك طوّرت منتجاتك.",
      });
    } else {
      results.push({
        type: "prime-location",
        success: false,
        message: "فاتتك فرصة موقعك المميز — ما طوّرت منتجاتك لتناسب الطلبات.",
      });
    }
  }

  if (hotelConnection.includes("5star")) {
    bonusLargeDelta += HOTEL_5STAR_BONUS_LARGE_UNITS;
    results.push({
      type: "hotel-5star",
      success: true,
      message: "صديقك من الفندق جابلك صفقة مضمونة.",
    });
  }

  if (hotelConnection.includes("2star")) {
    const success = Math.random() < HOTEL_2STAR_SUCCESS_RATE;
    if (success) {
      bonusLargeDelta += HOTEL_2STAR_BONUS_LARGE_UNITS;
      results.push({ type: "hotel-2star", success: true, message: "لقيت زبون رخيص من هناك." });
    } else {
      capitalDelta -= HOTEL_2STAR_FAILURE_COST;
      results.push({
        type: "hotel-2star",
        success: false,
        message: "الشخص يلي قابلته طلع نصاب، خسرت دفعة مقدمة.",
      });
    }
  }

  return { results, bonusSmallDelta, bonusLargeDelta, capitalDelta };
}

// ---------------------------------------------------------------------------
// موظف المبيعات — توظيف مرة وحدة + عمولة مستمرة.
// ---------------------------------------------------------------------------

export const SALES_EMPLOYEE_COMMISSION_RATE = 0.08;
export const SALES_EMPLOYEE_BONUS_LARGE_UNITS = 30;
export const SALES_EMPLOYEE_BONUS_SMALL_UNITS = 15;

/** يحسب totalRevenue النهائي (بعد خصم عمولة الموظف إن كان موظّف) من الإيراد الخام. */
export function applyCommission(grossRevenue: number, salesEmployeeHired: boolean): number {
  return salesEmployeeHired
    ? Math.round(grossRevenue * (1 - SALES_EMPLOYEE_COMMISSION_RATE))
    : grossRevenue;
}

// ---------------------------------------------------------------------------
// إعلانات — حملة متكررة، توجيه احتمالي نحو قناة واحدة لكل حملة.
// ---------------------------------------------------------------------------

export type AdTarget = "premium" | "wholesale" | "discount";

export const AD_TARGET_LABELS: Record<AdTarget, string> = {
  premium: "نحو تجار صغار",
  wholesale: "نحو التجار",
  discount: "نحو تخفيضات",
};

/** نسب توزيع الفوز بين القنوات الثلاث — لكل هدف توجيه. */
export const AD_TARGET_WEIGHTS: Record<AdTarget, { boutique: number; wholesale: number; discount: number }> = {
  premium: { boutique: 0.5, wholesale: 0.3, discount: 0.2 },
  wholesale: { boutique: 0.05, wholesale: 0.6, discount: 0.35 },
  discount: { boutique: 0, wholesale: 0.1, discount: 0.9 },
};

export const AD_BUDGET_MINIMUM = 500;
export const AD_BUDGET_UNIT_DIVISOR = 50;

export type AdCampaign = {
  campaignNumber: number;
  budget: number;
  target: AdTarget;
  bonusUnits: number;
  wonChannel: SalesChannel;
};

export function getAdCampaignBonusUnits(budget: number): number {
  return Math.floor(budget / AD_BUDGET_UNIT_DIVISOR);
}

/** يسحب قناة الفوز الواحدة لهالحملة عشوائياً حسب نسب الهدف المختار. */
export function rollAdCampaignChannel(target: AdTarget): SalesChannel {
  const weights = AD_TARGET_WEIGHTS[target];
  const roll = Math.random();
  if (roll < weights.boutique) return "boutique-trader";
  if (roll < weights.boutique + weights.wholesale) return "wholesaler";
  return "discount-market";
}
