import "server-only";
import { neon } from "@neondatabase/serverless";
import { MARKET_RESEARCH_TOTAL_CREDIT, type MarketResearchResults } from "@/lib/market-research";
import type { FinancingDecision } from "@/lib/financing";
import type { LicensingPath, LicensingResult } from "@/lib/licensing";
import type { NegotiationResult, RentResult, RentSpaceSize } from "@/lib/rent";
import type { EquipmentResult } from "@/lib/equipment";
import type { HiringDecision } from "@/lib/hiring";

if (!process.env.DATABASE_URL) {
  // Thrown lazily at request time (not at import time) would be nicer, but since
  // every server-side caller needs a real connection string anyway, failing fast
  // here makes misconfiguration obvious instead of surfacing as a cryptic DB error.
  console.warn(
    "[db] DATABASE_URL is not set. Add it to .env.local before hitting any route that touches the database."
  );
}

/**
 * Tagged-template SQL client for Neon Postgres (HTTP driver, works in
 * serverless/edge and normal Node runtimes alike).
 *
 * Usage: `await sql\`select * from game_state where user_id = ${userId}\``
 */
export const sql = neon(process.env.DATABASE_URL ?? "");

/**
 * Ensures a game_state row exists for the given user (empty JSON data by default).
 * Safe to call multiple times — it's a no-op if the row already exists (called on
 * every dashboard load, not just right after sign-up).
 *
 * Retries briefly as a defensive measure in case `neon_auth."user"` (the FK target,
 * written by Neon Auth itself) isn't visible yet on the very first read after sign-up.
 */
export async function ensureGameStateForUser(userId: string): Promise<void> {
  const maxAttempts = 5;
  const delayMs = 400;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await sql`
        INSERT INTO game_state (user_id, data)
        VALUES (${userId}, '{}'::jsonb)
        ON CONFLICT (user_id) DO NOTHING
      `;
      return;
    } catch (err) {
      const isLastAttempt = attempt === maxAttempts;
      if (isLastAttempt) throw err;
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
  }
}

export async function getGameState(userId: string) {
  const rows = await sql`
    SELECT user_id, data, created_at, updated_at
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return rows[0] ?? null;
}

/**
 * يرجّع المرحلة الحالية للاعب من game_state.data->>'currentStage'.
 * يبدأ بـ1 دايماً لو المفتاح مش موجود بعد (صف جديد، data = '{}').
 */
export async function getCurrentStage(userId: string): Promise<number> {
  const rows = await sql`
    SELECT (data->>'currentStage')::int AS current_stage
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const stage = rows[0]?.current_stage;
  return typeof stage === "number" && stage >= 1 ? stage : 1;
}

/**
 * يحدّث المرحلة الحالية بقاعدة البيانات (idempotent، بيحل مكان currentStage
 * الموجود لو موجود أو ينشئه لو مش موجود بعد — data يبدأ '{}' فمظبوط).
 */
export async function setCurrentStage(userId: string, stage: number): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(data, '{currentStage}', to_jsonb(${stage}::int)),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// مرحلة "دراسة السوق" (مرحلة 2) — كريديت منفصل + نتائج القنوات.
// ---------------------------------------------------------------------------

/**
 * يرجّع رصيد كريديت دراسة السوق. أول زيارة لهالمرحلة بيهيّئه بـ
 * MARKET_RESEARCH_TOTAL_CREDIT (حالياً 15,000) ويخزّنه فوراً بقاعدة
 * البيانات (مو بس بالذاكرة) — حتى يضل ثابت لو المستخدم رجع لاحقاً،
 * ومنفصل تماماً عن أي رصيد رأس مال أساسي لاحق.
 */
export async function getMarketResearchCredit(userId: string): Promise<number> {
  const rows = await sql`
    SELECT (data->>'marketResearchCredit')::int AS credit
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const credit = rows[0]?.credit;
  if (typeof credit === "number") return credit;

  await sql`
    UPDATE game_state
    SET data = jsonb_set(data, '{marketResearchCredit}', to_jsonb(${MARKET_RESEARCH_TOTAL_CREDIT}::int)),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
  return MARKET_RESEARCH_TOTAL_CREDIT;
}

