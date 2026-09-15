"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/lib/auth/server";
import { getCurrentStage, setCurrentStage } from "@/lib/db";
import { TOTAL_STAGES } from "@/lib/game-stages";

async function requireUserId(): Promise<string> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    throw new Error("غير مسجل دخول");
  }
  return session.user.id;
}

/** ينقل اللاعب للمرحلة التالية (يتوقف عند 10، ما يتخطاها). */
export async function advanceStage() {
  const userId = await requireUserId();
  const current = await getCurrentStage(userId);
  const next = Math.min(current + 1, TOTAL_STAGES);
  await setCurrentStage(userId, next);
  revalidatePath("/game");
}

/** إعادة البدء — يرجّع currentStage لـ1. للتجربة أثناء البناء فقط. */
export async function restartGame() {
  const userId = await requireUserId();
  await setCurrentStage(userId, 1);
  revalidatePath("/game");
}
