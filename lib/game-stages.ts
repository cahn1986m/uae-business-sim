/**
 * هيكل المراحل العشرة (القسم 3 من roadmap.md) — عناوين ووصف مختصر بس،
 * بدون أي منطق لعبة حقيقي بعد (لا خيارات، لا حسابات، لا عشوائية).
 * كل مرحلة رح تتوسّع بخطوة منفصلة لاحقاً.
 */
export type GameStage = {
  id: number;
  title: string;
  description: string;
};

export const TOTAL_STAGES = 10;

export const GAME_STAGES: GameStage[] = [
  {
    id: 1,
    title: "الفرصة",
    description:
      "وصلك إشعار بفرصة مشروع بقطاع العطور والمستحضرات التجميلية، ودعوة للسفر لاستكشافها.",
  },
  {
    id: 2,
    title: "دراسة السوق",
    description:
      "اجمع معلومات عن السوق قبل ما تقرر — بكريديت منفصل عن رأس المال الأساسي.",
  },
  {
    id: 3,
    title: "قرار التمويل",
    description:
      "اختر مصدر تمويل مشروعك: بنك اللعبة أو مستثمرين ملائكة، بمستويات مختلفة.",
  },
  {
    id: 4,
    title: "الترخيص",
    description:
      "رخّص شركتك — عبر شركة/وكيل تراخيص، أو بنفسك مباشرة.",
  },
  {
    id: 5,
    title: "المكان والإيجار",
    description:
      "اختر المنطقة والمكان يلي رح يكون فيه مصنعك.",
  },
  {
    id: 6,
    title: "المعدات",
    description:
      "جهّز خط الإنتاج — معدات أوتوماتيكية أو نصف أوتوماتيكية.",
  },
  {
    id: 7,
    title: "التوظيف",
    description:
      "وظّف كيميائي ومحاسب لإدارة عمليات مصنعك.",
  },
  {
    id: 8,
    title: "الإنتاج",
    description:
      "ابدأ إنتاج أول دفعة من منتجاتك.",
  },
  {
    id: 9,
    title: "البيع",
    description:
      "وزّع منتجاتك عبر قنوات البيع المختلفة: أسواق تخفيضات، تجار جملة، تجار صغار.",
  },
  {
    id: 10,
    title: "النتيجة",
    description:
      "نهاية الجولة — تقرير عن أداء بزنسك.",
  },
];

export function getStageById(id: number): GameStage {
  const clamped = Math.min(Math.max(id, 1), TOTAL_STAGES);
  return GAME_STAGES.find((s) => s.id === clamped) ?? GAME_STAGES[0];
}
