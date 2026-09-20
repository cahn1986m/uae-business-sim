import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  getCurrentStage,
  getMarketResearchCredit,
  getMarketResearchResults,
  getFinancingDecision,
  getDaysConsumed,
  getCurrentCapital,
  getLicensingResult,
  getRentNegotiation,
  getRentResult,
  getRentSpaceSize,
  getEquipmentResult,
  getHiringDecision,
  getEquipmentSetup,
  getRawMaterialInventory,
  getProductionCycles,
  getSalesTransactions,
  getBonusUnits,
  applyLocationBonusIfNeeded,
  getSalesEmployeeHired,
  getAdCampaigns,
  getPendingReceivables,
  getSaleUnitCost,
  getLocationBonusResults,
  consumeAndClearResignationNotices,
} from "@/lib/db";
import { getStageById, TOTAL_STAGES } from "@/lib/game-stages";
import type { MarketResearchResults } from "@/lib/market-research";
import type { LicensingResult } from "@/lib/licensing";
import type { NegotiationResult, RentResult, RentSpaceSize } from "@/lib/rent";
import type { EquipmentResult } from "@/lib/equipment";
import type { HiringDecision } from "@/lib/hiring";
import { getProductionCapacity, type ProductionCycle } from "@/lib/production";
import {
  getAvailableUnits,
  isBoutiqueTraderUnlocked,
  type LocationBonusResult,
  type AdCampaign,
  type SalesTransaction,
} from "@/lib/sales";
import { advanceStage, restartGame } from "./actions";
import MarketResearchStage from "./MarketResearchStage";
import FinancingStage from "./FinancingStage";
import FinancingCountdown from "./FinancingCountdown";
import LicensingStage from "./LicensingStage";
import RentStage from "./RentStage";
import EquipmentStage from "./EquipmentStage";
import HiringStage from "./HiringStage";
import ProductionStage from "./ProductionStage";
import SalesStage from "./SalesStage";
import ResultStage from "./ResultStage";

// المرحلة الحالية تُقرا من قاعدة البيانات بكل مرة — لازم رندر ديناميكي.
export const dynamic = "force-dynamic";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;
const LICENSING_STAGE_ID = 4;
const RENT_STAGE_ID = 5;
const EQUIPMENT_STAGE_ID = 6;
const HIRING_STAGE_ID = 7;
const PRODUCTION_STAGE_ID = 8;
const SALES_STAGE_ID = 9;
const RESULT_STAGE_ID = 10;

