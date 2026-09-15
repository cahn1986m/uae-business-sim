import "server-only";
import { createNeonAuth } from "@neondatabase/auth/next/server";

/**
 * نقطة الدخول الموحدة لـ Neon Auth (Managed Better Auth) على السيرفر.
 * توفر: توابع auth.signIn/signUp/getSession...، auth.handler() لراوت الـAPI،
 * و auth.middleware() لحماية الروابط.
 */
export const auth = createNeonAuth({
  baseUrl: process.env.NEON_AUTH_BASE_URL!,
  cookies: {
    secret: process.env.NEON_AUTH_COOKIE_SECRET!,
  },
});
