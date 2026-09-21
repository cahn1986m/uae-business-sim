"use client";

import { useActionState, useState } from "react";
import { confirmMarketResearchPurchase, type MarketResearchFormState } from "./actions";
import { MARKET_RESEARCH_SERVICES, type MarketResearchResults } from "@/lib/market-research";
import DramaticAlert from "./DramaticAlert";
import { t, type Language } from "@/lib/i18n";

/**
 * واجهة مرحلة "دراسة السوق" — قبل التأكيد: قائمة 4 خدمات بسعر ثابت
 * (checkbox لكل واحدة، نفس التصميم بالضبط، بدون أي تلميح موثوقية).
 * بعد التأكيد: نتيجة فورية لدراسة الجدوى/الاستشاريين لو اتشرو، وبدون
 * أي نص نتيجة للفنادق (علم صامت لمرحلة البيع لاحقاً).
 */
export default function MarketResearchStage({
  credit,
  results,
  language,
}: {
  credit: number;
  results: MarketResearchResults | null;
  language: Language;
}) {
  const [state, formAction, isPending] = useActionState<MarketResearchFormState, FormData>(
    confirmMarketResearchPurchase,
    null
  );

  const [selected, setSelected] = useState<Set<string>>(new Set());

  if (results?.confirmed) {
    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">{t("marketResearch.confirmed", language)}</p>

        {results.outcomes.feasibility && (
          <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
            <p className="font-medium">{t("marketResearch.service.feasibility", language)}</p>
            <p className="mt-1 text-sm">{results.outcomes.feasibility.message}</p>
          </div>
        )}

        {results.outcomes.consultants &&
          (results.outcomes.consultants.success ? (
            <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
              <p className="font-medium">{t("marketResearch.service.consultants", language)}</p>
              <p className="mt-1 text-sm">{results.outcomes.consultants.message}</p>
            </div>
          ) : (
            <DramaticAlert language={language}>
              <p className="font-medium">{t("marketResearch.service.consultants", language)}</p>
              <p className="mt-1 text-sm">{results.outcomes.consultants.message}</p>
            </DramaticAlert>
          ))}
      </div>
    );
  }

  const totalCost = MARKET_RESEARCH_SERVICES.filter((s) => selected.has(s.key)).reduce(
    (sum, s) => sum + s.price,
    0
  );
  const remaining = credit - totalCost;

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <p className="text-sm text-zinc-500">
        {t("marketResearch.creditLine", language, {
          credit: credit.toLocaleString("ar"),
          remaining: remaining.toLocaleString("ar"),
        })}
      </p>

      <div className="space-y-3">
        {MARKET_RESEARCH_SERVICES.map(({ key, price }) => (
          <label
            key={key}
            htmlFor={key}
            className="flex items-center justify-between rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="text-sm font-medium">{t(`marketResearch.service.${key}`, language)}</span>
            <span className="flex items-center gap-3">
              <span className="text-xs text-zinc-500">{price.toLocaleString("ar")}</span>
              <input
                id={key}
                name="services"
                value={key}
                type="checkbox"
                checked={selected.has(key)}
                onChange={(e) => {
                  setSelected((prev) => {
                    const next = new Set(prev);
                    if (e.target.checked) {
                      next.add(key);
                    } else {
                      next.delete(key);
                    }
                    return next;
                  });
                }}
                className="h-4 w-4"
              />
            </span>
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
        {isPending ? t("common.confirming", language) : t("common.confirm", language)}
      </button>
    </form>
  );
}
