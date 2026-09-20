"use client";

import { useActionState, useState } from "react";
import { confirmLicensingDecision, type LicensingFormState } from "./actions";
import {
  AGENCY_COST,
  AGENCY_DAYS,
  SELF_BASE_COST,
  SELF_BASE_DAYS,
  type LicensingResult,
} from "@/lib/licensing";
import DramaticAlert from "./DramaticAlert";
import { t, type Language } from "@/lib/i18n";

/**
 * اسم حدث الترخيص — الشكل الحالي `code` يُترجم عبر t()؛ توافق رجعي
 * مع بيانات قديمة (نص عربي جاهز `label` بدل كود) — تُعرض كما هي.
 */
function getEventText(event: { code?: string; label?: string }, language: Language): string {
  if (event.code) return t(event.code, language);
  return event.label ?? "";
}

/**
 * واجهة مرحلة "الترخيص" — المسارين معروضين بتكلفتهم/مدتهم بوضوح (مو
 * محايدين بصرياً، الفرق معلن). المفاجآت داخل مسار "self" ما تظهر إلا
 * بعد التأكيد، بنفس أسلوب عرض نتائج دراسة السوق.
 */
export default function LicensingStage({ result, language }: { result: LicensingResult | null; language: Language }) {
  const [state, formAction, isPending] = useActionState<LicensingFormState, FormData>(
    confirmLicensingDecision,
    null
  );

  const [path, setPath] = useState<"agency" | "self" | "">("");

  if (result?.confirmed) {
    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">
          {t("licensing.pathLabel", language)}{" "}
          <span className="font-medium">{t(`licensing.path.${result.path}`, language)}</span>
        </p>

        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            {t("licensing.totalCostLabel", language)}{" "}
            <span className="font-medium">{result.totalCost.toLocaleString("ar")}</span>
          </p>
          <p className="mt-1 text-sm">
            <span className="font-medium">{t("licensing.totalDaysLine", language, { days: result.totalDays })}</span>
          </p>
        </div>

        {result.path === "self" && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              {result.wasReady ? t("licensing.wasReady", language) : t("licensing.wasNotReady", language)}
            </p>

            {result.events && result.events.length > 0 ? (
              result.events.map((event) => (
                <DramaticAlert key={event.key} language={language}>
                  <p className="font-medium">{getEventText(event, language)}</p>
                  <p className="mt-1 text-xs">
                    {event.extraCost > 0 &&
                      t("licensing.eventCost", language, { cost: event.extraCost.toLocaleString("ar") })}
                    {event.extraCost > 0 && event.extraDays > 0 && " — "}
                    {event.extraDays > 0 && t("licensing.eventDays", language, { days: event.extraDays })}
                  </p>
                </DramaticAlert>
              ))
            ) : (
              <p className="text-sm text-zinc-500">{t("licensing.noSurprises", language)}</p>
            )}
          </div>
        )}
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <label htmlFor="path_agency" className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("licensing.path.agency", language)}</span>
          <input
            id="path_agency"
            name="path"
            value="agency"
            type="radio"
            checked={path === "agency"}
            onChange={() => setPath("agency")}
            className="h-4 w-4"
          />
        </label>
        <span className="text-xs text-zinc-500">
          {t("licensing.agencyCostLine", language, {
            cost: AGENCY_COST.toLocaleString("ar"),
            days: AGENCY_DAYS,
          })}
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <label htmlFor="path_self" className="flex items-center justify-between">
          <span className="text-sm font-medium">{t("licensing.path.self", language)}</span>
          <input
            id="path_self"
            name="path"
            value="self"
            type="radio"
            checked={path === "self"}
            onChange={() => setPath("self")}
            className="h-4 w-4"
          />
        </label>
        <span className="text-xs text-zinc-500">
          {t("licensing.selfCostLine", language, {
            cost: SELF_BASE_COST.toLocaleString("ar"),
            days: SELF_BASE_DAYS,
          })}
        </span>
        <label htmlFor="ready" className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>{t("licensing.readyCheckbox", language)}</span>
          <input id="ready" name="ready" type="checkbox" className="h-4 w-4" />
        </label>
      </div>

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !path}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? t("common.confirming", language) : t("common.confirm", language)}
      </button>
    </form>
  );
}
