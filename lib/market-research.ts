/**
 * مرحلة "دراسة السوق" (المرحلة 2) تحديداً — أول منطق قرارات حقيقي
 * بالمشروع، بما فيه أول آلية عشوائية. مقصود إنه معزول بملفه الخاص ومو
 * جزء من هيكل المراحل العام (lib/game-stages.ts).
 *
 * **تحديث جوهري (نفس الخطوة، قبل ما تُرفع):** استبدلنا آلية "توزيع
 * مبلغ حر على 3 قنوات" بقائمة خدمات بسعر ثابت (4 عناصر) — checkbox
 * لكل واحدة، مو نص حر. شوف progress.md لتفاصيل الانحراف عن الوصف
 * الأصلي بـroadmap.md.
 */

/**
 * الحد الأقصى للصرف بهالمرحلة — منفصل تماماً عن أي رأس مال أساسي لاحق.
 * عمداً أقل من مجموع الأربعة خدمات كلهم مع بعض (19,500) — اللاعب مضطر
 * فعلياً يضحّي ويختار جزء بس، ما يقدر يشتري كل شي.
 */
export const MARKET_RESEARCH_TOTAL_CREDIT = 15000;

export type MarketResearchServiceKey =
  | "feasibility"
  | "consultants"
  | "hotel5star"
  | "hotel2star";

/**
 * الأربعة خدمات — بنفس الترتيب دايماً. **العرض لازم يكون متطابق بصرياً
 * 100% بينها** (نفس التصميم بالضبط لكل واحدة، بدون أي تلميح موثوقية) —
 * قاعدة من roadmap.md غير قابلة للتفاوض، تنطبق هون كمان.
 */
export const MARKET_RESEARCH_SERVICES: {
  key: MarketResearchServiceKey;
  label: string;
  price: number;
}[] = [
  { key: "feasibility", label: "دراسة جدوى رسمية", price: 10000 },
  { key: "consultants", label: "استشاريين من إعلانات", price: 2000 },
  { key: "hotel5star", label: "فندق 5 نجوم (شبكة علاقات راقية)", price: 5000 },
  { key: "hotel2star", label: "فندق نجمتين (اختلاط بالعاملين)", price: 2500 },
];

/** الخدمتين يلي بترجعوا نتيجة فورية بعد الشراء (النتائج عشوائية). */
type RolledServiceKey = "feasibility" | "consultants";

const OUTCOME_CONFIG: Record<
  RolledServiceKey,
  { successRate: number; successMessage: string; failureMessage: string }
> = {
  feasibility: {
    successRate: 0.9,
    successMessage: "دراسة الجدوى رجعت معلومات مفصّلة ومشجّعة عن السوق.",
    failureMessage: "دراسة الجدوى رجعت بس نتيجة عامة، بدون تفاصيل تُذكر.",
  },
  consultants: {
    successRate: 0.4,
    successMessage: "لقيت استشاري فعلاً عطاك معلومة مفيدة.",
    failureMessage: "لم يرد عليك أحد بعد الدفع.",
  },
};

export type ChannelOutcome = {
  success: boolean;
  message: string;
};

/** فنادق الشبكة — تُخزّن كعلم فقط، بدون نتيجة ظاهرة، لمرحلة "البيع" لاحقاً. */
export type HotelTier = "5star" | "2star";

export type MarketResearchResults = {
  confirmed: true;
  decidedAt: string;
  /** كل الخدمات يلي اللاعب اشتراها بهالتأكيد (حتى الفنادق بدون نتيجة ظاهرة). */
  purchased: MarketResearchServiceKey[];
  /** نتائج فورية — موجودة بس للخدمات المشتراة يلي عندها نتيجة (دراسة الجدوى/الاستشاريين). */
  outcomes: Partial<Record<RolledServiceKey, ChannelOutcome>>;
  /** أعلام شبكة الفنادق — تُستخدم لاحقاً بمرحلة البيع، غير موجودة لو ما اشترى فندق. */
  hotelConnection?: HotelTier[];
};

/** يحسب نتيجة عشوائية لخدمة دراسة الجدوى أو الاستشاريين. */
export function rollServiceOutcome(key: RolledServiceKey): ChannelOutcome {
  const config = OUTCOME_CONFIG[key];
  const success = Math.random() < config.successRate;
  return {
    success,
    message: success ? config.successMessage : config.failureMessage,
  };
}
