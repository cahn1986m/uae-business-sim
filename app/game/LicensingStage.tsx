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

const PATH_LABELS = {
  agency: "شركة/وكيل تراخيص",
  self: "ترخيص بنفسك",
} as const;

/**
 * واجهة مرحلة "الترخيص" — المسارين معروضين بتكلفتهم/مدتهم بوضوح (مو
 * محايدين بصرياً، الفرق معلن). المفاجآت داخل مسار "self" ما تظهر إلا
 * بعد التأكيد، بنفس أسلوب عرض نتائج دراسة السوق.
 */
export default function LicensingStage({ result }: { result: LicensingResult | null }) {
  const [state, formAction, isPending] = useActionState<LicensingFormState, FormData>(
    confirmLicensingDecision,
    null
  );

  const [path, setPath] = useState<"agency" | "self" | "">("");

  if (result?.confirmed) {
    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">
          مسار الترخيص: <span className="font-medium">{PATH_LABELS[result.path]}</span>
        </p>

        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            التكلفة الإجمالية: <span className="font-medium">{result.totalCost.toLocaleString("ar")}</span>
          </p>
          <p className="mt-1 text-sm">
            الأيام المستهلكة: <span className="font-medium">{result.totalDays} يوم</span>
          </p>
        </div>

        {result.path === "self" && (
          <div className="space-y-2">
            <p className="text-xs text-zinc-500">
              {result.wasReady
                ? "كنت جاهز لمقابلة موظف الترخيص."
                : "ما كنت جاهز بالكامل لمقابلة موظف الترخيص — +5 أيام إضافية."}
            </p>

            {result.events && result.events.length > 0 ? (
              result.events.map((event) => (
                <div
                  key={event.key}
                  className="rounded-md border border-zinc-200 p-3 text-right text-sm dark:border-zinc-800"
                >
                  <p className="font-medium">{event.label}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {event.extraCost > 0 && `+${event.extraCost.toLocaleString("ar")} تكلفة`}
                    {event.extraCost > 0 && event.extraDays > 0 && " — "}
                    {event.extraDays > 0 && `+${event.extraDays} يوم`}
                  </p>
                </div>
              ))
            ) : (
              <p className="text-sm text-zinc-500">ما صار أي مفاجآت هالمرة.</p>
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
          <span className="text-sm font-medium">{PATH_LABELS.agency}</span>
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
          التكلفة: {AGENCY_COST.toLocaleString("ar")} — المدة: {AGENCY_DAYS} يوم
        </span>
      </div>

      <div className="flex flex-col gap-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
        <label htmlFor="path_self" className="flex items-center justify-between">
          <span className="text-sm font-medium">{PATH_LABELS.self}</span>
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
          التكلفة الأساسية: {SELF_BASE_COST.toLocaleString("ar")} — المدة الأساسية: {SELF_BASE_DAYS} يوم
        </span>
        <label htmlFor="ready" className="flex items-center justify-between gap-2 text-xs text-zinc-600 dark:text-zinc-400">
          <span>عندي كل الأوراق والأجوبة جاهزة لمقابلة موظف الترخيص</span>
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
        {isPending ? "جاري التأكيد..." : "تأكيد"}
      </button>
    </form>
  );
}
