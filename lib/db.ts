import "server-only";
import { neon } from "@neondatabase/serverless";
import { MARKET_RESEARCH_TOTAL_CREDIT, type MarketResearchResults } from "@/lib/market-research";

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
 * يرجّع رصيد كريديت دراسة السوق. أول زيارة لهالمرحلة بيهيّئه بـ30,000
 * ويخزّنه فوراً بقاعدة البيانات (مو بس بالذاكرة) — حتى يضل ثابت لو
 * المستخدم رجع لاحقاً، ومنفصل تماماً عن أي رصيد رأس مال أساسي لاحق.
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
 * مع "إعادة البدء" حتى تنرجع هالمرحلة لحالتها الأولى (كريديت 30,000 من
 * جديد، بدون نتائج محفوظة) بمرة الوصول الجاية.
 */
export async function resetMarketResearch(userId: string): Promise<void> {
  await sql`
    UPDATE game_state
    SET data = data - 'marketResearchCredit' - 'marketResearchResults',
        updated_at = now()
    WHERE user_id = ${userId}
  `;
}
