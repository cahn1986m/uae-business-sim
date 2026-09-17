"use client";

import { useState } from "react";
import { useActionState } from "react";
import { confirmProductionPurchase, type ProductionFormState } from "./actions";
import {
  SUPPLIER_PRICE_PER_UNIT,
  BULK_DISCOUNT_CAPACITY_MULTIPLIER,
  BULK_DISCOUNT_PERCENT,
  type ProductionCycle,
  type SupplierChoice,
} from "@/lib/production";

const SUPPLIER_LABELS: Record<SupplierChoice, string> = {
  cheap: "مورّد رخيص",
  trusted: "مورّد موثوق",
};

type CycleProps = {
  capacity: number;
  rawMaterialInventory: number;
  cycles: ProductionCycle[];
};

/**
 * واجهة مرحلة "الإنتاج" (الجزء أ) — دورة متكررة: شراء مواد خام ثم
 * إنتاج تلقائي فوراً بعده. زر "الانتقال لمرحلة البيع" هو نفسه زر
 * "التالي" العام (يظهر تلقائياً من page.tsx بمجرد وجود دورة واحدة
 * مكتملة). "دورة إنتاج جديدة" بترمونت النموذج الداخلي من جديد (مفتاح
 * جديد) بدل استخدام useEffect لمزامنة حالة مشتقة من نتيجة الـServer
 * Action.
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
  onStartNewCycle,
}: CycleProps & { onStartNewCycle: () => void }) {
  const [state, formAction, isPending] = useActionState<ProductionFormState, FormData>(
    confirmProductionPurchase,
    null
  );

  const [supplierChoice, setSupplierChoice] = useState<SupplierChoice | "">("");
  const [purchaseQuantity, setPurchaseQuantity] = useState("");

  if (state && "producedUnits" in state) {
    return (
      <div className="w-full max-w-md space-y-4">
        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm font-medium">أنتجت {state.producedUnits.toLocaleString("ar")} وحدة هذه الدورة</p>
          <p className="mt-1 text-xs text-zinc-500">
            دورة رقم {cycles.length} — مخزون المواد الخام الحالي: {rawMaterialInventory.toLocaleString("ar")}
          </p>
        </div>

        <button
          type="button"
          onClick={onStartNewCycle}
          className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          دورة إنتاج جديدة
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

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <p className="text-sm">
          طاقة الإنتاج لهذه الدورة: <span className="font-medium">{capacity.toLocaleString("ar")}</span> وحدة
        </p>
        <p className="mt-1 text-sm">
          مخزون المواد الخام الحالي: <span className="font-medium">{rawMaterialInventory.toLocaleString("ar")}</span>
        </p>
      </div>

      <div className="space-y-3">
        {(["cheap", "trusted"] as SupplierChoice[]).map((choice) => (
          <label
            key={choice}
            htmlFor={`supplier_${choice}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{SUPPLIER_LABELS[choice]}</span>
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
              سعر الوحدة: {SUPPLIER_PRICE_PER_UNIT[choice].toLocaleString("ar")} درهم
            </span>
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="purchaseQuantity" className="mb-2 block text-sm font-medium">
          الكمية المطلوب شراؤها
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
          التكلفة التقديرية: {previewCost.toLocaleString("ar")} درهم
          {bulkEligible && ` (شامل خصم شراء بالجملة ${BULK_DISCOUNT_PERCENT}%)`}
        </p>
      )}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !supplierChoice || purchaseQuantity === ""}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "جاري الشراء..." : "شراء وإنتاج"}
      </button>
    </form>
  );
}
