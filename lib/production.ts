import type { EquipmentType } from "@/lib/equipment";

/**
 * مرحلة "الإنتاج" (المرحلة 8) — بنية الدورة المتكررة: شراء مواد خام +
 * إنتاج تلقائي بعدها مباشرة. الجزء أ: بنية الدورة + طاقة الإنتاج.
 * الجزء ب: معادلة إنتاج حقيقية (سرعة مقابل دقة)، نوع خط المنتج، وتوزيع
 * التعبئة. لا أخطاء عشوائية ولا QC هون بعد (الجزء ج).
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
 * المحفوظين من مرحلة المعدات (6). ثابتة طول اللعبة بالجزء أ/ب (لا نمو
 * إنتاج ولا خطوط إضافية هون بعد).
 */
export function getProductionCapacity(equipmentType: EquipmentType, workerCount: number): number {
  if (equipmentType === "automatic") {
    return 60 + workerCount * 20;
  }
  return 25 + workerCount * 12;
}

export type ProcessingMode = "fast" | "precise";
export type Quality = "low" | "high";
export type ProductLineType = "single" | "diversified";

export const PROCESSING_MODE_QUALITY: Record<ProcessingMode, Quality> = {
  fast: "low",
  precise: "high",
};

/**
 * معادلة الإنتاج (الجزء ب) — تحل محل min(inventory, capacity) القديمة
 * بالكامل. productionCapacity هون سقف على عدد وحدات المنتج (مو المادة
 * الخام)، فكل وضع بيحسب أقصى مادة خام قابلة للاستخدام حسب نسبة تحويله
 * الخاصة قبل ما يقارنها بالمخزون الفعلي المتاح.
 */
export function computeProduction(
  rawMaterialAvailable: number,
  productionCapacity: number,
  processingMode: ProcessingMode
): { rawMaterialConsumed: number; producedUnits: number } {
  if (processingMode === "fast") {
    const maxRawUsable = Math.floor(productionCapacity / 2);
    const rawMaterialConsumed = Math.min(rawMaterialAvailable, maxRawUsable);
    return { rawMaterialConsumed, producedUnits: Math.floor(rawMaterialConsumed * 2) };
  }

  const maxRawUsable = productionCapacity * 2;
  const rawMaterialConsumed = Math.min(rawMaterialAvailable, maxRawUsable);
  return { rawMaterialConsumed, producedUnits: Math.floor(rawMaterialConsumed / 2) };
}

export type ProductionCycle = {
  cycleNumber: number;
  supplierChoice: SupplierChoice;
  purchaseQuantity: number;
  purchaseCost: number;
  producedUnits: number;
  processingMode: ProcessingMode;
  quality: Quality;
  rawMaterialConsumed: number;
  productLineType: ProductLineType;
  smallUnits: number;
  largeUnits: number;
};
