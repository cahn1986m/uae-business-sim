import type { EquipmentType } from "@/lib/equipment";

/**
 * مرحلة "الإنتاج" (المرحلة 8، الجزء أ فقط) — بنية الدورة المتكررة:
 * شراء مواد خام + إنتاج تلقائي بعدها مباشرة. لا معادلة كمية/جودة، لا
 * تنويع، لا تعبئة، لا أخطاء عشوائية، لا QC هون (كل هدول أجزاء لاحقة).
 */

export type SupplierChoice = "cheap" | "trusted";

export const SUPPLIER_PRICE_PER_UNIT: Record<SupplierChoice, number> = {
  cheap: 12,
  trusted: 20,
};

export const BULK_DISCOUNT_CAPACITY_MULTIPLIER = 1.2;
export const BULK_DISCOUNT_PERCENT = 15;

/**
 * طاقة الإنتاج لكل دورة — دالة بس بـequipmentType/workerCount
 * المحفوظين من مرحلة المعدات (7). ثابتة طول اللعبة بالجزء أ (لا نمو
 * إنتاج ولا خطوط إضافية هون بعد).
 */
export function getProductionCapacity(equipmentType: EquipmentType, workerCount: number): number {
  if (equipmentType === "automatic") {
    return 60 + workerCount * 20;
  }
  return 25 + workerCount * 12;
}

export type ProductionCycle = {
  cycleNumber: number;
  supplierChoice: SupplierChoice;
  purchaseQuantity: number;
  purchaseCost: number;
  producedUnits: number;
};
