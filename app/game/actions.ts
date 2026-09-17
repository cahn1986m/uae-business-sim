"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/server";
import {
  getCurrentStage,
  setCurrentStage,
  getMarketResearchCredit,
  getMarketResearchResults,
  saveMarketResearchResults,
  resetMarketResearch,
  getFinancingDecision,
  saveFinancingDecision,
  resetFinancingDecision,
  getCurrentCapital,
  getLicensingResult,
  applyLicensingDecision,
  resetLicensing,
  getRentNegotiation,
  saveRentNegotiation,
  getRentResult,
  getRentFreeSetupDays,
  applyRentDecision,
  resetRent,
  getRentSpaceSize,
  getEquipmentResult,
  applyEquipmentDecision,
  resetEquipment,
  getHiringDecision,
  applyHiringDecision,
  resetHiring,
  getEquipmentSetup,
  getRawMaterialInventory,
  getProductionCycles,
  applyProductionCycle,
  resetProduction,
  consumeGameDays,
  getSalesTransactions,
  getSaleUnitCost,
  applySaleTransaction,
  resetSales,
} from "@/lib/db";
import { TOTAL_STAGES } from "@/lib/game-stages";
import {
  MARKET_RESEARCH_SERVICES,
  rollServiceOutcome,
  type HotelTier,
  type MarketResearchResults,
  type MarketResearchServiceKey,
} from "@/lib/market-research";
import { getFinancingTier, type FinancingDecision } from "@/lib/financing";
import {
  AGENCY_COST,
  AGENCY_DAYS,
  SELF_BASE_COST,
  SELF_BASE_DAYS,
  SELF_UNREADY_EXTRA_DAYS,
  rollSelfLicensingEvents,
  type LicensingPath,
  type LicensingResult,
} from "@/lib/licensing";
import {
  getRentOption,
  rollMissingServiceSurprises,
  MISSING_SERVICES_TOTAL,
  RENT_BASE_SETUP_DAYS,
  type NegotiationResult,
  type RentResult,
} from "@/lib/rent";
import { getEquipmentOption, SPACE_BUDGET, WORKER_MONTHLY_SALARY, type EquipmentResult } from "@/lib/equipment";
import { getHiringRole } from "@/lib/hiring";
import {
  SUPPLIER_PRICE_PER_UNIT,
  BULK_DISCOUNT_CAPACITY_MULTIPLIER,
  BULK_DISCOUNT_PERCENT,
  getProductionCapacity,
  computeProduction,
  PROCESSING_MODE_QUALITY,
  applyNaturalWaste,
  getChemistTier,
  rollChemistError,
  applyChemistErrorWaste,
  CHEMIST_ERROR_CONFIG,
  QC_COST,
  getProductionCycleDays,
  type ProductionCycle,
  type SupplierChoice,
  type ProcessingMode,
  type ProductLineType,
} from "@/lib/production";
import {
  computeUnitCost,
  getRevenuePerUnit,
  getAvailableUnits,
  isBoutiqueTraderUnlocked,
  type SalesChannel,
  type SalesTransaction,
} from "@/lib/sales";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;
const LICENSING_STAGE_ID = 4;
const RENT_STAGE_ID = 5;
const EQUIPMENT_STAGE_ID = 6;
const HIRING_STAGE_ID = 7;
const PRODUCTION_STAGE_ID = 8;
const SALES_STAGE_ID = 9;

async function requireUserId(): Promise<string> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    throw new Error("غير مسجل دخول");
  }
  return session.user.id;
}

/**
 * ينقل اللاعب للمرحلة التالية (يتوقف عند 10، ما يتخطاها). محمي كمان من
 * السيرفر (مو بس بإخفاء الزر بالواجهة) — ما يسمح يتخطى مرحلة دراسة
 * السوق قبل ما يأكّد قرار الشراء فعلياً (حتى لو القرار "ما بشتري شي").
 */
