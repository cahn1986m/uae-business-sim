import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">محاكاة فتح بزنس بالإمارات</h1>
        <p className="max-w-md text-sm text-zinc-500">
          لعبة محاكاة تجربة فتح مصنع تصنيع مستحضرات تجميل/عطور من الألف للياء —
          هاي نسخة أولية من طبقة المنصة (حساب + حفظ تقدّم) قبل ما نبني مراحل اللعبة.
        </p>
      </div>

      <div className="flex gap-3">
        <Link
          href="/auth/sign-up"
          className="rounded-md bg-zinc-900 px-5 py-2.5 text-sm font-medium text-white transition-colors hover:bg-zinc-700 dark:bg-white dark:text-zinc-900 dark:hover:bg-zinc-200"
        >
          إنشاء حساب
        </Link>
        <Link
          href="/auth/sign-in"
          className="rounded-md border border-zinc-300 px-5 py-2.5 text-sm font-medium transition-colors hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-900"
        >
          تسجيل دخول
        </Link>
      </div>
    </div>
  );
}
