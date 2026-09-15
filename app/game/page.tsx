import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { getCurrentStage } from "@/lib/db";
import { getStageById, TOTAL_STAGES } from "@/lib/game-stages";
import { advanceStage, restartGame } from "./actions";

// المرحلة الحالية تُقرأ من قاعدة البيانات بكل مرة — لازم رندر ديناميكي.
export const dynamic = "force-dynamic";

export default async function GamePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const currentStage = await getCurrentStage(session.user.id);
  const stage = getStageById(currentStage);
  const isLastStage = currentStage >= TOTAL_STAGES;

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <p className="text-sm text-zinc-500">
        مرحلة {currentStage} من {TOTAL_STAGES}
      </p>

      <h1 className="text-2xl font-semibold">{stage.title}</h1>
      <p className="max-w-md text-sm text-zinc-500">{stage.description}</p>

      {isLastStage ? (
        <p className="rounded-md bg-zinc-100 px-4 py-2 text-sm font-medium dark:bg-zinc-900">
          انتهت الجولة 🎉
        </p>
      ) : (
        <form action={advanceStage}>
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            التالي
          </button>
        </form>
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