export async function advanceStage() {
  const userId = await requireUserId();
  const current = await getCurrentStage(userId);

  if (current === MARKET_RESEARCH_STAGE_ID) {
    const results = await getMarketResearchResults(userId);
    if (results?.confirmed !== true) {
      throw new Error("لازم تأكّد قرار دراسة السوق قبل ما تكمّل.");
    }
  }

  if (current === FINANCING_STAGE_ID) {
    const decision = await getFinancingDecision(userId);
    if (decision === null) {
      throw new Error("لازم تأكّد قرار التمويل قبل ما تكمّل.");
    }
  }

  if (current === LICENSING_STAGE_ID) {
    const result = await getLicensingResult(userId);
    if (result === null) {
      throw new Error("لازم تأكّد مسار ترخيص قبل ما تكمّل.");
    }
  }

  if (current === RENT_STAGE_ID) {
    const result = await getRentResult(userId);
    if (result === null) {
      throw new Error("لازم تأكّد خيار إيجار ودفع قبل ما تكمّل.");
    }
  }

  if (current === EQUIPMENT_STAGE_ID) {
    const result = await getEquipmentResult(userId);
    if (result === null) {
      throw new Error("لازم تأكّد نوع الخط وعدد العمال قبل ما تكمّل.");
    }
  }

  if (current === HIRING_STAGE_ID) {
    const decision = await getHiringDecision(userId);
    if (decision === null) {
      throw new Error("لازم تأكّد قرار التوظيف للدورين قبل ما تكمّل.");
    }
  }

  if (current === PRODUCTION_STAGE_ID) {
    const cycles = await getProductionCycles(userId);
    if (cycles.length < 1) {
      throw new Error("لازم تكمّل دورة إنتاج واحدة على الأقل قبل ما تكمّل.");
    }
  }

  if (current === SALES_STAGE_ID) {
    const transactions = await getSalesTransactions(userId);
    if (transactions.length < 1) {
      throw new Error("لازم تكمّل عملية بيع واحدة على الأقل قبل ما تكمّل.");
    }
  }

  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/**
 * إعادة البدء — يرجّع currentStage لـ1، وكمان يمسح تقدّم دراسة السوق
 * وقرار التمويل والترخيص والإيجار والمعدات والتوظيف والإنتاج والبيع
 * حتى تكون كل مرحلة جاهزة من الصفر بالجولة الجاية. للتجربة أثناء
 * البناء فقط.
 */
export async function restartGame() {
  const userId = await requireUserId();
  await setCurrentStage(userId, 1);
  await resetMarketResearch(userId);
  await resetFinancingDecision(userId);
  await resetLicensing(userId);
  // resetEquipment وresetHiring قبل resetRent مقصود: الاثنين بيفلتروا
  // monthlyObligations (يشيلوا بس عناصرهم الخاصة)، وresetRent بعدهم
  // بيمسح المصفوفة بالكامل — هيك الحالة النهائية بعد "إعادة البدء"
  // الكاملة ما فيها monthlyObligations إطلاقاً (مو مصفوفة فاضية
  // متروكة)، بدل ما يرجّعوا ينشئوها فاضية بعد ما resetRent يكون مسحها.
  await resetEquipment(userId);
  await resetHiring(userId);
  await resetRent(userId);
  await resetProduction(userId);
  await resetSales(userId);
  revalidatePath("/game");
}

export type MarketResearchFormState = { error: string } | null;

/**
 * يتأكد إن السلة صالحة (خدمات معروفة فقط، مجموع أسعارها ما يتخطى
 * الحد الأقصى)، ينفّذ الشراء دفعة وحدة: يحسب نتيجة فورية عشوائية
 * لدراسة الجدوى/الاستشاريين لو اتختارو، ويخزّن علم شبكة الفنادق بدون
 * نتيجة ظاهرة لو اتختارت. يخزّن كل شي مرة وحدة — بعدها القراءة بس.
 */
export async function confirmMarketResearchPurchase(
  _prevState: MarketResearchFormState,
  formData: FormData
): Promise<MarketResearchFormState> {
  const userId = await requireUserId();

  const validKeys = new Set(MARKET_RESEARCH_SERVICES.map((s) => s.key));
  const selected = [
    ...new Set(
      formData
        .getAll("services")
        .map(String)
        .filter((key): key is MarketResearchServiceKey => validKeys.has(key as MarketResearchServiceKey))
    ),
  ];

  const credit = await getMarketResearchCredit(userId);
  const total = MARKET_RESEARCH_SERVICES.filter((s) => selected.includes(s.key)).reduce(
    (sum, s) => sum + s.price,
    0
  );
  if (total > credit) {
    return { error: `مجموع الاختيارات (${total}) أكبر من الحد الأقصى (${credit}).` };
  }

  const outcomes: MarketResearchResults["outcomes"] = {};
  if (selected.includes("feasibility")) {
    outcomes.feasibility = rollServiceOutcome("feasibility");
  }
  if (selected.includes("consultants")) {
    outcomes.consultants = rollServiceOutcome("consultants");
  }

  const hotelConnection: HotelTier[] = [];
  if (selected.includes("hotel5star")) hotelConnection.push("5star");
  if (selected.includes("hotel2star")) hotelConnection.push("2star");

  const results: MarketResearchResults = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    purchased: selected,
    outcomes,
    ...(hotelConnection.length > 0 ? { hotelConnection } : {}),
  };

  await saveMarketResearchResults(userId, results);
  revalidatePath("/game");
  return null;
}

export type FinancingFormState = { error: string } | null;

