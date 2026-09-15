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
  type RentSpaceSize,
  type NegotiationResult,
  type RentResult,
} from "@/lib/rent";

const SPACE_LABELS: Record<RentSpaceSize, string> = {
  small: "صغيرة",
  medium: "متوسطة",
  large: "كبيرة",
};

/**
 * واجهة مرحلة "الإيجار" — الأربعة خيارات معروضة بنفس التصميم بالضبط
 * (فرق بس بالنص/الأرقام)، بس التكلفة والمدة معلنة وواضحة (مو محايدة
 * بصرياً زي دراسة السوق). "تفاصيل" و"التفاوض" اختياريين، خارج شبكة
 * الكروت نفسها حتى تضل الأربعة متطابقة تماماً.
 */
export default function RentStage({
  negotiation,
  result,
}: {
  negotiation: NegotiationResult | null;
  result: RentResult | null;
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
          قرار الإيجار: <span className="font-medium">{option?.label}</span>
        </p>

        <div className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm">
            السعر النهائي: <span className="font-medium">{result.finalPrice.toLocaleString("ar")}</span>
          </p>
          {result.discountPercent > 0 && (
            <p className="mt-1 text-xs text-zinc-500">
              تفاوض ناجح — خصم {result.discountPercent}%
            </p>
          )}
          <p className="mt-1 text-sm">
            {result.paymentMethod === "cash"
              ? `دُفع كاش كامل: ${result.amountPaidNow.toLocaleString("ar")}`
              : `دُفع الآن: ${result.amountPaidNow.toLocaleString("ar")} — قسط شهري: ${result.monthlyAmount?.toLocaleString("ar")} لـ12 شهر`}
          </p>
        </div>

        {result.surpriseEvents && result.surpriseEvents.length > 0 && (
          <div className="space-y-2">
            <p className="text-sm font-medium text-red-700 dark:text-red-300">
              اكتشفت نواقص بعد التأكيد!
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
              إجمالي المفاجآت: {result.totalSurpriseCost.toLocaleString("ar")} (اتخصمت فوراً)
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
              <span className="text-sm font-medium">{o.label}</span>
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
              إيجار سنوي: {o.annualRent.toLocaleString("ar")} — مساحة: {SPACE_LABELS[o.spaceSize]} —{" "}
              {o.hasFullServices ? "خدمات كاملة" : "خدمات ناقصة"}
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
            {detailsViewed ? "شفت التفاصيل" : "تفاصيل"}
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
            السعر المعروض: <span className="font-medium">{displayedPrice.toLocaleString("ar")}</span>
          </p>
          {discountPercent > 0 && (
            <p className="text-xs text-zinc-500">
              بعد خصم التفاوض ({discountPercent}%): {finalPrice.toLocaleString("ar")}
            </p>
          )}

          <form action={negotiateAction}>
            <button
              type="submit"
              disabled={negotiationUsedAlready || negotiatePending}
              className="text-xs text-zinc-500 underline disabled:no-underline disabled:opacity-50"
            >
              {negotiatePending
                ? "جاري التفاوض..."
                : negotiationUsedAlready
                  ? effectiveNegotiation?.success
                    ? `تفاوضت بنجاح (${effectiveNegotiation.discountPercent}% خصم)`
                    : "تفاوضت — ما نجح"
                  : "تفاوض على السعر"}
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
              كاش كامل
            </label>
            <label className="flex items-center gap-1">
              <input
                type="radio"
                name="paymentMethod"
                value="installments"
                checked={paymentMethod === "installments"}
                onChange={() => setPaymentMethod("installments")}
              />
              تقسيط
            </label>
          </div>

          <p className="text-xs text-zinc-500">
            {paymentMethod === "cash"
              ? `تدفع الآن: ${downPayment.toLocaleString("ar")}`
              : `دفعة أولى الآن: ${downPayment.toLocaleString("ar")} — قسط شهري تقريبي: ${monthlyPreview?.toLocaleString("ar")} لـ12 شهر`}
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
            {confirmPending ? "جاري التأكيد..." : "تأكيد"}
          </button>
        </form>
      )}
    </div>
  );
}
