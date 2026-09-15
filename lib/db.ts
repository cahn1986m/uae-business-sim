import "server-only";
import { neon } from "@neondatabase/serverless";
import { MARKET_RESEARCH_TOTAL_CREDIT, type MarketResearchResults } from "@/lib/market-research";
import type { FinancingDecision } from "@/lib/financing";

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