/**
 * يتأكد إن اللاعب اختار مستوى تمويل معروف ورقم رأس مال ضمن نطاق نفس
 * المستوى (سيرفر-سايد، مو بس حدود الـinput بالواجهة)، ويخزّن قرار
 * التمويل مرة وحدة: startingCapital، investorEquityPercent الثابتة
 * حسب المستوى، financingStartedAt (توقيت التأكيد بالضبط)،
 * وfinancingDeadlineDays حسب المستوى.
 */
export async function confirmFinancingDecision(
  _prevState: FinancingFormState,
  formData: FormData
): Promise<FinancingFormState> {
  const userId = await requireUserId();

  const tierKey = String(formData.get("tier") ?? "");
  const tier = getFinancingTier(tierKey);
  if (!tier) {
    return { error: "لازم تختار مستوى تمويل." };
  }

  const rawAmount = formData.get(`amount_${tier.key}`);
  const amount = Number(rawAmount);
  if (
    rawAmount === null ||
    rawAmount === "" ||
    !Number.isFinite(amount) ||
    !Number.isInteger(amount) ||
    amount < tier.min ||
    amount > tier.max
  ) {
    return {
      error: `رأس المال لازم يكون رقم صحيح بين ${tier.min.toLocaleString("ar")} و${tier.max.toLocaleString("ar")}.`,
    };
  }

  const decision: FinancingDecision = {
    startingCapital: amount,
    investorEquityPercent: tier.investorEquityPercent,
    financingStartedAt: new Date().toISOString(),
    financingDeadlineDays: tier.deadlineDays,
  };

  await saveFinancingDecision(userId, decision);
  revalidatePath("/game");
  return null;
}

export type LicensingFormState = { error: string } | null;

/**
 * يتأكد إن اللاعب اختار مسار معروف، يحسب التكلفة والأيام الإجمالية
 * (بما فيها مفاجآت مسار "self" العشوائية — تُرمى هون مرة وحدة، ما
 * تُعاد لاحقاً)، يرفض سيرفر-سايد لو التكلفة أكبر من currentCapital
 * المتاح، وإلا يخصم ويستهلك ويخزّن النتيجة النهائية مرة وحدة.
 */
