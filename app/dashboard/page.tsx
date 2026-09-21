import { redirect } from "next/navigation";
import Link from "next/link";
import { auth } from "@/lib/auth/server";
import { ensureGameStateForUser, getLanguage } from "@/lib/db";
import { t } from "@/lib/i18n";
import SignOutButton from "./SignOutButton";

// middleware.ts already يحمي هالمسار، بس بنتحقق من الجلسة هون كمان (دفاع
// مزدوج) ولأننا محتاجين بيانات المستخدم أصلاً لعرض الاسم/الإيميل.
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const { data: session } = await auth.getSession();

  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  // أول ما المستخدم يوصل هون (فوراً بعد التسجيل، بفضل redirectTo="/dashboard")
  // نتأكد إن عنده صف game_state فاضي. عملية idempotent وآمنة تتكرر بكل زيارة.
  await ensureGameStateForUser(session.user.id);

  // اختيار اللغة (الجزء أ من ميزة اللغة) — مرة وحدة وقت التسجيل، قبل
  // أي وصول لـ/dashboard أو /game. سيرفر-سايد، وليس فقط بالواجهة.
  const language = await getLanguage(session.user.id);
  if (!language) {
    redirect("/language");
  }

  const name = session.user.name || session.user.email || t("dashboard.defaultUser", language);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-16 text-center">
      <h1 className="text-2xl font-semibold">{t("dashboard.welcome", language, { name })}</h1>
      <p className="max-w-md text-sm text-zinc-500">{t("dashboard.subtitle", language)}</p>
      <Link
        href="/game"
        className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
      >
        {t("dashboard.startRound", language)}
      </Link>
      <SignOutButton language={language} />
    </div>
  );
}