export default async function GamePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const currentStage = await getCurrentStage(session.user.id);
  const stage = getStageById(currentStage);

  // إشعارات استقالة مبكرة (كيميائي/محاسب، تصحيح الأرقام الحقيقية) —
  // تُقرا وتُصفَّر بنفس اللحظة (مرة وحدة بس)، تُعرض عند أول زيارة تالية
  // لأي شاشة بغض النظر عن المرحلة الحالية.
  const resignationNotices = await consumeAndClearResignationNotices(session.user.id);
  const isLastStage = currentStage >= TOTAL_STAGES;
  const isMarketResearchStage = currentStage === MARKET_RESEARCH_STAGE_ID;
  const isFinancingStage = currentStage === FINANCING_STAGE_ID;
  const isLicensingStage = currentStage === LICENSING_STAGE_ID;
  const isRentStage = currentStage === RENT_STAGE_ID;
  const isEquipmentStage = currentStage === EQUIPMENT_STAGE_ID;
  const isHiringStage = currentStage === HIRING_STAGE_ID;
  const isProductionStage = currentStage === PRODUCTION_STAGE_ID;
  const isSalesStage = currentStage === SALES_STAGE_ID;
  const isResultStage = currentStage === RESULT_STAGE_ID;

  // عرض مهلة الأداء + currentCapital (بعد ما يتأكّد قرار التمويل) لازم
  // يظهر بكل شاشات اللعبة التالية، مو بس مرحلة 3 — فبنجيبهم دايماً بغض
  // النظر شو المرحلة. الرقم محاكاة (daysConsumed) مو وقت حقيقي — ثابت
  // لحد ما يتغيّر daysConsumed فعلياً بقاعدة البيانات. currentCapital
  // بيتهيّأ (lazy) من startingCapital أول مرة نحتاجه هون لو لسا ما
  // اتهيّأ (نفس آلية getCurrentCapital الموجودة أصلاً لمرحلة الترخيص).
  const financingDecision = await getFinancingDecision(session.user.id);
  const daysConsumed = financingDecision ? await getDaysConsumed(session.user.id) : 0;
  const currentCapitalForHud = financingDecision ? await getCurrentCapital(session.user.id) : 0;
  const remainingDays = financingDecision
    ? Math.max(financingDecision.financingDeadlineDays - daysConsumed, 0)
    : null;
  const isOverdue = financingDecision ? daysConsumed > financingDecision.financingDeadlineDays : false;

  // مبالغ معلّقة (تسهيلات تجار الجملة، الجزء ج) — تُجمع وتُعرض بالشريط
  // الدائم مهما كانت المرحلة الحالية، بنفس منطق currentCapital/الأيام
  // فوق؛ بترجع [] طبيعياً بالمراحل يلي قبل البيع.
  const pendingReceivables = financingDecision ? await getPendingReceivables(session.user.id) : [];
  const pendingReceivablesTotal = pendingReceivables
    .filter((r) => !r.collected)
    .reduce((sum, r) => sum + r.amount, 0);

  // بمرحلة دراسة السوق تحديداً: لازم اللاعب يأكّد قرار الشراء (حتى لو
  // قرار "ما بشتري شي") قبل ما يقدر يكمّل — ما بنعرض زر "التالي" إلا
  // بعد التأكيد.
  let marketResearchCredit: number | null = null;
  let marketResearchResults: MarketResearchResults | null = null;
  let licensingResult: LicensingResult | null = null;
  let rentNegotiation: NegotiationResult | null = null;
  let rentResult: RentResult | null = null;
  let equipmentSpaceSize: RentSpaceSize | null = null;
  let equipmentResult: EquipmentResult | null = null;
  let hiringDecision: HiringDecision | null = null;
  let productionCapacity = 0;
  let rawMaterialInventory = 0;
  let productionCycles: ProductionCycle[] = [];
  let availableSmallUnits = 0;
  let availableLargeUnits = 0;
  let boutiqueUnlocked = false;
  let locationBonusResults: LocationBonusResult[] = [];
  let salesEmployeeHired = false;
  let adCampaigns: AdCampaign[] = [];
  let salesTransactions: SalesTransaction[] = [];
  let saleUnitCost: number | null = null;
  let canAdvance =
    !isMarketResearchStage &&
    !isFinancingStage &&
    !isLicensingStage &&
    !isRentStage &&
    !isEquipmentStage &&
    !isHiringStage &&
    !isProductionStage &&
    !isSalesStage;

  if (isMarketResearchStage) {
    [marketResearchCredit, marketResearchResults] = await Promise.all([
      getMarketResearchCredit(session.user.id),
      getMarketResearchResults(session.user.id),
    ]);
    canAdvance = marketResearchResults?.confirmed === true;
  }

  if (isFinancingStage) {
    canAdvance = financingDecision !== null;
  }

  if (isLicensingStage) {
    // currentCapital اتهيّأ (lazy) فوق أصلاً — بشريط الحالة الدائم، يلي
    // بيظهر بكل شاشة فيها قرار تمويل، بما فيها هاي.
    licensingResult = await getLicensingResult(session.user.id);
    canAdvance = licensingResult !== null;
  }

  if (isRentStage) {
    [rentNegotiation, rentResult] = await Promise.all([
      getRentNegotiation(session.user.id),
      getRentResult(session.user.id),
    ]);
    canAdvance = rentResult !== null;
  }

  if (isEquipmentStage) {
    [equipmentSpaceSize, equipmentResult] = await Promise.all([
      getRentSpaceSize(session.user.id),
      getEquipmentResult(session.user.id),
    ]);
    canAdvance = equipmentResult !== null;
  }

  if (isHiringStage) {
    hiringDecision = await getHiringDecision(session.user.id);
    canAdvance = hiringDecision !== null;
  }

  if (isProductionStage) {
    const [equipmentSetup, inventory, cycles] = await Promise.all([
      getEquipmentSetup(session.user.id),
      getRawMaterialInventory(session.user.id),
      getProductionCycles(session.user.id),
    ]);
    productionCapacity = equipmentSetup
      ? getProductionCapacity(equipmentSetup.equipmentType, equipmentSetup.workerCount)
      : 0;
    rawMaterialInventory = inventory;
    productionCycles = cycles;
    canAdvance = productionCycles.length > 0;
  }

  if (isSalesStage) {
    // أثر الموقع تلقائي، مرة وحدة بس عند أول دخول — الدالة نفسها
    // محروسة سيرفر-سايد (WHERE locationBonusApplied=false)، فاستدعاؤها
    // هون بكل تحميل صفحة آمن: أول مرة بتطبّق فعلياً، بعدها بترجع نفس
    // النتائج المخزّنة بدون أي حساب أو تأثير جديد. **لازم تُستنى لحالها
    // أولاً** قبل قراءة bonusUnits — وإلا سباق حقيقي ممكن يقرا القيم
    // القديمة (قبل التطبيق) لو صارت بالتوازي بنفس Promise.all.
    const results = await applyLocationBonusIfNeeded(session.user.id);

    const [cycles, transactions, bonusUnitsResult, employeeHired, campaigns] = await Promise.all([
      getProductionCycles(session.user.id),
      getSalesTransactions(session.user.id),
      getBonusUnits(session.user.id),
      getSalesEmployeeHired(session.user.id),
      getAdCampaigns(session.user.id),
    ]);
    const available = getAvailableUnits(
      cycles,
      transactions,
      bonusUnitsResult.bonusSmallUnits,
      bonusUnitsResult.bonusLargeUnits
    );
    availableSmallUnits = available.availableSmallUnits;
    availableLargeUnits = available.availableLargeUnits;
    boutiqueUnlocked = isBoutiqueTraderUnlocked(cycles);
    locationBonusResults = results;
    salesEmployeeHired = employeeHired;
    adCampaigns = campaigns;
    canAdvance = transactions.length > 0;
  }

  if (isResultStage) {
    // قراءة بحت لكل ما تخزّن عبر المراحل 1-9 — بدون أي منطق لعب جديد
    // أو تعديل، تجميع فقط بتقرير واحد نهائي (مرحلة 10، الأخيرة).
    const [
      marketResearch,
      licensing,
      rent,
      equipment,
      hiring,
      cycles,
      transactions,
      unitCost,
      employeeHired,
      campaigns,
      locBonusResults,
    ] = await Promise.all([
      getMarketResearchResults(session.user.id),
      getLicensingResult(session.user.id),
      getRentResult(session.user.id),
      getEquipmentResult(session.user.id),
      getHiringDecision(session.user.id),
      getProductionCycles(session.user.id),
      getSalesTransactions(session.user.id),
      getSaleUnitCost(session.user.id),
      getSalesEmployeeHired(session.user.id),
      getAdCampaigns(session.user.id),
      getLocationBonusResults(session.user.id),
    ]);
    marketResearchResults = marketResearch;
    licensingResult = licensing;
    rentResult = rent;
    equipmentResult = equipment;
    hiringDecision = hiring;
    productionCycles = cycles;
    salesTransactions = transactions;
    saleUnitCost = unitCost;
    salesEmployeeHired = employeeHired;
    adCampaigns = campaigns;
    locationBonusResults = locBonusResults;
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {resignationNotices.length > 0 && (
        <div className="w-full max-w-md space-y-1 rounded-md border border-red-300 bg-red-50 px-4 py-2 text-sm text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {resignationNotices.map((notice, i) => (
            <p key={i}>⚠️ {notice}</p>
          ))}
        </div>
      )}

      {financingDecision && remainingDays !== null && (
        <FinancingCountdown
          remainingDays={remainingDays}
          totalDays={financingDecision.financingDeadlineDays}
          currentCapital={currentCapitalForHud}
          isOverdue={isOverdue}
          investorEquityPercent={financingDecision.investorEquityPercent}
          pendingReceivablesTotal={pendingReceivablesTotal}
        />
      )}

      <p className="text-sm text-zinc-500">
        مرحلة {currentStage} من {TOTAL_STAGES}
      </p>

      <h1 className="text-2xl font-semibold">{stage.title}</h1>
      <p className="max-w-md text-sm text-zinc-500">{stage.description}</p>

      {isMarketResearchStage && marketResearchCredit !== null && (
        <MarketResearchStage credit={marketResearchCredit} results={marketResearchResults} />
      )}

      {isFinancingStage && <FinancingStage decision={financingDecision} />}

      {isLicensingStage && <LicensingStage result={licensingResult} />}

      {isRentStage && <RentStage negotiation={rentNegotiation} result={rentResult} />}

      {isEquipmentStage && equipmentSpaceSize !== null && (
        <EquipmentStage spaceSize={equipmentSpaceSize} result={equipmentResult} />
      )}

      {isHiringStage && <HiringStage decision={hiringDecision} />}

      {isProductionStage && (
        <ProductionStage
          capacity={productionCapacity}
          rawMaterialInventory={rawMaterialInventory}
          cycles={productionCycles}
        />
      )}

      {isSalesStage && (
        <SalesStage
          availableSmallUnits={availableSmallUnits}
          availableLargeUnits={availableLargeUnits}
          boutiqueUnlocked={boutiqueUnlocked}
          locationBonusResults={locationBonusResults}
          salesEmployeeHired={salesEmployeeHired}
          adCampaigns={adCampaigns}
        />
      )}

      {isResultStage && financingDecision && licensingResult && rentResult && equipmentResult && hiringDecision && saleUnitCost !== null && (
        <ResultStage
          currentCapital={currentCapitalForHud}
          pendingReceivables={pendingReceivables}
          startingCapital={financingDecision.startingCapital}
          marketResearchResults={marketResearchResults}
          locationBonusResults={locationBonusResults}
          financingDecision={financingDecision}
          daysConsumed={daysConsumed}
          licensingResult={licensingResult}
          rentResult={rentResult}
          equipmentResult={equipmentResult}
          hiringDecision={hiringDecision}
          productionCycles={productionCycles}
          salesTransactions={salesTransactions}
          saleUnitCost={saleUnitCost}
          salesEmployeeHired={salesEmployeeHired}
          adCampaigns={adCampaigns}
        />
      )}

      {isLastStage ? (
        <p className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium dark:bg-zinc-900">
          انتهت الجولة 🎉
        </p>
      ) : (
        canAdvance && (
          <form action={advanceStage}>
            <button
              type="submit"
              className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
            >
              التالي
            </button>
          </form>
        )
      )}

      <form action={restartGame}>
        <button
          type="submit"
          className="text-xs text-zinc-400 underline hover:text-zinc-600 dark:hover:text-zinc-300"
        >
          إعادة البدء (للتجربة أثناء البناء فقط)
        </button>
      </form>
    </div>
  );
}
