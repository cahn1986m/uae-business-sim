import type { RentSpaceSize } from "@/lib/rent";

/**
 * مرحلة "المعدات" (المرحلة 6) — قرار أولي وحيد لنوع الخط وعدد العمال.
 * لا نمو إنتاج ولا خطوط إضافية لاحقاً هون (مؤجل لطبقة لاحقة).
 */

export type EquipmentType = "automatic" | "semi-automatic";

export const EQUIPMENT_OPTIONS: {
  type: EquipmentType;
  label: string;
  cost: number;
  spaceUsed: number;
  suggestedWorkers: number;
  allowsInstallments: boolean;
  setupDays: number;
}[] = [
  {
    type: "automatic",
    label: "خط أوتوماتيكي كامل",
    cost: 300000,
    spaceUsed: 10,
    suggestedWorkers: 6,
    allowsInstallments: true,
    setupDays: 10,
  },
  {
    type: "semi-automatic",
    label: "خط نصف أوتوماتيكي",
    cost: 100000,
    spaceUsed: 6,
    suggestedWorkers: 10,
    allowsInstallments: false,
    setupDays: 5,
  },
];

export function getEquipmentOption(type: string) {
  return EQUIPMENT_OPTIONS.find((o) => o.type === type);
}

/** ميزانية وحدات المساحة حسب rentSpaceSize (من مرحلة الإيجار). */
export const SPACE_BUDGET: Record<RentSpaceSize, number> = {
  small: 8,
  medium: 18,
  large: 30,
};

export const WORKER_MONTHLY_SALARY = 800;

/**
 * التزام شهري إلزامي — اشتراك حريق/دفاع مدني + صيانة (13,000 درهم
 * سنوياً: 6,500 اشتراك + 4,000 صيانة + 2,500 صيانة معدات، مقسومة على
 * 12). يُضاف تلقائياً مرة وحدة عند اكتمال مرحلة المعدات (أول لحظة
 * يصبح فيها المصنع "جاهزاً تشغيلياً") — لكل مصنع بغض النظر عن مسار
 * الترخيص، منفصل تماماً عن مفاجآت مسار الترخيص الذاتي العشوائية.
 */
export const FIRE_SAFETY_MONTHLY_AMOUNT = 1083;

export type EquipmentResult = {
  confirmed: true;
  decidedAt: string;
  equipmentType: EquipmentType;
  workerCount: number;
  equipmentSpaceUsed: number;
  cost: number;
  paymentMethod: "cash" | "installments";
  amountPaidNow: number;
  monthlyAmount?: number;
  workerMonthlyTotal: number;
};
