"use client";

import { useActionState, useState } from "react";
import {
  confirmRentDecision,
  negotiateRentPrice,
  type RentFormState,
  type NegotiationFormState,
} from "./actions";
import {
  RENT_OPTIONS,
  MISSING_SERVICES,
  MISSING_SERVICES_TOTAL,
  type RentId,
  type NegotiationResult,
  type RentResult,
} from "@/lib/rent";
import { t, type Language } from "@/lib/i18n";

/**
 * واجهة مرحلة "الإيجار" — الأربعة خيارات معروضة بنفس التصميم بالضبط
 * (فرق بس بالنص/الأرقام)، بس التكلفة والمدة معلنة وواضحة (مو محايدة
 * بصرياً زي دراسة السوق). "تفاصيل" و"التفاوض" اختياريين، خارج شبكة
 * الكروت نفسها حتى تضل الأربعة متطابقة تماماً.
 */
export default function RentStage({
  negotiation,
  result,
  language,
}: {
  negotiation: NegotiationResult | null;
  result: RentResult | null;
  language: Language;
}) {
  const [confirmState, confirmAction, confirmPending] = useActionState<RentFormState, FormData>(
    confirmRentDecision,
    null
  );
  const [negotiateState, negotiateAction, negotiatePending] = useActionState<
    NegotiationFormState,
    FormData
  >(negotiateRentPrice, null);

  const [selectedRentId, setSelectedRentId] = useState<RentId | "">("");
  const [detailsViewed, setDetailsViewed] = useState(false);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "installments">("cash");

  if (result?.confirmed) {
    const option = RENT_OPTIONS.find((o) => o.id === result.rentId);

    return (
      <div className="w-full max-w-md space-y-3">
        <p className="text-sm text-zinc-500">
          {t("rent.decisionLabel", language)}{" "}
          <span className="font-medium">{option ? t(`rent.option.${option.id}`, language) : null}</span>
        </p>

        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            {t("rent.finalPriceLabel", language)}{" "}
            <span className="font-medium">{result.finalPrice.toLocaleString("ar")}</span>
          </p>
          {result.discountPercent > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              {t("rent.negotiationSuccessLine", language, { percent: result.discountPercent })}
            </p>
          )}
          <p className="mt-1 text-sm">
            {result.paymentMethod === "cash"
              ? t("rent.paidCash", language, { amount: result.amountPaidNow.toLocaleString("ar") })
              : t("rent.paidInstallments", language, {
                  amount: result.amountPaidNow.toLocaleString("ar"),
                  monthly: result.monthlyAmount?.toLocaleString("ar") ?? "",
                })}
          </p>
        </div>

        {result.surpriseEvents && result.surpriseEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              {t("rent.surprisesTitle", language)}
            </p>
            {result.surpriseEvents.map((event) => (
              <div
                key={event.key}
                className="rounded-md border border-zinc-200 p-3 text-right text-sm dark:border-zinc-800"
              >
                <p className="font-medium">{event.label}</p>
                <p className="mt-1 text-xs text-zinc-500">+{event.cost.toLocaleString("ar")}</p>
              </div>
            ))}
            <p className="text-xs text-zinc-500">
              {t("rent.surprisesTotal", language, { amount: result.totalSurpriseCost.toLocaleString("ar") })}
            </p>
          </div>
        )}
      </div>
    );
  }

  const option = selectedRentId ? RENT_OPTIONS.find((o) => o.id === selectedRentId) : null;

  const effectiveNegotiation =
    negotiateState && "discountPercent" in negotiateState ? negotiateState : negotiation;
  const negotiationUsedAlready = effectiveNegotiation !== null;
  const discountPercent = effectiveNegotiation?.success ? effectiveNegotiation.discountPercent : 0;

  const displayedPrice = option
    ? option.annualRent + (!option.hasFullServices && detailsViewed ? MISSING_SERVICES_TOTAL : 0)
    : 0;
  const finalPrice = Math.round(displayedPrice * (1 - discountPercent / 100));
  const downPayment = paymentMethod === "cash" ? finalPrice : Math.round(finalPrice * 0.2);
  const monthlyPreview =
    paymentMethod === "installments" ? Math.round((finalPrice * 0.8 * 1.15) / 12) : null;

  return (
    <div className="w-full max-w-md space-y-4">
      <div className="space-y-3">
        {RENT_OPTIONS.map((o) => (
          <label
            key={o.id}
            htmlFor={`rent_${o.id}`}
            className="flex flex-col gap-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800"
          >
            <span className="flex items-center justify-between">
              <span className="text-sm font-medium">{t(`rent.option.${o.id}`, language)}</span>
              <input
                id={`rent_${o.id}`}
                type="radio"
                checked={selectedRentId === o.id}
                onChange={() => {
                  setSelectedRentId(o.id);
                  setDetailsViewed(false);
                }}
                className="h-4 w-4"
              />
            </span>
            <span className="text-xs text-zinc-500">
              {t("rent.annualRentLine", language, {
                amount: o.annualRent.toLocaleString("ar"),
                space: t(`rent.space.${o.spaceSize}`, language),
                services: o.hasFullServices ? t("rent.fullServices", language) : t("rent.missingServices", language),
              })}
            </span>
          </label>
        ))}
      </div>

      {option && !option.hasFullServices && (
        <div className="space-y-2">
          <button
            type="button"
            onClick={() => setDetailsViewed(true)}
            disabled={detailsViewed}
            className="text-xs text-zinc-500 underline disabled:no-underline disabled:opacity-50"
          >
            {detailsViewed ? t("common.detailsViewed", language) : t("common.details", language)}
          </button>
          {detailsViewed && (
            <div className="space-y-2">
              {MISSING_SERVICES.map((service) => (
                <div
                  key={service.key}
                  className="rounded-md border border-zinc-200 p-2 text-right text-xs dark:border-zinc-800"
                >
                  {service.label} — {service.cost.toLocaleString("ar")}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {option && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            {t("rent.displayedPriceLabel", language)}{" "}
            <span className="font-medium">{displayedPrice.toLocaleString("ar")}</span>
          </p>
          {discountPercent > 0 && (
            <p className="text-xs text-zinc-500">
              {t("rent.afterDiscount", language, { percent: discountPercent, amount: finalPrice.toLocaleString("ar") })}
            </p>
          )}

          <form action={negotiateAction}>
            <button
              type="submit"
              disabled={negotiationUsedAlready || negotiatePending}
              className="text-xs text-zinc-500 underline disabled:no-underline disabled:opacity-50"
            >
              {negotiatePending
                ? t("rent.negotiating", language)
                : negotiationUsedAlready
                  ? effectiveNegotiation?.success
                    ? t("rent.negotiatedSuccess", language, { percent: effectiveNegotiation.discountPercent })
                    : t("rent.negotiatedFailed", language)
                  : t("rent.negotiateButton", language)}
            </button>
          </form>
        </div>
      )}

      {option && (
        <form action={confirmAction} className="space-y-3">
          <input type="hidden" name="rentId" value={option.id} />
          <input type="hidden" name="viewedDetails" value={detailsViewed ? "true" : "false"} />

          <div className="flex gap-4 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="paymentMethod"
                value="cash"
                checked={paymentMethod === "cash"}
                onChange={() => setPaymentMethod("cash")}
              />
              {t("common.cashFull", language)}
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="paymentMethod"
                value="installments"
                checked={paymentMethod === "installments"}
                onChange={() => setPaymentMethod("installments")}
              />
              {t("common.installments", language)}
            </label>
          </div>

          <p className="text-xs text-zinc-500">
            {paymentMethod === "cash"
              ? t("rent.payingNowCash", language, { amount: downPayment.toLocaleString("ar") })
              : t("rent.payingNowInstallments", language, {
                  amount: downPayment.toLocaleString("ar"),
                  monthly: monthlyPreview?.toLocaleString("ar") ?? "",
                })}
          </p>

          {confirmState?.error && (
            <p className="rounded-md bg-red-50 px-3 py-2 text-sm text-red-700 dark:bg-red-950 dark:text-red-300">
              {confirmState.error}
            </p>
          )}

          <button
            type="submit"
            disabled={confirmPending}
            className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            {confirmPending ? t("common.confirming", language) : t("common.confirm", language)}
          </button>
        </form>
      )}
    </div>
  );
}
