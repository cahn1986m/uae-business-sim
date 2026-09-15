import { AuthView } from "@neondatabase/auth/react/ui";

/**
 * راوت واحد بيغطي كل صفحات المصادقة (تسجيل دخول، تسجيل حساب، نسيت كلمة
 * المرور...) حسب الـpath: /auth/sign-in، /auth/sign-up، إلخ.
 */
export default async function AuthPage({
  params,
}: {
  params: Promise<{ path: string }>;
}) {
  const { path } = await params;

  return (
    <main className="flex flex-1 flex-col items-center justify-center px-4 py-16">
      <AuthView path={path} />
    </main>
  );
}
