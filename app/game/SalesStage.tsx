"use client";

import { useState } from "react";
import { useActionState } from "react";
import {
  confirmSaleTransaction,
  hireSalesEmployee,
  confirmAdCampaign,
  type SalesFormState,
  type AdCampaignFormState,
} from "./actions";
import {
  CHANNEL_MARGIN,
  SALES_EMPLOYEE_COMMISSION_RATE,
  AD_BUDGET_MINIMUM,
  WHOLESALE_PAYMENT_MARGIN,
  type SalesChannel,
  type LocationBonusResult,
  type AdCampaign,
  type AdTarget,
  type WholesalePaymentMethod,
} from "@/lib/sales";
import DramaticAlert from "./DramaticAlert";
import { t, type Language } from "@/lib/i18n";

const CHANNELS: SalesChannel[] = ["discount-market", "wholesaler", "boutique-trader"];
const AD_TARGETS: AdTarget[] = ["premium", "wholesale", "discount"];
const WHOLESALE_PAYMENT_METHODS: WholesalePaymentMethod[] = ["cash", "credit-30", "credit-60", "credit-90"];

/**
 * نص نتيجة أثر الموقع — الشكل الحالي `code` يُترجم عبر t()؛ توافق
 * رجعي مع بيانات قديمة (نص عربي جاهز `message` بدل كود) — تُعرض كما
 * هي بدون أي محاولة ترجمة.
 */
function getLocationBonusText(result: { code?: string; message?: string }, language: Language): string {
  if (result.code) return t(result.code, language);
  return result.message ?? "";
}

/**
 * واجهة مرحلة "البيع" — الجزء أ (بيع يدوي متكرر) + الجزء ب (مصادر
 * الزبائن: أثر الموقع التلقائي، موظف مبيعات، إعلانات). "تجار صغار"
 * تظهر مقفولة بصرياً (radio معطّل) لو ما تحقق شرط التنويع — الحماية
 * الحقيقية سيرفر-سايد بـconfirmSaleTransaction نفسه، مو الواجهة.
 */