/** يرجّع نتائج دراسة السوق المحفوظة، أو null لو اللاعب لسا ما أكّد توزيعه. */
export async function getMarketResearchResults(
  userId: string
): Promise<MarketResearchResults | null> {
  const rows = await sql`
    SELECT data->'marketResearchResults' AS results
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.results as MarketResearchResults | null) ?? null;
}

/** يخزّن نتائج دراسة السوق بعد التأكيد — مرة وحدة، بعدها القراءة بس (مو إعادة حساب). */
export async function saveMarketResearchResults(
  userId: string,
  results: MarketResearchResults
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(data, '{marketResearchResults}', ${JSON.stringify(results)}::jsonb),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/**
 * يمسح كريديت ونتائج دراسة السوق بالكامل (مو بس يصفّرهم رقمياً) — تُستخدم
 * مع "إعادة البدء" حتى تنرجع هالمرحلة لحالتها الأولى (كريديت
 * MARKET_RESEARCH_TOTAL_CREDIT من جديد، بدون نتائج محفوظة) بمرة الوصول
 * الجاية.
 */
export async function resetMarketResearch(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data - 'marketResearchCredit' - 'marketResearchResults',
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// مرحلة "قرار التمويل" (مرحلة 3) — رأس المال الأساسي + مهلة الأداء.
// ---------------------------------------------------------------------------

/**
 * يرجّع قرار التمويل المحفوظ (الأربعة حقول سوا)، أو null لو اللاعب لسا
 * ما أكّد قرار تمويل. الحقول مخزّنة flat بعمود data (مو متداخلة).
 */
export async function getFinancingDecision(userId: string): Promise<FinancingDecision | null> {
  const rows = await sql`
    SELECT
      data->>'startingCapital' AS starting_capital,
      data->>'investorEquityPercent' AS investor_equity_percent,
      data->>'financingStartedAt' AS financing_started_at,
      data->>'financingDeadlineDays' AS financing_deadline_days
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const row = rows[0];
  if (!row || row.starting_capital === null || row.financing_started_at === null) {
    return null;
  }

  return {
    startingCapital: Number(row.starting_capital),
    investorEquityPercent: Number(row.investor_equity_percent),
    financingStartedAt: row.financing_started_at as string,
    financingDeadlineDays: Number(row.financing_deadline_days),
  };
}

