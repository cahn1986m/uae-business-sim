"use client";

import { useState } from "react";
import { useActionState } from "react";
import { confirmSaleTransaction, type SalesFormState } from "./actions";
import { CHANNEL_LABELS, CHANNEL_MARGIN, type SalesChannel } from "@/lib/sales";

const CHANNELS: SalesChannel[] = ["discount-market", "wholesaler", "boutique-trader"];

/**
 * واجهة مرحلة "البيع" (الجزء أ) — بيع يدوي متكرر: قناة + كمية، بدون
 * مصادر زبائن أو تسهيلات (أجزاء لاحقة). "تجار صغار" تظهر مقفولة
 * بصرياً (radio معطّل) لو ما تحقق شرط التنويع — الحماية الحقيقية
 * سيرفر-سايد بـconfirmSaleTransaction نفسه، مو الواجهة. زر "الانتقال
 * لمرحلة النتيجة" هو نفسه زر "التالي" العام (يظهر تلقائياً من
 * page.tsx بمجرد وجود عملية بيع واحدة مكتملة).
 */
export default function SalesStage({
  availableSmallUnits,
  availableLargeUnits,
  boutiqueUnlocked,
}: {
  availableSmallUnits: number;
  availableLargeUnits: number;
  boutiqueUnlocked: boolean;
}) {
  const [state, formAction, isPending] = useActionState<SalesFormState, FormData>(
    confirmSaleTransaction,
    null
  );

  const [channel, setChannel] = useState<SalesChannel | "">("");
  const [unitsSold, setUnitsSold] = useState("");

  const availableForChannel = (c: SalesChannel) =>
    c === "boutique-trader" ? availableSmallUnits : availableLargeUnits;

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      {state && "totalRevenue" in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          بيع ناجح: {state.unitsSold.toLocaleString("ar")} وحدة عبر {CHANNEL_LABELS[state.channel]} — إيراد إجمالي{" "}
          {state.totalRevenue.toLocaleString("ar")} درهم
        </p>
      )}

      <div className="space-y-3">
        {CHANNELS.map((c) => {
          const locked = c === "boutique-trader" && !boutiqueUnlocked;
          return (
            <label
              key={c}
              htmlFor={`channel_${c}`}
              className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
            >
              <span className="flex items-center justify-between">
                <span className="text-sm font-medium">{CHANNEL_LABELS[c]}</span>
                <input
                  id={`channel_${c}`}
                  name="channel"
                  value={c}
                  type="radio"
                  disabled={locked}
                  checked={channel === c}
                  onChange={() => setChannel(c)}
                  className="h-4 w-4"
                />
              </span>
              <span className="text-xs text-zinc-500">
                هامش الربح: {Math.round(CHANNEL_MARGIN[c] * 100)}% — المتاح للبيع: {availableForChannel(c).toLocaleString("ar")} وحدة
              </span>
              {locked && (
                <span className="text-xs text-red-600 dark:text-red-400">
                  مقفولة — تحتاج تنويع سلة (productLineType=diversified) بدورة إنتاج واحدة على الأقل
                </span>
              )}
            </label>
          );
        })}
      </div>

      <div>
        <label htmlFor="unitsSold" className="mb-2 block text-sm font-medium">
          الكمية المطلوب بيعها
        </label>
        <input
          id="unitsSold"
          name="unitsSold"
          type="number"
          step={1}
          inputMode="numeric"
          value={unitsSold}
          onChange={(e) => setUnitsSold(e.target.value)}
          className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
        />
      </div>

      {state && "error" in state && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !channel || unitsSold === ""}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? "جاري البيع..." : "بيع"}
      </button>
    </form>
  );
}
