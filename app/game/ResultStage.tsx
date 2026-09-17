import type { MarketResearchResults } from "@/lib/market-research";
import { MARKET_RESEARCH_SERVICES } from "@/lib/market-research";
import type { FinancingDecision } from "@/lib/financing";
import type { LicensingResult, LicensingPath } from "@/lib/licensing";
import type { RentResult } from "@/lib/rent";
import { getRentOption } from "@/lib/rent";
import type { EquipmentResult } from "@/lib/equipment";
import { getEquipmentOption } from "@/lib/equipment";
import type { HiringDecision, ExperienceLevel } from "@/lib/hiring";
import type { ProductionCycle } from "@/lib/production";
import {
  CHANNEL_LABELS,
  WHOLESALE_PAYMENT_LABELS,
  AD_TARGET_LABELS,
  type SalesTransaction,
  type AdCampaign,
  type LocationBonusResult,
  type PendingReceivable,
} from "@/lib/sales";
import {
  computeFinalNetWorth,
  getVerdict,
  getFinancingTierKey,
  summarizeWholesalePayments,
  sumRevenueByChannel,
  computeTotalCommissionPaid,
  countChemistErrors,
  sumFinalProducedUnits,
} from "@/lib/results";

const LICENSING_PATH_LABELS: Record<LicensingPath, string> = {
  agency: "شركة/وكيل تراخيص",
  self: "ترخيص بنفسك",
};

const EXPERIENCE_LABELS: Record<Exclude<ExperienceLevel, null>, string> = {
  junior: "جونيور",
  senior: "سينيور",
};

const FINANCING_TIER_LABELS: Record<string, string> = {
  limited: "رأس مال محدود (بنك)",
  medium: "رأس مال متوسط (بنك+ملائكة)",
  comfortable: "رأس مال مريح (ملائكة)",
};

/**
 * مرحلة "النتيجة" (المرحلة 10، الأخيرة) — تقرير قراءة بحت، بدون أي
 * منطق لعب جديد. كل رقم/جملة هون مبني من حقول فعلية مخزَّنة لهالحساب
 * تحديداً (مُجمَّعة عبر `lib/results.ts`)، مافي أي نص عام ثابت.
 */
