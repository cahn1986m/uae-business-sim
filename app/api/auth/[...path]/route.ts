import { auth } from "@/lib/auth/server";

/**
 * راوت الـAPI الموحّد يلي بيستقبل كل طلبات Neon Auth من المتصفح
 * (تسجيل دخول/حساب، جلسة، تسجيل خروج...) ويمررها لخدمة Neon Auth.
 */
export const { GET, POST } = auth.handler();
