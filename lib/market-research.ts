/**
 * مرحلة "دراسة السوق" (المرحلة 2) تحديداً — أول منطق قرارات حقيقي
 * بالمشروع، بما فيه أول آلية عشوائية. مقصود إنه معزول بملفه الخاص ومو
 * جزء من هيكل المراحل العام (lib/game-stages.ts).
 */

/** الكريديت المخصص لهالمرحلة — منفصل تماماً عن أي رأس مال أساسي لاحق. */
export const MARKET_RESEARCH_TOTAL_CREDIT = 30000;

export type MarketResearchChannelKey = "network" | "feasibility" | "consultants";

/**
 * القنوات التلاتة — بنفس الترتيب دايماً. **العرض لازم يكون متطابق بصرياً
 * 100% بينها** (نفس التصميم بالضبط لكل قناة، بدون أي تلميح موثوقية) —
 * قاعدة من roadmap.md غير قابلة للتفاوض. هالملف نفسه ما بيحتوي أي
 * "ترتيب أفضلية" — بس الاسم لكل قناة.
 */
export const MARKET_RESEARCH_CHANNELS: { key: MarketResearchChannelKey; label: string }[] = [
  { key: "network", label: "شبكة علاقات وفنادق 5 نجوم" },
  { key: "feasibility", label: "دراسة جدوى رسمية" },
  { key: "consultants", label: "استشاريين من إعلانات" },
];

/**
 * احتمالات النجاح ونصوص النتائج لكل قناة — هاي المعلومة يلي اللاعب ما
 * بيشوفها قبل ما يقرر ويصرف (العرض قبل القرار محايد تماماً، هون بس
 * منطق الحساب بعد التأكيد).
 */
const OUTCOME_CONFIG: Record<
  MarketResearchChannelKey,
  { successRate: number; successMessage: string; failureMessage: string }
> = {
  network: {
    successRate: 0.7,
    successMessage: "السوق يبدو واعداً لمنتجك.",
    failureMessage: "ما طلعت معلومة ملموسة من هالقناة هالمرة.",
  },
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
  amountSpent: number;
  /** null = ما صُرف شي على هالقناة، فما في نتيجة (مو عشوائية بهالحالة). */
  success: boolean | null;
  message: string;
};

export type MarketResearchResults = {
  confirmed: true;
  decidedAt: string;
  outcomes: Record<MarketResearchChannelKey, ChannelOutcome>;
};

/**
 * يحسب نتيجة قناة وحدة بناءً على المبلغ المصروف عليها. لو المبلغ صفر،
 * ما في رمية نرد أصلاً — منطقي، صرف صفر ما بيرجّع معلومة.
 */
export function rollChannelOutcome(
  key: MarketResearchChannelKey,
  amountSpent: number
): ChannelOutcome {
  if (amountSpent <= 0) {
    return { amountSpent: 0, success: null, message: "ما صرفت شي على هالقناة." };
  }

  const config = OUTCOME_CONFIG[key];
  const success = Math.random() < config.successRate;

  return {
    amountSpent,
    success,
    message: success ? config.successMessage : config.failureMessage,
  };
}
