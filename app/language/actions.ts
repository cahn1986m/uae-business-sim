"use server";

import { redirect } from "next/navigation";
import { auth } from "@/lib/auth/server";
import { setLanguage } from "@/lib/db";
import type { Language } from "@/lib/i18n";

/**
 * يخزّن اختيار اللغة (مرة وحدة، وقت التسجيل) ويوجّه لـ/dashboard —
 * قرار حساب دائم، منفصل عن تقدّم الجولة.
 */
export async function chooseLanguage(formData: FormData): Promise<void> {
  const { data: session } = await auth.getSession();
  if (!session?.user) {
    redirect("/auth/sign-in");
  }

  const language = String(formData.get("language") ?? "");
  if (language !== "ar" && language !== "en") {
    throw new Error("لغة غير صالحة");
  }

  await setLanguage(session.user.id, language as Language);
  redirect("/dashboard");
}
