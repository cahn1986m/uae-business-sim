import "server-only";
import { neon } from "@neondatabase/serverless";

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
