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
  CHANNEL_LABELS,
  CHANNEL_MARGIN,
  SALES_EMPLOYEE_COMMISSION_RATE,
  AD_TARGET_LABELS,
  AD_BUDGET_MINIMUM,
  type SalesChannel,
  type LocationBonusResult,
  type AdCampaign,
  type AdTarget,
} from "@/lib/sales";

const CHANNELS: SalesChannel[] = ["discount-market", "wholesaler", "boutique-trader"];
const AD_TARGETS: AdTarget[] = ["premium", "wholesale", "discount"];

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
}: {
  availableSmallUnits: number;
  availableLargeUnits: number;
  boutiqueUnlocked: boolean;
  locationBonusResults: LocationBonusResult[];
  salesEmployeeHired: boolean;
  adCampaigns: AdCampaign[];
}) {
  return (
    <div className="w-full max-w-md space-y-6">
      {locationBonusResults.length > 0 && (
        <div className="space-y-2 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
          <p className="text-sm font-semibold">أثر الموقع عند دخولك المرحلة</p>
          {locationBonusResults.map((r, i) => (
            <p
              key={i}
              className={`text-xs ${r.success ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}
            >
              {r.message}
            </p>
          ))}
        </div>
      )}

      <SalesEmployeeSection hired={salesEmployeeHired} />

      <SaleForm
        availableSmallUnits={availableSmallUnits}
        availableLargeUnits={availableLargeUnits}
        boutiqueUnlocked={boutiqueUnlocked}
        salesEmployeeHired={salesEmployeeHired}
      />

      <AdCampaignSection campaigns={adCampaigns} />
    </div>
  );
}

function SalesEmployeeSection({ hired }: { hired: boolean }) {
  if (hired) {
    return (
      <div className="rounded-md border border-zinc-200 p-4 text-right text-sm dark:border-zinc-800">
        موظف مبيعات موظّف — عمولته {Math.round(SALES_EMPLOYEE_COMMISSION_RATE * 100)}% على كل عملية بيع
      </div>
    );
  }

  return (
    <form action={hireSalesEmployee} className="rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
      <p className="text-sm font-medium">موظف مبيعات</p>
      <p className="mt-1 text-xs text-zinc-500">
        بونص فوري: +30 وحدة (أسواق/جملة) و+15 وحدة (تجار صغار) — مقابل عمولة{" "}
        {Math.round(SALES_EMPLOYEE_COMMISSION_RATE * 100)}% على كل عملية بيع تالية
      </p>
      <button
        type="submit"
        className="mt-3 w-full rounded-md bg-zinc-900 px-5 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        توظيف موظف مبيعات
      </button>
    </form>
  );
}

function SaleForm({
  availableSmallUnits,
  availableLargeUnits,
  boutiqueUnlocked,
  salesEmployeeHired,
}: {
  availableSmallUnits: number;
  availableLargeUnits: number;
  boutiqueUnlocked: boolean;
  salesEmployeeHired: boolean;
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
    <form action={formAction} className="space-y-4">
      <p className="text-sm font-semibold">بيع</p>

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
                {salesEmployeeHired && " — السعر بعد خصم عمولة الموظف"}
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

function AdCampaignSection({ campaigns }: { campaigns: AdCampaign[] }) {
  const [state, formAction, isPending] = useActionState<AdCampaignFormState, FormData>(
    confirmAdCampaign,
    null
  );

  const [target, setTarget] = useState<AdTarget | "">("");
  const [budget, setBudget] = useState("");

  return (
    <form action={formAction} className="space-y-3 rounded-md border border-zinc-200 p-4 text-right dark:border-zinc-800">
      <p className="text-sm font-semibold">حملة إعلانية ({campaigns.length.toLocaleString("ar")} حملة سابقة)</p>

      {state && "wonChannel" in state && (
        <p className="rounded-md bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300">
          الحملة ربحت {state.bonusUnits.toLocaleString("ar")} وحدة عبر {CHANNEL_LABELS[state.wonChannel]}
        </p>
      )}

      <div className="space-y-2">
        {AD_TARGETS.map((t) => (
          <label key={t} htmlFor={`ad_target_${t}`} className="flex items-center justify-between text-sm">
            <span>{AD_TARGET_LABELS[t]}</span>
            <input
              id={`ad_target_${t}`}
              name="target"
              value={t}
              type="radio"
              checked={target === t}
              onChange={() => setTarget(t)}
              className="h-4 w-4"
            />
          </label>
        ))}
      </div>

      <div>
        <label htmlFor="budget" className="mb-2 block text-sm font-medium">
          الميزانية (حد أدنى {AD_BUDGET_MINIMUM.toLocaleString("ar")})
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
        {isPending ? "جاري الإطلاق..." : "إطلاق حملة إعلانية"}
      </button>
    </form>
  );
}
