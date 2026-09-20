import type { MarketResearchResults } from "@/lib/market-research";
import { MARKET_RESEARCH_SERVICES } from "@/lib/market-research";
import type { FinancingDecision } from "@/lib/financing";
import type { LicensingResult } from "@/lib/licensing";
import type { RentResult } from "@/lib/rent";
import { getRentOption } from "@/lib/rent";
import type { EquipmentResult } from "@/lib/equipment";
import { getEquipmentOption } from "@/lib/equipment";
import type { HiringDecision, ExperienceLevel } from "@/lib/hiring";
import type { ProductionCycle } from "@/lib/production";
import {
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
import { t, type Language } from "@/lib/i18n";

/**
 * مرحلة "النتيجة" (المرحلة 10، الأخيرة) — تقرير قراءة بحت، بدون أي
 * منطق لعب جديد. كل رقم/جملة هون مبني من حقول فعلية مخزَّنة لهالحساب
 * تحديداً (مُجمَّعة عبر `lib/results.ts`)، مافي أي نص عام ثابت. النصوص
 * الديناميكية المخزَّنة (رسائل دراسة السوق/الترخيص/الموقع) تبقى عربية
 * دايماً — الترجمة هون للعناوين والتسميات الثابتة بس (الجزء أ من ميزة
 * اللغة).
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
  language,
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
  language: Language;
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
          {verdict === "نجحت" ? t("result.success", language) : t("result.failure", language)}
        </p>
        <p className="text-sm">{t("result.startingCapital", language, { amount: startingCapital.toLocaleString("ar") })}</p>
        <p className="text-sm">
          {t("result.finalNetWorth", language, { amount: finalNetWorth.toLocaleString("ar") })}
          {pendingReceivablesTotal > 0 && (
            <span className="text-xs text-zinc-500">
              {t("result.pendingNote", language, { amount: pendingReceivablesTotal.toLocaleString("ar") })}
            </span>
          )}
        </p>
        <p className={`text-sm font-medium ${difference >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"}`}>
          {difference >= 0 ? t("result.netProfit", language) : t("result.netLoss", language)}: {Math.abs(difference).toLocaleString("ar")} {language === "ar" ? "درهم" : "AED"}
        </p>
      </div>

      {/* دراسة السوق */}
      {marketResearchResults && marketResearchResults.purchased.length > 0 && (
        <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
          <p className="text-sm font-semibold">{t("result.marketResearchTitle", language)}</p>
          {marketResearchResults.purchased.map((key) => {
            const service = MARKET_RESEARCH_SERVICES.find((s) => s.key === key);
            let resultText: string | null = null;
            if (key === "feasibility" || key === "consultants") {
              const outcome = marketResearchResults.outcomes[key] as
                | { success: boolean; code?: string; message?: string }
                | undefined;
              resultText = outcome?.code ? t(outcome.code, language) : (outcome?.message ?? null);
            } else if (key === "hotel5star") {
              resultText = locationBonusResults.find((r) => r.type === "hotel-5star")?.message ?? t("result.notUsedYet", language);
            } else if (key === "hotel2star") {
              resultText = locationBonusResults.find((r) => r.type === "hotel-2star")?.message ?? t("result.notUsedYet", language);
            }
            return (
              <p key={key} className="text-xs text-zinc-600 dark:text-zinc-400">
                {service ? t(`marketResearch.service.${key}`, language) : key}: {resultText ?? "—"}
              </p>
            );
          })}
        </div>
      )}

      {/* التمويل */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.financingTitle", language)}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.levelLabel", language, {
            level: tierKey ? t(`financing.tier.${tierKey}`, language) : t("result.unknownLevel", language),
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.capitalShare", language, {
            amount: financingDecision.startingCapital.toLocaleString("ar"),
            percent: financingDecision.investorEquityPercent,
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.deadlineLine", language, {
            days: financingDecision.financingDeadlineDays,
            consumed: daysConsumed,
          })}
        </p>
        <p
          className={`text-xs ${isOverdue ? "text-red-600 dark:text-red-400" : "text-emerald-600 dark:text-emerald-400"}`}
        >
          {isOverdue ? t("result.overdue", language) : t("result.withinDeadline", language)}
        </p>
      </div>

      {/* الترخيص */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.licensingTitle", language)}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.pathCostLine", language, {
            path: t(`licensing.path.${licensingResult.path}`, language),
            cost: licensingResult.totalCost.toLocaleString("ar"),
            days: licensingResult.totalDays,
          })}
        </p>
        {licensingResult.path === "self" && (
          <>
            {licensingResult.events && licensingResult.events.length > 0 ? (
              licensingResult.events.map((e) => (
                <p key={e.key} className="text-xs text-zinc-600 dark:text-zinc-400">
                  {t("result.surpriseLine", language, {
                    label: (e as { code?: string; label?: string }).code
                      ? t((e as { code: string }).code, language)
                      : ((e as { label?: string }).label ?? ""),
                    cost: e.extraCost.toLocaleString("ar"),
                    days: e.extraDays,
                  })}
                </p>
              ))
            ) : (
              <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("result.noSurprises", language)}</p>
            )}
          </>
        )}
      </div>

      {/* الإيجار */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.rentTitle", language)}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.rentOptionLine", language, {
            option: rentOption ? t(`rent.option.${rentOption.id}`, language) : rentResult.rentId,
            price: rentResult.finalPrice.toLocaleString("ar"),
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.negotiationLine", language, {
            status: rentResult.negotiationUsed
              ? rentResult.negotiationSuccess
                ? t("result.negotiationSucceeded", language, { percent: rentResult.discountPercent })
                : t("result.negotiationFailed", language)
              : t("result.negotiationNotUsed", language),
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.paymentMethodLine", language, {
            method: rentResult.paymentMethod === "cash" ? t("common.cashFull", language) : t("common.installments", language),
          })}
        </p>
      </div>

      {/* المعدات والتوظيف */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.equipmentTitle", language)}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.equipmentLine", language, {
            equipment: equipmentOption ? t(`equipment.option.${equipmentOption.type}`, language) : equipmentResult.equipmentType,
            count: equipmentResult.workerCount,
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.chemistLine", language, {
            status: hiringDecision.chemistHired
              ? t("result.hiredWithExperience", language, {
                  experience: t(`hiring.experience.${hiringDecision.chemistExperience as Exclude<ExperienceLevel, null>}`, language),
                })
              : t("result.notHired", language),
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.accountantLine", language, {
            status: hiringDecision.accountantHired
              ? t("result.hiredWithExperience", language, {
                  experience: t(`hiring.experience.${hiringDecision.accountantExperience as Exclude<ExperienceLevel, null>}`, language),
                })
              : t("result.notHired", language),
          })}
        </p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.chemistErrorsLine", language, { count: chemistErrorCount.toLocaleString("ar") })}
        </p>
      </div>

      {/* الإنتاج */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.productionTitle", language)}</p>
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.productionLine", language, {
            count: productionCycles.length.toLocaleString("ar"),
            units: totalFinalProducedUnits.toLocaleString("ar"),
          })}
        </p>
      </div>

      {/* البيع */}
      <div className="space-y-1 rounded-md border border-zinc-200 p-4 dark:border-zinc-800">
        <p className="text-sm font-semibold">{t("result.salesTitle", language)}</p>
        {(Object.keys(channelRevenue) as (keyof typeof channelRevenue)[]).map((channel) => (
          <p key={channel} className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("result.channelRevenueLine", language, {
              channel: t(`sales.channel.${channel}`, language),
              amount: channelRevenue[channel].toLocaleString("ar"),
            })}
          </p>
        ))}
        {wholesalePayments.length > 0 && (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">
            {t("result.wholesaleBreakdown", language)}
            {wholesalePayments
              .map((p) =>
                t("result.wholesaleBreakdownItem", language, {
                  method: t(`sales.payment.${p.method}`, language),
                  count: p.count.toLocaleString("ar"),
                  amount: p.totalRevenue.toLocaleString("ar"),
                })
              )
              .join(" — ")}
          </p>
        )}
        <p className="text-xs text-zinc-600 dark:text-zinc-400">
          {t("result.salesEmployeeLine", language, {
            status: salesEmployeeHired
              ? t("result.employedWithCommission", language, { amount: totalCommissionPaid.toLocaleString("ar") })
              : t("result.notHired", language),
          })}
        </p>
        {adCampaigns.length > 0 ? (
          adCampaigns.map((c) => (
            <p key={c.campaignNumber} className="text-xs text-zinc-600 dark:text-zinc-400">
              {t("result.campaignLine", language, {
                number: c.campaignNumber,
                target: t(`sales.adTarget.${c.target}`, language),
                budget: c.budget.toLocaleString("ar"),
                units: c.bonusUnits.toLocaleString("ar"),
                channel: t(`sales.channel.${c.wonChannel}`, language),
              })}
            </p>
          ))
        ) : (
          <p className="text-xs text-zinc-600 dark:text-zinc-400">{t("result.noCampaigns", language)}</p>
        )}
      </div>
    </div>
  );
}
