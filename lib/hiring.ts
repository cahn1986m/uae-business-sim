/**
 * مرحلة "التوظيف" (المرحلة 7) — قرار توظيف وحيد لكل من الكيميائي
 * والمحاسب (دوران مستقلان عن بعض). لا نظام أخطاء عشوائية هون —
 * بس تخزين experienceLevel جاهز لمرحلة الإنتاج لاحقاً.
 */

export type Role = "chemist" | "accountant";
export type ExperienceLevel = "junior" | "senior" | null;
export type HiringChoice = "junior" | "senior" | "none";

export type HiringCandidate = {
  choice: HiringChoice;
  label: string;
  monthlySalary: number;
  bio: string;
};

/**
 * الثلاثة خيارات لكل دور (جونيور/سينيور/لا توظف) — بنفس البنية
 * بالضبط حتى تُعرض متطابقة بصرياً 100% (حتى "لا توظف" عنده نفس شكل
 * البطاقة وزر "تفاصيل").
 */
export const HIRING_ROLES: {
  role: Role;
  roleLabel: string;
  candidates: HiringCandidate[];
}[] = [
  {
    role: "chemist",
    roleLabel: "كيميائي/فورميوليتور",
    candidates: [
      {
        choice: "junior",
        label: "مرشح جونيور",
        monthlySalary: 2500,
        bio: "متخرج حديثاً من كلية الكيمياء، اشتغل سنة بمختبر تجميل صغير — حماسي ومتابع، بس لسا بيتعلم دقة القياسات.",
      },
      {
        choice: "senior",
        label: "مرشح سينيور",
        monthlySalary: 10000,
        bio: "خبرة 12 سنة بتصنيع العطور والمستحضرات، اشتغل سابقاً بمصنع إقليمي معروف — دقيق جداً وبيعرف يعالج مشاكل التركيبة بسرعة.",
      },
      {
        choice: "none",
        label: "لا توظف",
        monthlySalary: 0,
        bio: "بدون توظيف كيميائي حالياً — توفير بالراتب الشهري، مقابل مخاطرة أكبر بجودة الإنتاج لاحقاً.",
      },
    ],
  },
  {
    role: "accountant",
    roleLabel: "محاسب",
    candidates: [
      {
        choice: "junior",
        label: "مرشح جونيور",
        monthlySalary: 2500,
        bio: "حديث التخرج بمحاسبة، شغل شهرين متدرب بمكتب محاسبة — منظم بس بيحتاج مراجعة على فواتيره لأول فترة.",
      },
      {
        choice: "senior",
        label: "مرشح سينيور",
        monthlySalary: 10000,
        bio: "خبرة 10 سنين بمحاسبة شركات تصنيع صغيرة ومتوسطة، متعوّد على التحصيل والفواتير المعقدة — نادراً ما يفوته شي.",
      },
      {
        choice: "none",
        label: "لا توظف",
        monthlySalary: 0,
        bio: "بدون توظيف محاسب حالياً — توفير بالراتب الشهري، مقابل مخاطرة أكبر بدقة الحسابات والتحصيل لاحقاً.",
      },
    ],
  },
];

export function getHiringRole(role: string) {
  return HIRING_ROLES.find((r) => r.role === role);
}

export type HiringDecision = {
  chemistHired: boolean;
  chemistExperience: ExperienceLevel;
  accountantHired: boolean;
  accountantExperience: ExperienceLevel;
};

/**
 * تكلفة إقامة كل موظف (سنتين) — تُخصم فوراً عند التأكيد، فوق الالتزام
 * الشهري للراتب. غير مستردة إطلاقاً حتى لو استقال الموظف مبكراً.
 */
export const VISA_COST = 5500;

/**
 * نافذة تغطية الإقامة بمقياس daysConsumed (محاكاة، مو وقت حقيقي) —
 * 730 يوم من visaStartedAt (قيمة daysConsumed وقت التأكيد، مو تاريخ
 * حقيقي). بعدها ما في فحص استقالة إطلاقاً لنفس الموظف.
 */
export const VISA_COVERAGE_DAYS = 730;

/**
 * احتمال استقالة مبكرة لكل استدعاء لـconsumeGameDays (مو لكل يوم) —
 * افتراض معقول، قابل للتعديل لاحقاً لو تبيّن رقم أنسب بالتجربة.
 */
export const EARLY_RESIGNATION_CHANCE = 0.03;
