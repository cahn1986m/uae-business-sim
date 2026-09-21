"use client";

import { useActionState, useState } from "react";
import { confirmEquipmentDecision, type EquipmentFormState } from "./actions";
import {
  EQUIPMENT_OPTIONS,
  SPACE_BUDGET,
  WORKER_MONTHLY_SALARY,
  type EquipmentType,
  type EquipmentResult,
} from "@/lib/equipment";
import type { RentSpaceSize } from "@/lib/rent";
import { t, type Language } from "@/lib/i18n";

/**
 * واجهة مرحلة "المعدات" — خيارين متطابقين بصرياً (نفس التصميم، فرق
 * بالنص/الأرقام بس). فحص المساحة الحقيقي سيرفر-سايد بـconfirmEquipmentDecision؛
 * التحذير هون بالواجهة مجرد دليل، مو الحماية الفعلية.
 */
export default function EquipmentStage({
  spaceSize,
  result,
  language,
}: {
  spaceSize: RentSpaceSize;
  result: EquipmentResult | null;
  language: Language;
}) {
  const [state, formAction, isPending] = useActionState<EquipmentFormState, FormData>(
    confirmEquipmentDecision,
    null
  );

  const [selectedType, setSelectedType] = useState<EquipmentType | "">("");
  const [workerCount, setWorkerCount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "installments">("cash");

  const spaceBudget = SPACE_BUDGET[spaceSize];

  if (result?.confirmed) {
    const option = EQUIPMENT_OPTIONS.find((o) => o.type === result.equipmentType);

    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">
          {t("equipment.typeLabel", language)}{" "}
          <span className="font-medium">{option ? t(`equipment.option.${option.type}`, language) : null}</span>
        </p>

        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            {t("equipment.workerCountLabel", language)} <span className="font-medium">{result.workerCount}</span>
          </p>
          <p className="mt-1 text-sm">
            {t("equipment.workerMonthlyTotalLabel", language)}{" "}
            <span className="font-medium">{result.workerMonthlyTotal.toLocaleString("ar")}</span>
          </p>
          <p className="mt-1 text-sm">
            {result.paymentMethod === "cash"
              ? t("equipment.paidCash", language, { amount: result.amountPaidNow.toLocaleString("ar") })
              : t("equipment.paidInstallments", language, {
                  amount: result.amountPaidNow.toLocaleString("ar"),
                  monthly: result.monthlyAmount?.toLocaleString("ar") ?? "",
                })}
          </p>
        </div>
      </div>
    );
  }

  const option = selectedType ? EQUIPMENT_OPTIONS.find((o) => o.type === selectedType) : null;
  const parsedWorkerCount = Number(workerCount) || 0;
  const workerMonthlyPreview = parsedWorkerCount * WORKER_MONTHLY_SALARY;
  const downPayment = option
    ? paymentMethod === "cash" || !option.allowsInstallments
      ? option.cost
      : Math.round(option.cost * 0.2)
    : 0;
  const monthlyPreview =
    option && option.allowsInstallments && paymentMethod === "installments"
      ? Math.round((option.cost * 0.8 * 1.15) / 12)
      : null;

  return (
    <form action={formAction} className="w-full max-w-md space-y-4">
      <p className="text-xs text-zinc-500">{t("equipment.spaceBudget", language, { budget: spaceBudget })}</p>

      <div className="space-y-3">
        {EQUIPMENT_OPTIONS.map((o) => (
          <label
            key={o.type}
            htmlFor={`equip_${o.type}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{t(`equipment.option.${o.type}`, language)}</span>
              <input
                id={`equip_${o.type}`}
                name="equipmentType"
                value={o.type}
                type="radio"
                checked={selectedType === o.type}
                onChange={() => {
                  setSelectedType(o.type);
                  setWorkerCount(String(o.suggestedWorkers));
                  setPaymentMethod("cash");
                }}
                className="h-4 w-4"
              />
            </span>
            <span className="text-xs text-zinc-500">
              {t("equipment.costSpaceWorkersLine", language, {
                cost: o.cost.toLocaleString("ar"),
                space: o.spaceUsed,
                workers: o.suggestedWorkers,
                paymentOptions: o.allowsInstallments
                  ? t("equipment.cashOrInstallments", language)
                  : t("equipment.cashOnly", language),
              })}
            </span>
            {o.spaceUsed > spaceBudget && (
              <span className="text-xs text-red-600 dark:text-red-400">
                {t("equipment.spaceUnfit", language, { budget: spaceBudget })}
              </span>
            )}
          </label>
        ))}
      </div>

      {option && (
        <div className="space-y-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <div>
            <label htmlFor="workerCount" className="mb-2 block text-sm font-medium">
              {t("equipment.workerCountInputLabel", language, { suggested: option.suggestedWorkers })}
            </label>
            <input
              id="workerCount"
              name="workerCount"
              type="number"
              step={1}
              inputMode="numeric"
              value={workerCount}
              onChange={(e) => setWorkerCount(e.target.value)}
              className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900"
            />
          </div>
          <p className="text-xs text-zinc-500">
            {t("equipment.workerMonthlyPreview", language, {
              total: workerMonthlyPreview.toLocaleString("ar"),
              salary: WORKER_MONTHLY_SALARY.toLocaleString("ar"),
              count: parsedWorkerCount,
            })}
          </p>

          {option.allowsInstallments && (
            <div className="flex gap-4 text-sm">
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={paymentMethod === "cash"}
                  onChange={() => setPaymentMethod("cash")}
                />
                {t("common.cashFull", language)}
              </label>
              <label className="flex items-center gap-1">
                <input
                  type="radio"
                  checked={paymentMethod === "installments"}
                  onChange={() => setPaymentMethod("installments")}
                />
                {t("common.installments", language)}
              </label>
            </div>
          )}
          <input
            type="hidden"
            name="paymentMethod"
            value={option.allowsInstallments ? paymentMethod : "cash"}
          />

          <p className="text-xs text-zinc-500">
            {monthlyPreview !== null
              ? t("rent.payingNowInstallments", language, {
                  amount: downPayment.toLocaleString("ar"),
                  monthly: monthlyPreview.toLocaleString("ar"),
                })
              : t("rent.payingNowCash", language, { amount: downPayment.toLocaleString("ar") })}
          </p>
        </div>
      )}

      {state?.error && (
        <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
          {state.error}
        </p>
      )}

      <button
        type="submit"
        disabled={isPending || !option}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? t("common.confirming", language) : t("common.confirm", language)}
      </button>
    </form>
  );
}
