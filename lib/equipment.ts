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
}[] = [
  {
    type: "automatic",
    label: "خط أوتوماتيكي كامل",
    cost: 80000,
    spaceUsed: 10,
    suggestedWorkers: 2,
    allowsInstallments: true,
  },
  {
    type: "semi-automatic",
    label: "خط نصف أوتوماتيكي",
    cost: 35000,
    spaceUsed: 6,
    suggestedWorkers: 5,
    allowsInstallments: false,
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
