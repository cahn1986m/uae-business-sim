import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Providers from "./providers";
import { auth } from "@/lib/auth/server";
import { getLanguage } from "@/lib/db";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "محاكاة فتح بزنس بالإمارات",
  description: "لعبة محاكاة فتح مصنع تصنيع مستحضرات تجميل/عطور بالإمارات",
};

// lang/dir بيعتمدو على جلسة/لغة المستخدم — لازم يُعاد تنفيذ الـlayout
// بكل طلب (بدون هذا، Next.js ممكن يكاش نتيجة الـlayout السابقة عبر
// تنقّلات جانبية زي redirect() من صفحة اختيار اللغة لـ/dashboard).
export const dynamic = "force-dynamic";

/**
 * lang/dir ديناميكيان حسب اللغة المخزّنة لكل مستخدم (الجزء أ من ميزة
 * اللغة) — "ar" → rtl (السلوك الافتراضي الحالي، بدون أي انحراف)،
 * "en" → ltr. اللاعب غير المسجّل دخوله (أو لسا ما اختار لغة) بيشوف
 * "ar"/rtl دايماً — نفس السلوك الحالي تماماً.
 */
export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { data: session } = await auth.getSession();
  const language = session?.user ? ((await getLanguage(session.user.id)) ?? "ar") : "ar";
  const dir = language === "en" ? "ltr" : "rtl";

  return (
    <html
      lang={language}
      dir={dir}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
