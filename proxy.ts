import { auth } from "@/lib/auth/server";

/**
 * يحمي /dashboard و/game (وأي مسار تحتهم لاحقاً) — يحوّل لصفحة تسجيل الدخول
 * تلقائياً لو الزائر ما عنده جلسة صالحة، وبيجدد الجلسة إذا قربت تنتهي.
 */
export default auth.middleware({ loginUrl: "/auth/sign-in" });

export const config = {
  matcher: ["/dashboard/:path*", "/game/:path*"],
};
