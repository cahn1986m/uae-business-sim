import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { ensureGameStateForUser, getLanguage } from "@/lib/db";
import { chooseLanguage } from "./actions";

// يُقرا language من قاعدة البيانات بكل زيارة — لازم رندر ديناميكي.
export const dynamic = "force-dynamic";

/**
 * صفحة اختيار اللغة — مرة وحدة بس، وقت التسجيل، قبل أي وصول لـ/dashboard
 * أو /game. لو اللاعب عنده لغة مخزّنة أصلاً، تحويل فوري لـ/dashboard
 * (سيرفر-سايد، ما بيشوف هالصفحة مرة ثانية).
 */
export default async function LanguagePage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  await ensureGameStateForUser(session.user.id);

  const language = await getLanguage(session.user.id);
  if (language) {
    redirect("/dashboard");
  }

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">اختر لغتك — Choose your language</h1>

      <div className="flex gap-4">
        <form action={chooseLanguage}>
          <input type="hidden" name="language" value="ar" />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            عربي
          </button>
        </form>
        <form action={chooseLanguage}>
          <input type="hidden" name="language" value="en" />
          <button
            type="submit"
            className="rounded-md bg-zinc-900 px-6 py-3 text-base font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
          >
            English
          </button>
        </form>
      </div>
    </div>
  );
}
