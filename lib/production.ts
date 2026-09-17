import type { EquipmentType } from "@/lib/equipment";
import type { ExperienceLevel } from "@/lib/hiring";

/**
 * مرحلة "الإنتاج" (المرحلة 8) — بنية الدورة المتكررة: شراء مواد خام +
 * إنتاج تلقائي بعدها مباشرة. الجزء أ: بنية الدورة + طاقة الإنتاج.
 * الجزء ب: معادلة إنتاج حقيقية (سرعة مقابل دقة)، نوع خط المنتج، وتوزيع
 * التعبئة. الجزء ج (الأخير): هدر طبيعي ثابت + خطأ الكيميائي العشوائي +
 * QC اختياري — بهذا تكتمل مرحلة الإنتاج بأجزائها الثلاثة.
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

/**
 * هدر طبيعي ثابت — يُطبَّق دايماً بدون استثناء (بواقي/تبخر/معايرة)،
 * منفصل تماماً عن خطأ الكيميائي العشوائي.
 */
export const NATURAL_WASTE_RATE = 0.03;

export function applyNaturalWaste(producedUnits: number): number {
  return Math.floor(producedUnits * (1 - NATURAL_WASTE_RATE));
}

export type ChemistTier = "none" | "junior" | "senior";

/**
 * جدول احتمال/نسبة خطأ الكيميائي — الاحتمال يتناسب عكسياً مع الخبرة
 * (ما بيوصل صفر أبداً حتى مع سينيور، حسب roadmap.md). "none" تمثّل
 * عدم توظيف كيميائي إطلاقاً — أعلى احتمال وأعلى هدر عند الحدوث.
 */
export const CHEMIST_ERROR_CONFIG: Record<ChemistTier, { errorChance: number; wastePercent: number }> = {
  none: { errorChance: 0.35, wastePercent: 0.2 },
  junior: { errorChance: 0.2, wastePercent: 0.15 },
  senior: { errorChance: 0.08, wastePercent: 0.08 },
};

export function getChemistTier(chemistHired: boolean, chemistExperience: ExperienceLevel): ChemistTier {
  if (!chemistHired) return "none";
  return chemistExperience === "senior" ? "senior" : "junior";
}

export function rollChemistError(tier: ChemistTier): boolean {
  return Math.random() < CHEMIST_ERROR_CONFIG[tier].errorChance;
}

export function applyChemistErrorWaste(afterNaturalWaste: number, tier: ChemistTier): number {
  return Math.floor(afterNaturalWaste * (1 - CHEMIST_ERROR_CONFIG[tier].wastePercent));
}

/** تكلفة فحص الجودة (QC) الثابتة لكل دورة — اختياري، يُخصم فوراً عند التأكيد إن كان مفعّلاً. */
export const QC_COST = 300;

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
  chemistErrorOccurred: boolean;
  qcPurchased: boolean;
  finalProducedUnits: number;
};