export default function ResultStage({
  currentCapital,
  pendingReceivables,
  startingCapital,
  marketResearchResults,
  locationBonusResults,
  financingDecision,
  daysConsumed,
  licensingResult,
  rentResult,
  equipmentResult,
  hiringDecision,
  productionCycles,
  salesTransactions,
  saleUnitCost,
  salesEmployeeHired,
  adCampaigns,
}: {
  currentCapital: number;
  pendingReceivables: PendingReceivable[];
  startingCapital: number;
  marketResearchResults: MarketResearchResults | null;
  locationBonusResults: LocationBonusResult[];
  financingDecision: FinancingDecision;
  daysConsumed: number;
  licensingResult: LicensingResult;
  rentResult: RentResult;
  equipmentResult: EquipmentResult;
  hiringDecision: HiringDecision;
  productionCycles: ProductionCycle[];
  salesTransactions: SalesTransaction[];
  saleUnitCost: number;
  salesEmployeeHired: boolean;
  adCampaigns: AdCampaign[];
}) {
  const pendingReceivablesTotal = pendingReceivables
    .filter((r) => !r.collected)
    .reduce((sum, r) => sum + r.amount, 0);
  const finalNetWorth = computeFinalNetWorth(currentCapital, pendingReceivables);
  const verdict = getVerdict(finalNetWorth, startingCapital);
  const difference = finalNetWorth - startingCapital;

  const tierKey = getFinancingTierKey(financingDecision);
  const isOverdue = daysConsumed > financingDecision.financingDeadlineDays;

  const rentOption = getRentOption(rentResult.rentId);
  const equipmentOption = getEquipmentOption(equipmentResult.equipmentType);

  const chemistErrorCount = countChemistErrors(productionCycles);
  const totalFinalProducedUnits = sumFinalProducedUnits(productionCycles);

  const channelRevenue = sumRevenueByChannel(salesTransactions);
  const wholesalePayments = summarizeWholesalePayments(salesTransactions, saleUnitCost);
  const totalCommissionPaid = computeTotalCommissionPaid(salesTransactions);

  return (
    <div className="w-full max-w-md space-y-6 text-right">
      {/* 1) النتيجة النهائية */}
      <div className="space-y-2 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p
          className={`text-lg font-bold ${
            verdict === "نجحت"
              ? "text-emerald-600 dark:text-emerald-400"
              : "text-red-600 dark:text-red-400"
          }`}
        >
          {verdict === "نجحت" ? "🎉 نجحت بالمشروع" : "📉 خسرت بالمشروع"}
        </p>
        <p className="text-sm">رأس المال الأصلي: {startingCapital.toLocaleString("ar")} درهم</p>
        <p className="text-sm">
          الوضع النهائي (صافي الثروة): {finalNetWorth.toLocaleString("ar")} درهم
          {pendingReceivablesTotal > 0 && (
            <span className="text-xs text-zinc-500">
              {" "}
              (يشمل {pendingReceivablesTotal.toLocaleString("ar")} درهم مبالغ لسا بالطريق — تسهيلات لم تُحصَّل بعد)
            </span>
          )}
        </p>
        <p className={`text-sm font-medium ${difference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {difference >= 0 ? "ربح صافي" : "خسارة صافية"}: {Math.abs(difference).toLocaleString("ar")} درهم
        </p>
      </div>

      {/* دراسة السوق */}
      {marketResearchResults && marketResearchResults.purchased.length > 0 && (
        <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm font-semibold">دراسة السوق</p>
          {marketResearchResults.purchased.map((key) => {
            const service = MARKET_RESEARCH_SERVICES.find((s) => s.key === key);
            let resultText: string | null = null;
            if (key === "feasibility" || key === "consultants") {
              resultText = marketResearchResults.outcomes[key]?.message ?? null;
            } else if (key === "hotel5star") {
              resultText = locationBonusResults.find((r) => r.type === "hotel-5star")?.message ?? "لم يُستخدم بعد بمرحلة البيع.";
            } else if (key === "hotel2star") {
              resultText = locationBonusResults.find((r) => r.type === "hotel-2star")?.message ?? "لم يُستخدم بعد بمرحلة البيع.";
            }
            return (
              <p key={key} className="text-xs text-zinc-600 dark:text-zinc-400">
                {service?.label ?? key}: {resultText ?? "—"}
              </p>
            );
          })}
        </div>
      )}

      {/* التمويل */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">التمويل</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          المستوى: {tierKey ? FINANCING_TIER_LABELS[tierKey] : "غير معروف"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          رأس المال: {financingDecision.startingCapital.toLocaleString("ar")} درهم — حصة المستثمر:{" "}
          {financingDecision.investorEquityPercent}%
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          مهلة الأداء: {financingDecision.financingDeadlineDays} يوم — الأيام المستهلكة فعلياً: {daysConsumed}
        </p>
        <p
          className={`text-xs ${isOverdue ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {isOverdue ? "تجاوزت المهلة المحددة." : "ضمن المهلة المحددة."}
        </p>
      </div>

      {/* الترخيص */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">الترخيص</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          المسار: {LICENSING_PATH_LABELS[licensingResult.path]} — التكلفة الكلية:{" "}
          {licensingResult.totalCost.toLocaleString("ar")} درهم — المدة: {licensingResult.totalDays} يوم
        </p>
        {licensingResult.path === "self" && (
          <>
            {licensingResult.events && licensingResult.events.length > 0 ? (
              licensingResult.events.map((e) => (
                <p key={e.key} className="text-xs text-zinc-600 dark:text-zinc-400">
                  مفاجأة: {e.label} — تكلفة إضافية {e.extraCost.toLocaleString("ar")} درهم، +{e.extraDays} يوم
                </p>
              ))
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">لم تحصل أي مفاجآت.</p>
            )}
          </>
        )}
      </div>

      {/* الإيجار */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">المكان والإيجار</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          الخيار: {rentOption?.label ?? rentResult.rentId} — السعر النهائي: {rentResult.finalPrice.toLocaleString("ar")} درهم
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          التفاوض: {rentResult.negotiationUsed ? (rentResult.negotiationSuccess ? `نجح (خصم ${rentResult.discountPercent}%)` : "فشل") : "لم يُستخدم"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          طريقة الدفع: {rentResult.paymentMethod === "cash" ? "كاش كامل" : "تقسيط"}
        </p>
      </div>

      {/* المعدات والتوظيف */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">المعدات والتوظيف</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          المعدات: {equipmentOption?.label ?? equipmentResult.equipmentType} — عدد العمال: {equipmentResult.workerCount}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          الكيميائي: {hiringDecision.chemistHired
            ? `موظّف (${EXPERIENCE_LABELS[hiringDecision.chemistExperience as Exclude<ExperienceLevel, null>]})`
            : "غير موظّف"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          المحاسب: {hiringDecision.accountantHired
            ? `موظّف (${EXPERIENCE_LABELS[hiringDecision.accountantExperience as Exclude<ExperienceLevel, null>]})`
            : "غير موظّف"}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          أخطاء كيميائية فعلية عبر كل دورات الإنتاج: {chemistErrorCount.toLocaleString("ar")}
        </p>
      </div>

      {/* الإنتاج */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">الإنتاج</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          عدد دورات الإنتاج: {productionCycles.length.toLocaleString("ar")} — إجمالي الوحدات المنتَجة فعلياً:{" "}
          {totalFinalProducedUnits.toLocaleString("ar")}
        </p>
      </div>

      {/* البيع */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">البيع</p>
        {(Object.keys(channelRevenue) as (keyof typeof channelRevenue)[]).map((channel) => (
          <p key={channel} className="text-xs text-zinc-600 dark:text-zinc-400">
            {CHANNEL_LABELS[channel]}: {channelRevenue[channel].toLocaleString("ar")} درهم
          </p>
        ))}
        {wholesalePayments.length > 0 && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            تفصيل تجار الجملة حسب طريقة الدفع:{" "}
            {wholesalePayments
              .map((p) => `${WHOLESALE_PAYMENT_LABELS[p.method]} (${p.count.toLocaleString("ar")} عملية، ${p.totalRevenue.toLocaleString("ar")} درهم)`)
              .join(" — ")}
          </p>
        )}
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          موظف مبيعات: {salesEmployeeHired ? `موظّف — إجمالي عمولة مدفوعة ${totalCommissionPaid.toLocaleString("ar")} درهم` : "غير موظّف"}
        </p>
        {adCampaigns.length > 0 ? (
          adCampaigns.map((c) => (
            <p key={c.campaignNumber} className="text-xs text-zinc-600 dark:text-zinc-400">
              حملة #{c.campaignNumber} ({AD_TARGET_LABELS[c.target]}، ميزانية {c.budget.toLocaleString("ar")} درهم): ربحت{" "}
              {c.bonusUnits.toLocaleString("ar")} وحدة عبر {CHANNEL_LABELS[c.wonChannel]}
            </p>
          ))
        ) : (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">لم تُشغَّل أي حملة إعلانية.</p>
        )}
      </div>
    </div>
  );
}
