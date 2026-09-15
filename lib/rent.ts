/**
 * مرحلة "الإيجار" (المرحلة 5) — الجزء أ فقط. أربعة خيارات جاهزة
 * (منطقة+نوع مدموجين)، معروضة بنفس التصميم البصري بالضبط (فرق النص
 * والأرقام بس — التكلفة نفسها مو محايدة، معلنة وواضحة).
 */

export type RentId = "cheap-practical" | "cheap-empty" | "expensive-prime" | "expensive-full";
export type RentSpaceSize = "small" | "medium" | "large";

export const RENT_OPTIONS: {
  id: RentId;
  label: string;
  annualRent: number;
  hasFullServices: boolean;
  spaceSize: RentSpaceSize;
  primeLocation?: true;
}[] = [
  {
    id: "cheap-practical",
    label: "منطقة صناعية بعيدة، مكان رخيص وعملي",
    annualRent: 24000,
    hasFullServices: true,
    spaceSize: "medium",
  },
  {
    id: "cheap-empty",
    label: "منطقة صناعية بعيدة، مكان رخيص وفاضي",
    annualRent: 14000,
    hasFullServices: false,
    spaceSize: "medium",
  },
  {
    id: "expensive-prime",
    label: "قرب معلم سياحي، مكان غالي بموقع مميز",
    annualRent: 55000,
    hasFullServices: false,
    spaceSize: "small",
    primeLocation: true,
  },
  {
    id: "expensive-full",
    label: "قرب مركز التوزيع، مكان غالي وكامل الخدمات",
    annualRent: 70000,
    hasFullServices: true,
    spaceSize: "large",
  },
];

export function getRentOption(id: string) {
  return RENT_OPTIONS.find((o) => o.id === id);
}

export type MissingServiceKey = "offices" | "loadingDock" | "maintenance" | "utilities";

/** الخدمات الناقصة لخياري "الفاضي" — كل عنصر 1,500، إجمالي 6,000 إن ظهرت كلها. */
export const MISSING_SERVICES: { key: MissingServiceKey; label: string; cost: number }[] = [
  { key: "offices", label: "مكاتب", cost: 1500 },
  { key: "loadingDock", label: "منطقة تحميل/تنزيل + فوركليفت عند الحاجة", cost: 1500 },
  { key: "maintenance", label: "تنظيف وصيانة + فريق صيانة مباني", cost: 1500 },
  { key: "utilities", label: "سحب صرف صحي + فتح جدار/ديكور/مكيفات", cost: 1500 },
];

export const MISSING_SERVICES_TOTAL = MISSING_SERVICES.reduce((sum, s) => sum + s.cost, 0);

/** يرمي نرد كل خدمة ناقصة لحالها (50% لكل وحدة) — تُستخدم بس لو ما انضغط "تفاصيل" قبل التأكيد. */
export function rollMissingServiceSurprises(): { key: MissingServiceKey; label: string; cost: number }[] {
  return MISSING_SERVICES.filter(() => Math.random() < 0.5);
}

export type NegotiationResult = {
  used: true;
  success: boolean;
  discountPercent: number;
};

export type RentResult = {
  confirmed: true;
  decidedAt: string;
  rentId: RentId;
  spaceSize: RentSpaceSize;
  basePrice: number;
  viewedDetailsBeforeConfirm: boolean;
  negotiationUsed: boolean;
  negotiationSuccess?: boolean;
  discountPercent: number;
  finalPrice: number;
  paymentMethod: "cash" | "installments";
  amountPaidNow: number;
  monthlyAmount?: number;
  surpriseEvents?: { key: MissingServiceKey; label: string; cost: number }[];
  totalSurpriseCost: number;
};