export async function confirmLicensingDecision(
  _prevState: LicensingFormState,
  formData: FormData
): Promise<LicensingFormState> {
  const userId = await requireUserId();

  const path = String(formData.get("path") ?? "") as LicensingPath | "";
  if (path !== "agency" && path !== "self") {
    return { error: "لازم تختار مسار ترخيص." };
  }

  const currentCapital = await getCurrentCapital(userId);

  if (path === "agency") {
    if (AGENCY_COST > currentCapital) {
      return {
        error: `التكلفة (${AGENCY_COST.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
      };
    }

    const result: LicensingResult = {
      confirmed: true,
      decidedAt: new Date().toISOString(),
      path: "agency",
      totalCost: AGENCY_COST,
      totalDays: AGENCY_DAYS,
    };

    await applyLicensingDecision(userId, {
      path: "agency",
      cost: AGENCY_COST,
      days: AGENCY_DAYS,
      result,
    });
    revalidatePath("/game");
    return null;
  }

  // path === "self"
  const wasReady = formData.get("ready") === "on";
  const events = rollSelfLicensingEvents();
  const totalCost = SELF_BASE_COST + events.reduce((sum, e) => sum + e.extraCost, 0);
  const totalDays =
    SELF_BASE_DAYS +
    (wasReady ? 0 : SELF_UNREADY_EXTRA_DAYS) +
    events.reduce((sum, e) => sum + e.extraDays, 0);

  if (totalCost > currentCapital) {
    return {
      error: `التكلفة الإجمالية (${totalCost.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
    };
  }

  const result: LicensingResult = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    path: "self",
    totalCost,
    totalDays,
    wasReady,
    events,
  };

  await applyLicensingDecision(userId, { path: "self", cost: totalCost, days: totalDays, result });
  revalidatePath("/game");
  return null;
}

export type NegotiationFormState = { success: boolean; discountPercent: number } | { error: string } | null;

/**
 * التفاوض — زر منفصل، اختياري، قبل التأكيد النهائي فقط. "يُستهلك"
 * فعلياً سيرفر-سايد (مو بس بتعطيل الزر بالواجهة): لو فيه نتيجة
 * محفوظة أصلاً، برجّعها كما هي بدل ما يرمي نرد جديد. 60% نجاح؛ لو نجح
 * مع licensingPath="agency" الخصم يصير 20% بدل 10%، ويتخزّن علمين
 * إضافيين لمراحل لاحقة.
 */
export async function negotiateRentPrice(
  _prevState: NegotiationFormState
): Promise<NegotiationFormState> {
  const userId = await requireUserId();

  const existingResult = await getRentResult(userId);
  if (existingResult) {
    return { error: "قرار الإيجار مؤكّد أصلاً." };
  }

  const existingNegotiation = await getRentNegotiation(userId);
  if (existingNegotiation) {
    return { success: existingNegotiation.success, discountPercent: existingNegotiation.discountPercent };
  }

  const success = Math.random() < 0.6;
  let discountPercent = 0;
  const extraFlags: Record<string, unknown> = {};

  if (success) {
    discountPercent = 10;
    const licensingResult = await getLicensingResult(userId);
    if (licensingResult?.path === "agency") {
      discountPercent = 20;
      extraFlags.freeSetupDays = 15;
      extraFlags.wasteRemovalIncluded = true;
    }
  }

  const negotiation: NegotiationResult = { used: true, success, discountPercent };
  await saveRentNegotiation(userId, negotiation, extraFlags);
  revalidatePath("/game");
  return { success, discountPercent };
}

export type RentFormState = { error: string } | null;

/**
 * يحسب السعر النهائي (الإيجار الأساسي + 6,000 لو شاف تفاصيل خيار فاضٍ
 * + خصم التفاوض المحفوظ إن وُجد)، يحدّد الدفعة المطلوبة الآن حسب طريقة
 * الدفع، يرفض سيرفر-سايد لو أكبر من currentCapital، وإلا يخصم، يضيف
 * قسط شهري لو تقسيط، ويرمي مفاجآت النواقص العشوائية (مرة وحدة) لو
 * الخيار فاضٍ وما انشافت تفاصيله قبل التأكيد. بعد التأكيد الناجح
 * (تصحيح رجعي): يستهلك 20 يوم تجهيز (أو 5 لو freeSetupDays=15 من
 * تفاوض ناجح سابق مع مسار ترخيص agency) — مرة وحدة بس، مو عند كل
 * تحميل صفحة.
 */
export async function confirmRentDecision(
  _prevState: RentFormState,
  formData: FormData
): Promise<RentFormState> {
  const userId = await requireUserId();

  const rentId = String(formData.get("rentId") ?? "");
  const option = getRentOption(rentId);
  if (!option) {
    return { error: "لازم تختار خيار إيجار." };
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  if (paymentMethod !== "cash" && paymentMethod !== "installments") {
    return { error: "لازم تختار طريقة دفع." };
  }

  const viewedDetails = formData.get("viewedDetails") === "true";

  const negotiation = await getRentNegotiation(userId);
  const discountPercent = negotiation?.success ? negotiation.discountPercent : 0;

  const displayedPrice =
    option.annualRent + (!option.hasFullServices && viewedDetails ? MISSING_SERVICES_TOTAL : 0);
  const finalPrice = Math.round(displayedPrice * (1 - discountPercent / 100));

  let amountPaidNow: number;
  let monthlyAmount: number | undefined;
  if (paymentMethod === "cash") {
    amountPaidNow = finalPrice;
  } else {
    amountPaidNow = Math.round(finalPrice * 0.2);
    const remainingWithPremium = finalPrice * 0.8 * 1.15;
    monthlyAmount = Math.round(remainingWithPremium / 12);
  }

  const currentCapital = await getCurrentCapital(userId);
  if (amountPaidNow > currentCapital) {
    return {
      error: `الدفعة المطلوبة (${amountPaidNow.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
    };
  }

  let surpriseEvents: RentResult["surpriseEvents"];
  let totalSurpriseCost = 0;
  if (!option.hasFullServices && !viewedDetails) {
    surpriseEvents = rollMissingServiceSurprises();
    totalSurpriseCost = surpriseEvents.reduce((sum, e) => sum + e.cost, 0);
  }

  const result: RentResult = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    rentId: option.id,
    spaceSize: option.spaceSize,
    basePrice: option.annualRent,
    viewedDetailsBeforeConfirm: viewedDetails,
    negotiationUsed: negotiation?.used === true,
    negotiationSuccess: negotiation?.success,
    discountPercent,
    finalPrice,
    paymentMethod,
    amountPaidNow,
    ...(monthlyAmount !== undefined ? { monthlyAmount } : {}),
    ...(surpriseEvents ? { surpriseEvents } : {}),
    totalSurpriseCost,
  };

  const staticFields: Record<string, unknown> = {
    rentChoice: option.id,
    rentSpaceSize: option.spaceSize,
    rentResult: result,
  };
  if (option.primeLocation) {
    staticFields.primeLocation = true;
  }

  await applyRentDecision(userId, {
    totalDeduction: amountPaidNow + totalSurpriseCost,
    monthlyObligation:
      paymentMethod === "installments" ? { type: "rent", monthlyAmount: monthlyAmount! } : null,
    staticFields,
  });

  // استهلاك أيام تجهيز المكان — مرة وحدة عند التأكيد النهائي (مو عند
  // فتح "تفاصيل" أو التفاوض نفسه). freeSetupDays=15 (تفاوض ناجح مع
  // مسار ترخيص agency) يخفّض الاستهلاك لـ5 بدل الـ20 كاملة.
  const freeSetupDays = await getRentFreeSetupDays(userId);
  const setupDaysConsumed = freeSetupDays === 15 ? RENT_BASE_SETUP_DAYS - 15 : RENT_BASE_SETUP_DAYS;
  await consumeGameDays(userId, setupDaysConsumed);

  revalidatePath("/game");
  return null;
}

export type EquipmentFormState = { error: string } | null;

/**
 * يتحقق: نوع خط معروف، مساحته ما تتخطى ميزانية rentSpaceSize (سيرفر-
 * سايد، مو بس واجهة)، عدد عمال صحيح >= 1، وطريقة دفع صالحة (تقسيط
 * ممنوع كلياً على الخط النصف أوتوماتيكي حتى لو انبعتت مباشرة). يرفض
 * لو التكلفة المطلوبة أكبر من currentCapital، وإلا يخصم، يضيف قسط
 * المعدات (إن كان تقسيط) وقسط رواتب العمال (دايماً) لـ
 * monthlyObligations، ويخزّن القرار النهائي. بعد التأكيد الناجح
 * (تصحيح رجعي): يستهلك أيام تجهيز حسب نوع الخط (أوتوماتيكي 10، نصف
 * أوتوماتيكي 5) — مرة وحدة بس.
 */
export async function confirmEquipmentDecision(
  _prevState: EquipmentFormState,
  formData: FormData
): Promise<EquipmentFormState> {
  const userId = await requireUserId();

  const equipmentType = String(formData.get("equipmentType") ?? "");
  const option = getEquipmentOption(equipmentType);
  if (!option) {
    return { error: "لازم تختار نوع خط." };
  }

  const spaceSize = await getRentSpaceSize(userId);
  const spaceBudget = spaceSize ? SPACE_BUDGET[spaceSize] : 0;
  if (option.spaceUsed > spaceBudget) {
    return { error: "هذا الخط لا يناسب المساحة المستأجرة." };
  }

  const rawWorkerCount = formData.get("workerCount");
  const workerCount = Number(rawWorkerCount);
  if (
    rawWorkerCount === null ||
    rawWorkerCount === "" ||
    !Number.isFinite(workerCount) ||
    !Number.isInteger(workerCount) ||
    workerCount < 1
  ) {
    return { error: "عدد العمال لازم يكون رقم صحيح 1 أو أكثر." };
  }

  const paymentMethod = String(formData.get("paymentMethod") ?? "");
  if (paymentMethod !== "cash" && paymentMethod !== "installments") {
    return { error: "لازم تختار طريقة دفع." };
  }
  if (paymentMethod === "installments" && !option.allowsInstallments) {
    return { error: "هذا الخط كاش إجباري — ما في خيار تقسيط له." };
  }

  let amountPaidNow: number;
  let monthlyAmount: number | undefined;
  if (paymentMethod === "cash") {
    amountPaidNow = option.cost;
  } else {
    amountPaidNow = Math.round(option.cost * 0.2);
    const remainingWithPremium = option.cost * 0.8 * 1.15;
    monthlyAmount = Math.round(remainingWithPremium / 12);
  }

  const currentCapital = await getCurrentCapital(userId);
  if (amountPaidNow > currentCapital) {
    return {
      error: `التكلفة المطلوبة (${amountPaidNow.toLocaleString("ar")}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
    };
  }

  const workerMonthlyTotal = workerCount * WORKER_MONTHLY_SALARY;

  const result: EquipmentResult = {
    confirmed: true,
    decidedAt: new Date().toISOString(),
    equipmentType: option.type,
    workerCount,
    equipmentSpaceUsed: option.spaceUsed,
    cost: option.cost,
    paymentMethod,
    amountPaidNow,
    ...(monthlyAmount !== undefined ? { monthlyAmount } : {}),
    workerMonthlyTotal,
  };

  const newObligations: { type: "equipment" | "production-workers"; monthlyAmount: number }[] = [];
  if (monthlyAmount !== undefined) {
    newObligations.push({ type: "equipment", monthlyAmount });
  }
  newObligations.push({ type: "production-workers", monthlyAmount: workerMonthlyTotal });

  await applyEquipmentDecision(userId, {
    totalDeduction: amountPaidNow,
    newObligations,
    staticFields: {
      equipmentType: option.type,
      workerCount,
      equipmentSpaceUsed: option.spaceUsed,
      equipmentResult: result,
    },
  });

  // استهلاك أيام تجهيز الخط — مرة وحدة عند التأكيد، حسب نوع الخط
  // المختار (option.setupDays: أوتوماتيكي 10، نصف أوتوماتيكي 5).
  await consumeGameDays(userId, option.setupDays);

  revalidatePath("/game");
  return null;
}

export type HiringFormState = { error: string } | null;

/**
 * يتحقق إن الدورين الاثنين (كيميائي ومحاسب) عندهم قرار صالح (junior/
 * senior/none) — الدوران مستقلان عن بعض، بس لازم الاثنين يتقرروا مع
 * بعض بنفس التأكيد. بدون أي فحص currentCapital (راتب = التزام مستقبلي
 * بس، مو خصم فوري). يضيف 0-2 عنصر رواتب لـmonthlyObligations حسب
 * القرارات، ويخزّن الأربعة حقول النهائية.
 */
export async function confirmHiringDecision(
  _prevState: HiringFormState,
  formData: FormData
): Promise<HiringFormState> {
  const userId = await requireUserId();

  const chemistChoice = String(formData.get("chemist") ?? "");
  const accountantChoice = String(formData.get("accountant") ?? "");

  const chemistRole = getHiringRole("chemist");
  const accountantRole = getHiringRole("accountant");
  const chemistCandidate = chemistRole?.candidates.find((c) => c.choice === chemistChoice);
  const accountantCandidate = accountantRole?.candidates.find((c) => c.choice === accountantChoice);

  if (!chemistCandidate) {
    return { error: "لازم تقرر بخصوص الكيميائي (وظّف أو لا توظف)." };
  }
  if (!accountantCandidate) {
    return { error: "لازم تقرر بخصوص المحاسب (وظّف أو لا توظف)." };
  }

  const newObligations: { type: "salary-chemist" | "salary-accountant"; monthlyAmount: number }[] = [];
  const staticFields: Record<string, unknown> = {};

  if (chemistCandidate.choice === "none") {
    staticFields.chemistHired = false;
    staticFields.chemistExperience = null;
  } else {
    staticFields.chemistHired = true;
    staticFields.chemistExperience = chemistCandidate.choice;
    newObligations.push({ type: "salary-chemist", monthlyAmount: chemistCandidate.monthlySalary });
  }

  if (accountantCandidate.choice === "none") {
    staticFields.accountantHired = false;
    staticFields.accountantExperience = null;
  } else {
    staticFields.accountantHired = true;
    staticFields.accountantExperience = accountantCandidate.choice;
    newObligations.push({ type: "salary-accountant", monthlyAmount: accountantCandidate.monthlySalary });
  }

  await applyHiringDecision(userId, { newObligations, staticFields });
  revalidatePath("/game");
  return null;
}

export type ProductionFormState =
  | { error: string }
  | {
      producedUnits: number;
      finalProducedUnits: number;
      quality: (typeof PROCESSING_MODE_QUALITY)[ProcessingMode];
      smallUnits: number;
      largeUnits: number;
      qcPurchased: boolean;
      chemistErrorOccurred: boolean;
      qcReport: string | null;
    }
  | null;

/**
 * دورة إنتاج واحدة: يتحقق من مورّد صالح، كمية شراء صحيحة >= 0، وضع
 * معالجة صالح (fast/precise)، نوع خط منتج صالح (single/diversified)،
 * ونسب تعبئة صحيحة تجمع 100 بالضبط. يحسب تكلفة الشراء (مع خصم 15% لو
 * الكمية المشتراة + المخزون الحالي >= 1.2× الطاقة) + تكلفة QC الثابتة
 * إن كان مفعّلاً، يرفض سيرفر-سايد لو المجموع أكبر من currentCapital،
 * وإلا يخصم، يحدّث المخزون بالفرق الصافي (الكمية المشتراة ناقص
 * rawMaterialConsumed فقط — الباقي يتراكم للدورة الجاية)، وينتج
 * تلقائياً حسب معادلة الجزء ب. بعدها: هدر طبيعي 3% ثابت (دايماً)، ثم
 * خطأ كيميائي احتمالي حسب chemistHired/chemistExperience (كل دورة
 * لحالها، مستقل) — finalProducedUnits هو المصدر الوحيد للحقيقة بعد
 * هيك. smallUnits/largeUnits تُحسب من finalProducedUnits (مو
 * producedUnits الخام) بنفس نمط "largeUnits = الباقي" لتفادي فروقات
 * التقريب. يضيف دورة جديدة لـproductionCycles (بدون حذف السابقة)
 * ويرجّع تفاصيل النتيجة (بما فيها تقرير QC إن اشتُري) للعرض. بعد
 * التأكيد الناجح (تصحيح رجعي): يستهلك max(2, ceil(purchaseQuantity/50))
 * يوم — مرة وحدة بس، ويخزّنها كحقل daysConsumedThisCycle بعنصر الدورة
 * نفسه للمراجعة لاحقاً.
 */
export async function confirmProductionPurchase(
  _prevState: ProductionFormState,
  formData: FormData
): Promise<ProductionFormState> {
  const userId = await requireUserId();

  const supplierChoice = String(formData.get("supplierChoice") ?? "") as SupplierChoice | "";
  if (supplierChoice !== "cheap" && supplierChoice !== "trusted") {
    return { error: "لازم تختار مورّد." };
  }

  const rawQuantity = formData.get("purchaseQuantity");
  const purchaseQuantity = Number(rawQuantity);
  if (
    rawQuantity === null ||
    rawQuantity === "" ||
    !Number.isFinite(purchaseQuantity) ||
    !Number.isInteger(purchaseQuantity) ||
    purchaseQuantity < 0
  ) {
    return { error: "الكمية لازم تكون رقم صحيح 0 أو أكثر." };
  }

  const processingMode = String(formData.get("processingMode") ?? "") as ProcessingMode | "";
  if (processingMode !== "fast" && processingMode !== "precise") {
    return { error: "لازم تختار وضع معالجة." };
  }

  const productLineType = String(formData.get("productLineType") ?? "") as ProductLineType | "";
  if (productLineType !== "single" && productLineType !== "diversified") {
    return { error: "لازم تختار نوع خط المنتج." };
  }

  const rawSmallPercent = formData.get("smallPercent");
  const rawLargePercent = formData.get("largePercent");
  const smallPercent = Number(rawSmallPercent);
  const largePercent = Number(rawLargePercent);
  if (
    rawSmallPercent === null ||
    rawSmallPercent === "" ||
    rawLargePercent === null ||
    rawLargePercent === "" ||
    !Number.isFinite(smallPercent) ||
    !Number.isFinite(largePercent) ||
    !Number.isInteger(smallPercent) ||
    !Number.isInteger(largePercent) ||
    smallPercent < 0 ||
    largePercent < 0
  ) {
    return { error: "نسب التعبئة لازم تكون أرقام صحيحة 0 أو أكثر." };
  }
  if (smallPercent + largePercent !== 100) {
    return { error: `نسب التعبئة لازم تجمع 100 بالضبط (المجموع الحالي: ${smallPercent + largePercent}).` };
  }

  const qcPurchased = formData.get("qcPurchased") === "on";

  const equipmentSetup = await getEquipmentSetup(userId);
  if (!equipmentSetup) {
    return { error: "لازم تأكّد قرار المعدات قبل الإنتاج." };
  }
  const productionCapacity = getProductionCapacity(equipmentSetup.equipmentType, equipmentSetup.workerCount);

  const currentInventory = await getRawMaterialInventory(userId);
  const unitPrice = SUPPLIER_PRICE_PER_UNIT[supplierChoice];
  let materialsCost = purchaseQuantity * unitPrice;
  const bulkEligible =
    purchaseQuantity + currentInventory >= BULK_DISCOUNT_CAPACITY_MULTIPLIER * productionCapacity;
  if (bulkEligible) {
    materialsCost = Math.round(materialsCost * (1 - BULK_DISCOUNT_PERCENT / 100));
  }

  const totalCost = materialsCost + (qcPurchased ? QC_COST : 0);

  const currentCapital = await getCurrentCapital(userId);
  if (totalCost > currentCapital) {
    return {
      error: `التكلفة الإجمالية (${totalCost.toLocaleString("ar")}${qcPurchased ? ` — شاملة ${QC_COST.toLocaleString("ar")} لفحص الجودة` : ""}) أكبر من رصيدك المتاح (${currentCapital.toLocaleString("ar")}).`,
    };
  }

  const inventoryAfterPurchase = currentInventory + purchaseQuantity;
  const { rawMaterialConsumed, producedUnits } = computeProduction(
    inventoryAfterPurchase,
    productionCapacity,
    processingMode
  );
  const inventoryDelta = purchaseQuantity - rawMaterialConsumed;

  // هدر طبيعي 3% ثابت (دايماً)، ثم خطأ كيميائي احتمالي حسب مستوى الخبرة
  // المخزّن فعلياً من مرحلة التوظيف — كل دورة برمية مستقلة.
  const hiringDecision = await getHiringDecision(userId);
  const chemistTier = getChemistTier(hiringDecision?.chemistHired ?? false, hiringDecision?.chemistExperience ?? null);
  const afterNaturalWaste = applyNaturalWaste(producedUnits);
  const chemistErrorOccurred = rollChemistError(chemistTier);
  const finalProducedUnits = chemistErrorOccurred
    ? applyChemistErrorWaste(afterNaturalWaste, chemistTier)
    : afterNaturalWaste;

  const smallUnits = Math.round((finalProducedUnits * smallPercent) / 100);
  const largeUnits = finalProducedUnits - smallUnits;

  // استهلاك أيام يتناسب مع حجم الشراء — بحد أدنى يومين، يُخزَّن كحقل
  // بعنصر الدورة نفسه للمراجعة لاحقاً.
  const daysConsumedThisCycle = getProductionCycleDays(purchaseQuantity);

  const cycles = await getProductionCycles(userId);
  const newCycle: ProductionCycle = {
    cycleNumber: cycles.length + 1,
    supplierChoice,
    purchaseQuantity,
    purchaseCost: materialsCost,
    producedUnits,
    processingMode,
    quality: PROCESSING_MODE_QUALITY[processingMode],
    rawMaterialConsumed,
    productLineType,
    smallUnits,
    largeUnits,
    chemistErrorOccurred,
    qcPurchased,
    finalProducedUnits,
    daysConsumedThisCycle,
  };

  await applyProductionCycle(userId, { cost: totalCost, inventoryDelta, newCycle });
  await consumeGameDays(userId, daysConsumedThisCycle);
  revalidatePath("/game");

  const qcReport = qcPurchased
    ? chemistErrorOccurred
      ? `تقرير الجودة: اكتُشفت مشكلة — تلف ${Math.round(CHEMIST_ERROR_CONFIG[chemistTier].wastePercent * 100)}% من الدفعة بسبب خطأ تصنيع`
      : "تقرير الجودة: لا توجد مشكلة"
    : null;

  return {
    producedUnits,
    finalProducedUnits,
    quality: PROCESSING_MODE_QUALITY[processingMode],
    smallUnits,
    largeUnits,
    qcPurchased,
    chemistErrorOccurred,
    qcReport,
  };
}

export type SalesFormState =
  | { error: string }
  | { unitsSold: number; revenuePerUnit: number; totalRevenue: number; channel: SalesChannel }
  | null;

/**
 * عملية بيع واحدة: يتحقق من قناة صالحة وكمية صحيحة > 0. "تجار صغار"
 * مقفولة سيرفر-سايد بالكامل إلا لو دورة إنتاج واحدة على الأقل كانت
 * productLineType="diversified" فعلياً (فحص مباشر على productionCycles،
 * مو علم موثوق من الواجهة). يحسب availableSmallUnits/availableLargeUnits
 * ديناميكياً من productionCycles+salesTransactions (بدون أي حقل مخزَّن
 * منفصل) ويرفض لو الكمية المطلوبة أكبر من المتاح فعلياً حسب قناة
 * البيع. تكلفة الوحدة الفعلية (computeUnitCost) تُحسب وتُخزَّن
 * (saleUnitCost) مرة وحدة بس عند أول عملية بيع — العمليات التالية
 * تعيد استخدام نفس القيمة المثبَّتة. عند التأكيد: يضيف totalRevenue
 * فوراً لـcurrentCapital ويضيف عملية بيع جديدة لـsalesTransactions.
 */
export async function confirmSaleTransaction(
  _prevState: SalesFormState,
  formData: FormData
): Promise<SalesFormState> {
  const userId = await requireUserId();

  const channel = String(formData.get("channel") ?? "") as SalesChannel | "";
  if (channel !== "discount-market" && channel !== "wholesaler" && channel !== "boutique-trader") {
    return { error: "لازم تختار قناة بيع." };
  }

  const rawUnitsSold = formData.get("unitsSold");
  const unitsSold = Number(rawUnitsSold);
  if (
    rawUnitsSold === null ||
    rawUnitsSold === "" ||
    !Number.isFinite(unitsSold) ||
    !Number.isInteger(unitsSold) ||
    unitsSold < 1
  ) {
    return { error: "الكمية لازم تكون رقم صحيح 1 أو أكثر." };
  }

  const cycles = await getProductionCycles(userId);

  if (channel === "boutique-trader" && !isBoutiqueTraderUnlocked(cycles)) {
    return { error: "قناة تجار صغار مقفولة — لازم تنويع السلة (productLineType=diversified) بدورة إنتاج واحدة على الأقل." };
  }

  const transactions = await getSalesTransactions(userId);
  const { availableSmallUnits, availableLargeUnits } = getAvailableUnits(cycles, transactions);
  const available = channel === "boutique-trader" ? availableSmallUnits : availableLargeUnits;

  if (unitsSold > available) {
    return { error: `الكمية المطلوبة (${unitsSold.toLocaleString("ar")}) أكبر من المتاح فعلياً (${available.toLocaleString("ar")}).` };
  }

  const staticFields: Record<string, unknown> = {};
  let unitCost = await getSaleUnitCost(userId);
  if (unitCost === null) {
    unitCost = computeUnitCost(cycles);
    staticFields.saleUnitCost = unitCost;
  }

  const revenuePerUnit = getRevenuePerUnit(unitCost, channel);
  const totalRevenue = unitsSold * revenuePerUnit;

  const newTransaction: SalesTransaction = {
    transactionNumber: transactions.length + 1,
    channel,
    unitsSold,
    revenuePerUnit,
    totalRevenue,
  };

  await applySaleTransaction(userId, { totalRevenue, newTransaction, staticFields });
  revalidatePath("/game");
  return { unitsSold, revenuePerUnit, totalRevenue, channel };
}
