"use client";

import { useState } from "react";
import { useActionState } from "react";
import { confirmProductionPurchase, type ProductionFormState } from "./actions";
import DramaticAlert from "./DramaticAlert";
import {
  SUPPLIER_PRICE_PER_UNIT,
  BULK_DISCOUNT_CAPACITY_MULTIPLIER,
  BULK_DISCOUNT_PERCENT,
  QC_COST,
  type ProductionCycle,
  type SupplierChoice,
  type ProcessingMode,
  type ProductLineType,
} from "@/lib/production";
import { t, type Language } from "@/lib/i18n";

type CycleProps = {
  capacity: number;
  rawMaterialInventory: number;
  cycles: ProductionCycle[];
  language: Language;
};

/**
 * واجهة مرحلة "الإنتاج" — دورة متكررة: شراء مواد خام + اختيار وضع
 * المعالجة ونوع خط المنتج ونسب التعبئة، ثم إنتاج تلقائي فوراً بعدها.
 * زر "الانتقال لمرحلة البيع" هو نفسه زر "التالي" العام (يظهر تلقائياً
 * من page.tsx بمجرد وجود دورة واحدة مكتملة). "دورة إنتاج جديدة"
 * بترمونت النموذج الداخلي من جديد (مفتاح جديد) بدل استخدام useEffect
 * لمزامنة حالة مشتقة من نتيجة الـServer Action.
 */
export default function ProductionStage(props: CycleProps) {
  const [formKey, setFormKey] = useState(0);

  return (
    <ProductionCycleForm
      key={formKey}
      {...props}
      onStartNewCycle={() => setFormKey((k) => k + 1)}
    />
  );
}

