"use client";

import { useActionState, useState } from "react";
import { confirmHiringDecision, type HiringFormState } from "./actions";
import { HIRING_ROLES, type HiringChoice, type HiringDecision } from "@/lib/hiring";
import { t, type Language } from "@/lib/i18n";

/**
 * واجهة مرحلة "التوظيف" — دوران مستقلان (كيميائي ومحاسب)، كل واحد
 * بثلاثة خيارات متطابقة بصرياً 100% (جونيور/سينيور/لا توظف — حتى "لا
 * توظف" عندها نفس شكل البطاقة وزر "تفاصيل"). الراتب ظاهر افتراضياً؛
 * نص الخبرة ما بيظهر إلا بعد ضغط "تفاصيل" لكل مرشح لحاله.
 */
export default function HiringStage({
  decision,
  language,
}: {
  decision: HiringDecision | null;
  language: Language;
}) {
  const [state, formAction, isPending] = useActionState<HiringFormState, FormData>(
    confirmHiringDecision,
    null
  );

  const [chemistChoice, setChemistChoice] = useState<HiringChoice | "">("");
  const [accountantChoice, setAccountantChoice] = useState<HiringChoice | "">("");
  const [viewedDetails, setViewedDetails] = useState<Set<string>>(new Set());

  function toggleDetails(key: string) {
    setViewedDetails((prev) => new Set(prev).add(key));
  }

  if (decision) {
    return (
      <div className="w-full max-w-md space-y-3">
        {HIRING_ROLES.map(({ role }) => {
          const hired = role === "chemist" ? decision.chemistHired : decision.accountantHired;
          const experience =
            role === "chemist" ? decision.chemistExperience : decision.accountantExperience;
          return (
            <div
              key={role}
              className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
            >
              <p className="text-sm font-medium">{t(`hiring.role.${role}`, language)}</p>
              <p className="mt-1 text-sm text-zinc-500">
                {hired
                  ? t("hiring.hiredLine", language, {
                      experience: t(`hiring.experience.${experience}`, language),
                    })
                  : t("hiring.notHired", language)}
              </p>
            </div>
          );
        })}
      </div>
    );
  }

  return (
    <form action={formAction} className="w-full max-w-md space-y-6">
      {HIRING_ROLES.map(({ role, candidates }) => (
        <div key={role} className="space-y-3">
          <p className="text-sm font-semibold">{t(`hiring.role.${role}`, language)}</p>
          {candidates.map((candidate) => {
            const detailsKey = `${role}_${candidate.choice}`;
            const isDetailsShown = viewedDetails.has(detailsKey);
            const inputId = `${role}_${candidate.choice}`;
            return (
              <label
                key={candidate.choice}
                htmlFor={inputId}
                className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
              >
                <span className="flex items-center justify-between">
                  <span className="text-sm font-medium">{t(`hiring.choice.${candidate.choice}`, language)}</span>
                  <input
                    id={inputId}
                    name={role}
                    value={candidate.choice}
                    type="radio"
                    checked={
                      (role === "chemist" ? chemistChoice : accountantChoice) === candidate.choice
                    }
                    onChange={() => {
                      if (role === "chemist") setChemistChoice(candidate.choice);
                      else setAccountantChoice(candidate.choice);
                    }}
                    className="h-4 w-4"
                  />
                </span>
                <span className="text-xs text-zinc-500">
                  {t("hiring.salaryLine", language, { salary: candidate.monthlySalary.toLocaleString("ar") })}
                </span>

                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    toggleDetails(detailsKey);
                  }}
                  disabled={isDetailsShown}
                  className="w-fit text-xs text-zinc-500 underline disabled:no-underline disabled:opacity-50"
                >
                  {isDetailsShown ? t("common.detailsViewed", language) : t("common.details", language)}
                </button>
                {isDetailsShown && <p className="text-xs text-zinc-500">{t(candidate.bio, language)}</p>}
              </label>
            );
          })}
        </div>
      ))}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !chemistChoice || !accountantChoice}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? t("common.confirming", language) : t("common.confirm", language)}
      </button>
    </form>
  );
}