/** يخزّن قرار التمويل مرة وحدة — الأربعة حقول دفعة وحدة، بدمج جزئي (merge) مع data الموجودة. */
export async function saveFinancingDecision(
  userId: string,
  decision: FinancingDecision
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data || ${JSON.stringify(decision)}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/** يمسح الحقول الخمسة بالكامل (التمويل + daysConsumed) — تُستخدم مع "إعادة البدء". */
export async function resetFinancingDecision(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data - 'startingCapital' - 'investorEquityPercent'
                     - 'financingStartedAt' - 'financingDeadlineDays'
                     - 'daysConsumed',
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/**
 * "الأيام" هون مو وقت حقيقي — هي مفهوم محاكاة (simulated) بيتقدّم بس
 * لما منطق لعبة فعلي يستدعي consumeGameDays (لسا ما في أي مرحلة
 * بتستدعيها — بنية جاهزة لمراحل لاحقة). يبدأ 0 لو مش موجود بعد.
 */
export async function getDaysConsumed(userId: string): Promise<number> {
  const rows = await sql`
    SELECT (data->>'daysConsumed')::int AS days_consumed
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const value = rows[0]?.days_consumed;
  return typeof value === "number" ? value : 0;
}

/**
 * يزيد daysConsumed بعدد الأيام المعطى (مجمّع مع أي قيمة سابقة، مو
 * استبدال). المصدر الوحيد يلي المفروض يغيّر daysConsumed — أي مكان
 * تاني بيقرا بس.
 */
export async function consumeGameDays(userId: string, days: number): Promise<number> {
  const rows = await sql`
    UPDATE game_state
    SET data = jsonb_set(
          data,
          '{daysConsumed}',
          to_jsonb(COALESCE((data->>'daysConsumed')::int, 0) + ${days}::int)
        ),
        updated_at = now()
    WHERE user_id = ${userId}
    RETURNING (data->>'daysConsumed')::int AS days_consumed
  `;
  return rows[0]?.days_consumed ?? days;
}

// ---------------------------------------------------------------------------
// مرحلة "الترخيص" (مرحلة 4) — أول إنفاق فعلي (currentCapital).
// ---------------------------------------------------------------------------

/**
 * يرجّع الرصيد الفعلي المتاح للإنفاق. أول زيارة لهالمرحلة بيهيّئه من
 * startingCapital (المحفوظ من مرحلة التمويل) ويخزّنه فوراً — من
 * هاللحظة، currentCapital هو يلي يُخصم منه، مو startingCapital يلي
 * يضل سجل تاريخي ثابت.
 */
export async function getCurrentCapital(userId: string): Promise<number> {
  const rows = await sql`
    SELECT
      (data->>'currentCapital')::int AS current_capital,
      (data->>'startingCapital')::int AS starting_capital
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const row = rows[0];
  if (typeof row?.current_capital === "number") {
    return row.current_capital;
  }

  const initial = typeof row?.starting_capital === "number" ? row.starting_capital : 0;
  await sql`
    UPDATE game_state
    SET data = jsonb_set(data, '{currentCapital}', to_jsonb(${initial}::int)),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
  return initial;
}

/** يرجّع نتيجة الترخيص المحفوظة، أو null لو اللاعب لسا ما أكّد مسار. */
export async function getLicensingResult(userId: string): Promise<LicensingResult | null> {
  const rows = await sql`
    SELECT data->'licensingResult' AS result
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.result as LicensingResult | null) ?? null;
}

/**
 * يخصم التكلفة من currentCapital، يستهلك الأيام، ويخزّن licensingPath +
 * licensingResult — الأربعة تغييرات بضربة UPDATE وحدة (atomic)، مو
 * استدعاءات منفصلة، حتى ما يصير تحديث جزئي لو صار خطأ بالنص.
 */
export async function applyLicensingDecision(
  userId: string,
  params: { path: LicensingPath; cost: number; days: number; result: LicensingResult }
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(
          jsonb_set(
            data,
            '{currentCapital}',
            to_jsonb(
              COALESCE((data->>'currentCapital')::int, (data->>'startingCapital')::int, 0)
              - ${params.cost}::int
            )
          ),
          '{daysConsumed}',
          to_jsonb(COALESCE((data->>'daysConsumed')::int, 0) + ${params.days}::int)
        ) || ${JSON.stringify({ licensingPath: params.path, licensingResult: params.result })}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/** يمسح currentCapital وlicensingPath/licensingResult — تُستخدم مع "إعادة البدء". */
export async function resetLicensing(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data - 'currentCapital' - 'licensingPath' - 'licensingResult',
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// مرحلة "الإيجار" (مرحلة 5، الجزء أ) — اختيار مكان + تفاوض + دفع.
// ---------------------------------------------------------------------------

/** نتيجة التفاوض المؤقتة (قبل التأكيد النهائي) — null لو اللاعب لسا ما فاوض. */
export async function getRentNegotiation(userId: string): Promise<NegotiationResult | null> {
  const rows = await sql`
    SELECT data->'rentNegotiation' AS negotiation
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.negotiation as NegotiationResult | null) ?? null;
}

/**
 * يخزّن نتيجة التفاوض (مرة وحدة — الزر "يُستهلك" فعلياً هون سيرفر-سايد،
 * مو بس بتعطيل الزر بالواجهة). لو نجح مع licensingPath="agency"، أضف
 * extraFlags (freeSetupDays, wasteRemovalIncluded) بنفس الاستدعاء.
 */
export async function saveRentNegotiation(
  userId: string,
  negotiation: NegotiationResult,
  extraFlags: Record<string, unknown> = {}
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data || ${JSON.stringify({ rentNegotiation: negotiation, ...extraFlags })}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/** يرجّع قرار الإيجار النهائي المحفوظ، أو null لو اللاعب لسا ما أكّد. */
export async function getRentResult(userId: string): Promise<RentResult | null> {
  const rows = await sql`
    SELECT data->'rentResult' AS result
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.result as RentResult | null) ?? null;
}

/**
 * يخصم (الدفعة الآن + أي مفاجأة نواقص) من currentCapital، يضيف قسط
 * الإيجار الشهري لـmonthlyObligations لو تقسيط، يخزّن rentChoice/
 * rentSpaceSize/rentResult (وprimeLocation إن كان الخيار مميز)، ويمسح
 * rentNegotiation المؤقتة — كل شي بضربة UPDATE وحدة (atomic).
 */
export async function applyRentDecision(
  userId: string,
  params: {
    totalDeduction: number;
    monthlyObligation: { type: "rent"; monthlyAmount: number } | null;
    staticFields: Record<string, unknown>;
  }
): Promise<void> {
  const monthlyObligationJson = params.monthlyObligation ? JSON.stringify([params.monthlyObligation]) : "[]";

  await sql`
    UPDATE game_state
    SET data = (
          jsonb_set(
            jsonb_set(
              data - 'rentNegotiation',
              '{currentCapital}',
              to_jsonb(
                COALESCE((data->>'currentCapital')::int, (data->>'startingCapital')::int, 0)
                - ${params.totalDeduction}::int
              )
            ),
            '{monthlyObligations}',
            COALESCE(data->'monthlyObligations', '[]'::jsonb) || ${monthlyObligationJson}::jsonb
          )
        ) || ${JSON.stringify(params.staticFields)}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/**
 * يمسح كل حقول الإيجار (الاختيار، النتيجة، التفاوض المؤقت، العلمين
 * الخاصين بمرحلة البيع/الإيجار اللاحقة) — تُستخدم مع "إعادة البدء".
 * currentCapital نفسه بينمسح من resetLicensing، ومنعيد تصفير
 * monthlyObligations بالكامل هون (مو بس عنصر الإيجار منها).
 */
export async function resetRent(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data - 'rentChoice' - 'rentSpaceSize' - 'rentResult' - 'rentNegotiation'
                     - 'primeLocation' - 'freeSetupDays' - 'wasteRemovalIncluded'
                     - 'monthlyObligations',
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// مرحلة "المعدات" (مرحلة 6) — نوع الخط + عدد العمال.
// ---------------------------------------------------------------------------

/** مساحة الإيجار المختارة (من مرحلة 5) — لازم تكون موجودة قبل ما نوصل هالمرحلة. */
export async function getRentSpaceSize(userId: string): Promise<RentSpaceSize | null> {
  const rows = await sql`
    SELECT data->>'rentSpaceSize' AS space_size
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.space_size as RentSpaceSize | null) ?? null;
}

/** يرجّع قرار المعدات النهائي المحفوظ، أو null لو اللاعب لسا ما أكّد. */
export async function getEquipmentResult(userId: string): Promise<EquipmentResult | null> {
  const rows = await sql`
    SELECT data->'equipmentResult' AS result
    FROM game_state
    WHERE user_id = ${userId}
  `;
  return (rows[0]?.result as EquipmentResult | null) ?? null;
}

/**
 * يخصم التكلفة من currentCapital، يضيف قسط المعدات الشهري (إن كان
 * تقسيط) وقسط رواتب عمال الإنتاج (دايماً) لـmonthlyObligations، ويخزّن
 * equipmentType/workerCount/equipmentSpaceUsed/equipmentResult — كل
 * شي بضربة UPDATE وحدة (atomic).
 */
export async function applyEquipmentDecision(
  userId: string,
  params: {
    totalDeduction: number;
    newObligations: { type: "equipment" | "production-workers"; monthlyAmount: number }[];
    staticFields: Record<string, unknown>;
  }
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = (
          jsonb_set(
            jsonb_set(
              data,
              '{currentCapital}',
              to_jsonb(
                COALESCE((data->>'currentCapital')::int, (data->>'startingCapital')::int, 0)
                - ${params.totalDeduction}::int
              )
            ),
            '{monthlyObligations}',
            COALESCE(data->'monthlyObligations', '[]'::jsonb) || ${JSON.stringify(params.newObligations)}::jsonb
          )
        ) || ${JSON.stringify(params.staticFields)}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/**
 * يمسح حقول المعدات، ويشيل بس عناصر "equipment" و"production-workers"
 * من monthlyObligations (مو المصفوفة كلها — عنصر "rent" لازم يضل زي
 * ما هو) — تُستخدم مع "إعادة البدء".
 */
export async function resetEquipment(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(
          data - 'equipmentType' - 'workerCount' - 'equipmentSpaceUsed' - 'equipmentResult',
          '{monthlyObligations}',
          COALESCE(
            (
              SELECT jsonb_agg(elem)
              FROM jsonb_array_elements(COALESCE(data->'monthlyObligations', '[]'::jsonb)) elem
              WHERE elem->>'type' NOT IN ('equipment', 'production-workers')
            ),
            '[]'::jsonb
          )
        ),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

// ---------------------------------------------------------------------------
// مرحلة "التوظيف" (مرحلة 7) — كيميائي ومحاسب، دوران مستقلان.
// ---------------------------------------------------------------------------

/**
 * يرجّع قرار التوظيف (الأربعة حقول سوا)، أو null لو اللاعب لسا ما أكّد
 * الدورين معاً. chemistHired/accountantHired بيتفحصوا بوجود المفتاح
 * نفسه (مو بقيمته) — لأن "false" قيمة صالحة (قرار "لا توظف" فعلي).
 */
export async function getHiringDecision(userId: string): Promise<HiringDecision | null> {
  const rows = await sql`
    SELECT
      data->>'chemistHired' AS chemist_hired,
      data->>'chemistExperience' AS chemist_experience,
      data->>'accountantHired' AS accountant_hired,
      data->>'accountantExperience' AS accountant_experience
    FROM game_state
    WHERE user_id = ${userId}
  `;
  const row = rows[0];
  if (!row || row.chemist_hired === null || row.accountant_hired === null) {
    return null;
  }

  return {
    chemistHired: row.chemist_hired === "true",
    chemistExperience: (row.chemist_experience as HiringDecision["chemistExperience"]) ?? null,
    accountantHired: row.accountant_hired === "true",
    accountantExperience: (row.accountant_experience as HiringDecision["accountantExperience"]) ?? null,
  };
}

/**
 * يخزّن قرار التوظيف — الأربعة حقول دفعة وحدة، ويضيف أي التزامات
 * رواتب جديدة (0-2 عنصر) لـmonthlyObligations. بدون أي خصم فوري من
 * currentCapital (الراتب التزام مستقبلي بس).
 */
export async function applyHiringDecision(
  userId: string,
  params: {
    newObligations: { type: "salary-chemist" | "salary-accountant"; monthlyAmount: number }[];
    staticFields: Record<string, unknown>;
  }
): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(
          data,
          '{monthlyObligations}',
          COALESCE(data->'monthlyObligations', '[]'::jsonb) || ${JSON.stringify(params.newObligations)}::jsonb
        ) || ${JSON.stringify(params.staticFields)}::jsonb,
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}

/**
 * يمسح الأربعة حقول، ويشيل بس عناصر "salary-chemist" و
 * "salary-accountant" من monthlyObligations (بدون التأثير على rent/
 * equipment/production-workers) — تُستخدم مع "إعادة البدء".
 */
export async function resetHiring(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = jsonb_set(
          data - 'chemistHired' - 'chemistExperience' - 'accountantHired' - 'accountantExperience',
          '{monthlyObligations}',
          COALESCE(
            (
              SELECT jsonb_agg(elem)
              FROM jsonb_array_elements(COALESCE(data->'monthlyObligations', '[]'::jsonb)) elem
              WHERE elem->>'type' NOT IN ('salary-chemist', 'salary-accountant')
            ),
            '[]'::jsonb
          )
        ),
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}