function ProductionCycleForm({
  capacity,
  rawMaterialInventory,
  cycles,
  language,
  onStartNewCycle,
}: CycleProps & { onStartNewCycle: () => void }) {
  const [state, formAction, isPending] = useActionState<ProductionFormState, FormData>(
    confirmProductionPurchase,
    null
  );

  const [supplierChoice, setSupplierChoice] = useState<SupplierChoice | "">("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");
  const [processingMode, setProcessingMode] = useState<ProcessingMode | "">("");
  const [productLineType, setProductLineType] = useState<ProductLineType | "">("");
  const [smallPercent, setSmallPercent] = useState("");
  const [largePercent, setLargePercent] = useState("");
  const [qcPurchased, setQcPurchased] = useState(false);

  if (state && "producedUnits" in state) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm font-medium">
            {t("production.finalProducedLine", language, { units: state.finalProducedUnits.toLocaleString("ar") })}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("production.beforeWasteLine", language, { units: state.producedUnits.toLocaleString("ar") })}
          </p>
          <p className="mt-1 text-xs text-zinc-500">
            {t("production.qualityLine", language, {
              quality: t(`production.quality.${state.quality}`, language),
              small: state.smallUnits.toLocaleString("ar"),
              large: state.largeUnits.toLocaleString("ar"),
            })}
          </p>
          {state.qcReportCode &&
            (() => {
              const qcText = t(
                state.qcReportCode,
                language,
                state.qcWastePercent !== null ? { percent: state.qcWastePercent } : undefined
              );
              return state.chemistErrorOccurred ? (
                <div className="mt-1">
                  <DramaticAlert language={language}>
                    <p className="text-xs">{qcText}</p>
                  </DramaticAlert>
                </div>
              ) : (
                <p className="mt-1 text-xs text-emerald-600 dark:text-emerald-400">{qcText}</p>
              );
            })()}
          <p className="mt-1 text-xs text-zinc-500">
            {t("production.cycleInventoryLine", language, {
              number: cycles.length,
              inventory: rawMaterialInventory.toLocaleString("ar"),
            })}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewCycle}
          className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          {t("production.newCycleButton", language)}
        </button>
      </div>
    );
  }

  const parsedQuantity = Number(purchaseQuantity) || 0;
  const unitPrice = supplierChoice ? SUPPLIER_PRICE_PER_UNIT[supplierChoice] : 0;
  const bulkEligible =
    supplierChoice !== "" && parsedQuantity + rawMaterialInventory >= BULK_DISCOUNT_CAPACITY_MULTIPLIER * capacity;
  const previewCost = supplierChoice
    ? Math.round(parsedQuantity * unitPrice * (bulkEligible ? 1 - BULK_DISCOUNT_PERCENT / 100 : 1))
    : 0;

  const percentSum = (Number(smallPercent) || 0) + (Number(largePercent) || 0);
  const percentsValid = smallPercent !== "" && largePercent !== "" && percentSum === 100;

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <p className="text-sm">{t("production.capacityLine", language, { capacity: capacity.toLocaleString("ar") })}</p>
        <p className="mt-1 text-sm">
          {t("production.inventoryLine", language, { inventory: rawMaterialInventory.toLocaleString("ar") })}
        </p>
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("production.purchaseTitle", language)}</p>
        {(["cheap", "trusted"] as SupplierChoice[]).map((choice) => (
          <label
            key={choice}
            htmlFor={`supplier_${choice}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{t(`production.supplier.${choice}`, language)}</span>
              <input
                id={`supplier_${choice}`}
                name="supplierChoice"
                value={choice}
                type="radio"
                checked={supplierChoice === choice}
                onChange={() => setSupplierChoice(choice)}
                className="h-4 w-4"
              />
            </span>
            <span className="text-xs text-zinc-500">
              {t("production.unitPriceLine", language, { price: SUPPLIER_PRICE_PER_UNIT[choice].toLocaleString("ar") })}
            </span>
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="purchaseQuantity" className="mb-2 block text-sm font-medium">
          {t("production.quantityLabel", language)}
        </label>
        <input
          id="purchaseQuantity"
          name="purchaseQuantity"
          type="number"
          step={1}
          inputMode="numeric"
          value={purchaseQuantity}
          onChange={(e) => setPurchaseQuantity(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {supplierChoice && (
        <p className="text-xs text-zinc-500">
          {t("production.estimatedCost", language, { cost: previewCost.toLocaleString("ar") })}
          {bulkEligible && t("production.bulkDiscountSuffix", language, { percent: BULK_DISCOUNT_PERCENT })}
        </p>
      )}

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("production.modeTitle", language)}</p>
        {(["fast", "precise"] as ProcessingMode[]).map((mode) => (
          <label
            key={mode}
            htmlFor={`processing_${mode}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{t(`production.mode.${mode}`, language)}</span>
              <input
                id={`processing_${mode}`}
                name="processingMode"
                value={mode}
                type="radio"
                checked={processingMode === mode}
                onChange={() => setProcessingMode(mode)}
                className="h-4 w-4"
              />
            </span>
            <span className="text-xs text-zinc-500">{t(`production.modeHint.${mode}`, language)}</span>
          </label>
        ))}
      </div>

      <div className="space-y-3">
        <p className="text-sm font-semibold">{t("production.lineTitle", language)}</p>
        {(["single", "diversified"] as ProductLineType[]).map((type) => (
          <label
            key={type}
            htmlFor={`productLine_${type}`}
            className="flex items-center justify-between rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="text-sm font-medium">{t(`production.line.${type}`, language)}</span>
            <input
              id={`productLine_${type}`}
              name="productLineType"
              value={type}
              type="radio"
              checked={productLineType === type}
              onChange={() => setProductLineType(type)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <div className="space-y-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("production.packagingTitle", language)}</p>
        <div className="flex gap-3">
          <div className="flex-1">
            <label htmlFor="smallPercent" className="mb-1 block text-xs text-zinc-500">
              {t("production.smallPercentLabel", language)}
            </label>
            <input
              id="smallPercent"
              name="smallPercent"
              type="number"
              step={1}
              inputMode="numeric"
              value={smallPercent}
              onChange={(e) => setSmallPercent(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <div className="flex-1">
            <label htmlFor="largePercent" className="mb-1 block text-xs text-zinc-500">
              {t("production.largePercentLabel", language)}
            </label>
            <input
              id="largePercent"
              name="largePercent"
              type="number"
              step={1}
              inputMode="numeric"
              value={largePercent}
              onChange={(e) => setLargePercent(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
        </div>
        <p className={`text-xs ${percentsValid ? "text-zinc-500" : "text-red-600 dark:text-red-400"}`}>
          {t("production.percentSum", language, { sum: percentSum })}
          {!percentsValid && t("production.percentInvalidSuffix", language)}
        </p>
      </div>

      <label
        htmlFor="qcPurchased"
        className="flex items-center justify-between rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
      >
        <span className="text-sm font-medium">{t("production.qcLabel", language, { cost: QC_COST.toLocaleString("ar") })}</span>
        <input
          id="qcPurchased"
          name="qcPurchased"
          type="checkbox"
          checked={qcPurchased}
          onChange={(e) => setQcPurchased(e.target.checked)}
          className="h-4 w-4"
        />
      </label>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !supplierChoice || purchaseQuantity === "" || !processingMode || !productLineType || smallPercent === "" || largePercent === ""}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? t("production.submitting", language) : t("production.submitButton", language)}
      </button>
    </form>
  );
}
