/**
 * مرحلة "قرار التمويل" (المرحلة 3) — أول مرحلة تُنشئ رأس المال
 * الأساسي الفعلي للعبة (`startingCapital`)، منفصل تماماً عن
 * marketResearchCredit يلي انتهى دوره بالمرحلة السابقة.
 */

export type FinancingTierKey = "limited" | "medium" | "comfortable";

/**
 * الثلاث مستويات — بنفس الترتيب دايماً. **العرض لازم يكون متطابق
 * بصرياً 100% بينها** (نفس التصميم بالضبط لكل مستوى، بدون أي تلميح
 * لأفضلية أي وحدة) — نفس قاعدة roadmap.md المحايدة، تنطبق هون كمان.
 */
export const FINANCING_TIERS: {
  key: FinancingTierKey;
  label: string;
  min: number;
  max: number;
  deadlineDays: number;
  investorEquityPercent: number;
}[] = [
  {
    key: "limited",
    label: "رأس مال محدود (بنك)",
    min: 80000,
    max: 120000,
    deadlineDays: 60,
    investorEquityPercent: 0,
  },
  {
    key: "medium",
    label: "رأس مال متوسط (بنك+ملائكة)",
    min: 200000,
    max: 300000,
    deadlineDays: 40,
    investorEquityPercent: 10,
  },
  {
    key: "comfortable",
    label: "رأس مال مريح (ملائكة)",
    min: 400000,
    max: 600000,
    deadlineDays: 25,
    investorEquityPercent: 25,
  },
];

export function getFinancingTier(key: string) {
  return FINANCING_TIERS.find((t) => t.key === key);
}

/**
 * الأربعة حقول يلي بيطلبها roadmap.md تُخزّن مباشرة (flat) بعمود data
 * بـgame_state — مو متداخلة بكائن واحد — بنفس نمط currentStage
 * وmarketResearchCredit الموجودين أصلاً.
 */
export type FinancingDecision = {
  startingCapital: number;
  investorEquityPercent: number;
  financingStartedAt: string;
  financingDeadlineDays: number;
};

/**
 * رسائل ضغط المستثمر عند تجاوز المهلة (daysConsumed > financingDeadlineDays)
 * — عرض واجهة فقط، بدون أي اعتراض فعلي على قرارات اللاعب (حسب roadmap.md).
 * اللهجة تتصاعد حسب investorEquityPercent المخزّن فعلياً من هالمرحلة.
 */
export const INVESTOR_PRESSURE_MESSAGES: Record<number, string> = {
  0: "تجاوزت المهلة المتوقعة — البنك يتابع الوضع",
  10: "تجاوزت المهلة — المستثمرون بدأوا يسألون عن التأخير",
  25: "تجاوزت المهلة بشكل خطير — ضغط حقيقي من المستثمرين، قد يتدخلوا قريباً",
};
