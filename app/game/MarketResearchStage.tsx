"use client";

import { useActionState, useState } from "react";
import { confirmMarketResearchAllocation, type MarketResearchFormState } from "./actions";
import { MARKET_RESEARCH_CHANNELS, type MarketResearchResults } from "@/lib/market-research";

/**
 * واجهة مرحلة "دراسة السوق" — قبل التأكيد: نموذج توزيع الكريديت على
 * القنوات التلاتة (نفس التصميم بالضبط لكل واحدة، بدون أي تلميح
 * موثوقية). بعد التأكيد: عرض النتائج المحفوظة بس (بدون إعادة حساب).
 */
export default function MarketResearchStage({
  credit,
  results,
}: {
  credit: number;
  results: MarketResearchResults | null;
}) {
  const [state, formAction, isPending] = useActionState<MarketResearchFormState, FormData>(
    confirmMarketResearchAllocation,
    null
  );

  const [amounts, setAmounts] = useState<Record<string, string>>(
    Object.fromEntries(MARKET_RESEARCH_CHANNELS.map((c) => [c.key, ""]))
  );

  if (results?.confirmed) {
    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">نتائج دراسة السوق:</p>
        {MARKET_RESEARCH_CHANNELS.map(({ key, label }) => {
          const outcome = results.outcomes[key];
          return (
            <div
              key={key}
              className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
            >
              <p className="font-medium">{label}</p>
              <p className="mt-1 text-xs text-zinc-500">
                المبلغ المصروف: {outcome.amountSpent.toLocaleString("ar")}
              </p>
              <p className="mt-1 text-sm">{outcome.message}</p>
            </div>
          );
        })}
      </div>
    );
  }

  const totalEntered = Object.values(amounts).reduce((sum, v) => sum + (Number(v) || 0), 0);
  const remaining = credit - totalEntered;

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <p className="text-sm text-zinc-500">
        الرصيد المتاح: {credit.toLocaleString("ar")} — المتبقي: {remaining.toLocaleString("ar")}
      </p>

      <div className="space-y-3">
        {MARKET_RESEARCH_CHANNELS.map(({ key, label }) => (
          <div
            key={key}
            className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <label htmlFor={key} className="mb-2 block text-sm font-medium">
              {label}
            </label>
            <input
              id={key}
              name={key}
              type="number"
              min={0}
              step={1}
              inputMode="numeric"
              value={amounts[key]}
              onChange={(e) =>
                setAmounts((prev) => ({ ...prev, [key]: e.target.value }))
              }
              placeholder="0"
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
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
        {isPending ? "جاري التأكيد..." : "تأكيد التوزيع"}
      </button>
    </form>
  );
}
