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
  applyRentDecision,
  resetRent,
  getRentSpaceSize,
  getEquipmentResult,
  applyEquipmentDecision,
  resetEquipment,
  getHiringDecision,
  applyHiringDecision,
  resetHiring,
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
  type NegotiationResult,
  type RentResult,
} from "@/lib/rent";
import { getEquipmentOption, SPACE_BUDGET, WORKER_MONTHLY_SALARY, type EquipmentResult } from "@/lib/equipment";
import { getHiringRole } from "@/lib/hiring";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;
const LICENSING_STAGE_ID = 4;
const RENT_STAGE_ID = 5;
const EQUIPMENT_STAGE_ID = 6;
const HIRING_STAGE_ID = 7;

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

  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/**
 * إعادة البدء — يرجّع currentStage لـ1، وكمان يمسح تقدّم دراسة السوق
 * وقرار التمويل والترخيص والإيجار والمعدات والتوظيف حتى تكون كل مرحلة
 * جاهزة من الصفر بالجولة الجاية. للتجربة أثناء البناء فقط.
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
 * الخيار فاضٍ وما انشافت تفاصيله قبل التأكيد.
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
 * monthlyObligations، ويخزّن القرار النهائي.
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