export default function SalesStage({
  availableSmallUnits,
  availableLargeUnits,
  boutiqueUnlocked,
  locationBonusResults,
  salesEmployeeHired,
  adCampaigns,
  language,
}: {
  availableSmallUnits: number;
  availableLargeUnits: number;
  boutiqueUnlocked: boolean;
  locationBonusResults: LocationBonusResult[];
  salesEmployeeHired: boolean;
  adCampaigns: AdCampaign[];
  language: Language;
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      {locationBonusResults.length > 0 && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm font-semibold">{t("sales.locationEffectTitle", language)}</p>
          {locationBonusResults.map((r, i) =>
            r.type === "hotel-2star" && !r.success ? (
              <DramaticAlert key={i} language={language}>
                <p className="text-xs">{getLocationBonusText(r, language)}</p>
              </DramaticAlert>
            ) : (
              <p
                key={i}
                className={`text-xs ${r.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
              >
                {getLocationBonusText(r, language)}
              </p>
            )
          )}
        </div>
      )}

      <SalesEmployeeSection hired={salesEmployeeHired} language={language} />

      <SaleForm
        availableSmallUnits={availableSmallUnits}
        availableLargeUnits={availableLargeUnits}
        boutiqueUnlocked={boutiqueUnlocked}
        salesEmployeeHired={salesEmployeeHired}
        language={language}
      />

      <AdCampaignSection campaigns={adCampaigns} language={language} />
    </div>
  );
}

function SalesEmployeeSection({ hired, language }: { hired: boolean; language: Language }) {
  if (hired) {
    return (
      <div className="rounded-md border border-zinc-200 p-4 text-right text-sm dark:border-zinc-800">
        {t("sales.employeeHiredLine", language, { percent: Math.round(SALES_EMPLOYEE_COMMISSION_RATE * 100) })}
      </div>
    );
  }

  return (
    <form action={hireSalesEmployee} className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
      <p className="text-sm font-medium">{t("sales.employeeTitle", language)}</p>
      <p className="mt-1 text-xs text-zinc-500">
        {t("sales.employeeDescription", language, { percent: Math.round(SALES_EMPLOYEE_COMMISSION_RATE * 100) })}
      </p>
      <button
        type="submit"
        className="mt-3 w-full rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {t("sales.hireEmployeeButton", language)}
      </button>
    </form>
  );
}

function SaleForm({
  availableSmallUnits,
  availableLargeUnits,
  boutiqueUnlocked,
  salesEmployeeHired,
  language,
}: {
  availableSmallUnits: number;
  availableLargeUnits: number;
  boutiqueUnlocked: boolean;
  salesEmployeeHired: boolean;
  language: Language;
}) {
  const [state, formAction, isPending] = useActionState<SalesFormState, FormData>(
    confirmSaleTransaction,
    null
  );

  const [channel, setChannel] = useState<SalesChannel | "">("");
  const [unitsSold, setUnitsSold] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<WholesalePaymentMethod>("cash");

  const availableForChannel = (c: SalesChannel) =>
    c === "boutique-trader" ? availableSmallUnits : availableLargeUnits;

  return (
    <form action={formAction} className="space-y-4">
      <p className="text-sm font-semibold">{t("sales.saleTitle", language)}</p>

      {state && "totalRevenue" in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t("sales.saleSuccess", language, {
            units: state.unitsSold.toLocaleString("ar"),
            channel: t(`sales.channel.${state.channel}`, language),
            revenue: state.totalRevenue.toLocaleString("ar"),
          })}
          {state.deferred
            ? t("sales.deferredSuffix", language, { method: t(`sales.payment.${state.paymentMethod}`, language) })
            : ""}
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
                <span className="text-sm font-medium">{t(`sales.channel.${c}`, language)}</span>
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
                {t("sales.marginLine", language, {
                  percent: Math.round(CHANNEL_MARGIN[c] * 100),
                  available: availableForChannel(c).toLocaleString("ar"),
                })}
                {salesEmployeeHired && t("sales.commissionSuffix", language)}
              </span>
              {locked && <span className="text-xs text-red-600 dark:text-red-400">{t("sales.lockedLine", language)}</span>}
            </label>
          );
        })}
      </div>

      {channel === "wholesaler" && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm font-medium">{t("sales.paymentMethodTitle", language)}</p>
          {WHOLESALE_PAYMENT_METHODS.map((m) => (
            <label key={m} htmlFor={`payment_${m}`} className="flex items-center justify-between text-sm">
              <span>
                {t("sales.marginPercentLine", language, {
                  label: t(`sales.payment.${m}`, language),
                  percent: Math.round(WHOLESALE_PAYMENT_MARGIN[m] * 100),
                })}
              </span>
              <input
                id={`payment_${m}`}
                name="paymentMethod"
                value={m}
                type="radio"
                checked={paymentMethod === m}
                onChange={() => setPaymentMethod(m)}
                className="h-4 w-4"
              />
            </label>
          ))}
        </div>
      )}

      <div>
        <label htmlFor="unitsSold" className="mb-2 block text-sm font-medium">
          {t("sales.quantityLabel", language)}
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
        {isPending ? t("sales.submitting", language) : t("sales.submitButton", language)}
      </button>
    </form>
  );
}

function AdCampaignSection({ campaigns, language }: { campaigns: AdCampaign[]; language: Language }) {
  const [state, formAction, isPending] = useActionState<AdCampaignFormState, FormData>(
    confirmAdCampaign,
    null
  );

  const [target, setTarget] = useState<AdTarget | "">("");
  const [budget, setBudget] = useState("");

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
      <p className="text-sm font-semibold">
        {t("sales.adCampaignTitle", language, { count: campaigns.length.toLocaleString("ar") })}
      </p>

      {state && "wonChannel" in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          {t("sales.adCampaignSuccess", language, {
            units: state.bonusUnits.toLocaleString("ar"),
            channel: t(`sales.channel.${state.wonChannel}`, language),
          })}
        </p>
      )}

      <div className="space-y-2">
        {AD_TARGETS.map((adTarget) => (
          <label key={adTarget} htmlFor={`ad_target_${adTarget}`} className="flex items-center justify-between text-sm">
            <span>{t(`sales.adTarget.${adTarget}`, language)}</span>
            <input
              id={`ad_target_${adTarget}`}
              name="target"
              value={adTarget}
              type="radio"
              checked={target === adTarget}
              onChange={() => setTarget(adTarget)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="budget" className="mb-2 block text-sm font-medium">
          {t("sales.budgetLabel", language, { min: AD_BUDGET_MINIMUM.toLocaleString("ar") })}
        </label>
        <input
          id="budget"
          name="budget"
          type="number"
          step={1}
          inputMode="numeric"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
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
        disabled={isPending || !target || budget === ""}
        className="w-full rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 disabled:opacity-50 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {isPending ? t("sales.launching", language) : t("sales.launchButton", language)}
      </button>
    </form>
  );
}
