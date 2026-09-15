"use client";

import { useActionState, useState } from "react";
import { confirmFinancingDecision, type FinancingFormState } from "./actions";
import { FINANCING_TIERS, type FinancingDecision } from "@/lib/financing";

/**
 * واجهة مرحلة "قرار التمويل" — قبل التأكيد: 3 مستويات بنفس التصميم
 * بالضبط (radio + نطاق + مهلة + حصة مستثمر، كلها معلومات محايدة بدون
 * أي تلميح لأفضلية مستوى). بعد التأكيد: ملخّص القرار بس (العداد
 * التنازلي نفسه بتعرضه الصفحة الأم لكل المراحل التالية، مو هون).
 */
export default function FinancingStage({
  decision,
}: {
  decision: FinancingDecision | null;
}) {
  const [state, formAction, isPending] = useActionState<FinancingFormState, FormData>(
    confirmFinancingDecision,
    null
  );

  const [selectedTier, setSelectedTier] = useState<string>("");

  if (decision) {
    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">قرار التمويل مؤكّد.</p>
        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            رأس المال: <span className="font-medium">{decision.startingCapital.toLocaleString("ar")}</span>
          </p>
          <p className="mt-1 text-sm">
            حصة المستثمر: <span className="font-medium">{decision.investorEquityPercent}%</span>
          </p>
          <p className="mt-1 text-sm">
            مهلة الأداء: <span className="font-medium">{decision.financingDeadlineDays} يوم</span>
          </p>
        </div>
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <div className="space-y-3">
        {FINANCING_TIERS.map((tier) => (
          <label
            key={tier.key}
            htmlFor={`tier_${tier.key}`}
            className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{tier.label}</span>
              <input
                id={`tier_${tier.key}`}
                name="tier"
                value={tier.key}
                type="radio"
                checked={selectedTier === tier.key}
                onChange={() => setSelectedTier(tier.key)}
                className="h-4 w-4"
              />
            </span>

            <span className="text-xs text-zinc-500">
              النطاق: {tier.min.toLocaleString("ar")} - {tier.max.toLocaleString("ar")} — مهلة{" "}
              {tier.deadlineDays} يوم — حصة المستثمر {tier.investorEquityPercent}%
            </span>

            {/*
              ما حطينا min/max هون عمداً — الـHTML validation الأصلية
              كانت بتمنع إرسال النموذج بالكامل لأي رقم خارج النطاق قبل
              ما توصل السيرفر، وهيك ما كنا نقدر نثبت إن الرفض فعلي من
              السيرفر (شرط القبول ينص صراحة "مو بس بالواجهة"). الفحص
              الحقيقي بـconfirmFinancingDecision بـactions.ts.
            */}
            <input
              name={`amount_${tier.key}`}
              type="number"
              step={1}
              inputMode="numeric"
              placeholder={`بين ${tier.min.toLocaleString("ar")} و${tier.max.toLocaleString("ar")}`}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </label>
        ))}
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "جاري التأكيد..." : "تأكيد"}
      </button>
    </form>
  );
}
