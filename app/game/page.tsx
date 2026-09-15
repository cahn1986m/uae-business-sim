import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import {
  getCurrentStage,
  getMarketResearchCredit,
  getMarketResearchResults,
  getFinancingDecision,
} from "@/lib/db";
import { getStageById, TOTAL_STAGES } from "@/lib/game-stages";
import type { MarketResearchResults } from "@/lib/market-research";
import { advanceStage, restartGame } from "./actions";
import MarketResearchStage from "./MarketResearchStage";
import FinancingStage from "./FinancingStage";
import FinancingCountdown from "./FinancingCountdown";

// المرحلة الحالية تُقرا من قاعدة البيانات بكل مرة — لازم رندر ديناميكي.
export const dynamic = "force-dynamic";

const MARKET_RESEARCH_STAGE_ID = 2;
const FINANCING_STAGE_ID = 3;

export default async function GamePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const currentStage = await getCurrentStage(session.user.id);
  const stage = getStageById(currentStage);
  const isLastStage = currentStage >= TOTAL_STAGES;
  const isMarketResearchStage = currentStage === MARKET_RESEARCH_STAGE_ID;
  const isFinancingStage = currentStage === FINANCING_STAGE_ID;

  // العداد التنازلي (بعد ما يتأكّد قرار التمويل) لازم يظهر بكل شاشات
  // اللعبة التالية، مو بس مرحلة 3 — فبنجيبه دايماً بغض النظر شو المرحلة.
  const financingDecision = await getFinancingDecision(session.user.id);

  // بمرحلة دراسة السوق تحديداً: لازم اللاعب يأكّد قرار الشراء (حتى لو
  // قرار "ما بشتري شي") قبل ما يقدر يكمّل — ما بنعرض زر "التالي" إلا
  // بعد التأكيد.
  let marketResearchCredit: number | null = null;
  let marketResearchResults: MarketResearchResults | null = null;
  let canAdvance = !isMarketResearchStage && !isFinancingStage;

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

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      {financingDecision && (
        <FinancingCountdown
          startedAt={financingDecision.financingStartedAt}
          deadlineDays={financingDecision.financingDeadlineDays}
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
