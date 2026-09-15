"use client";

import { useEffect, useState } from "react";

/**
 * عداد تنازلي "حقيقي" — بيتحسب دايماً من (financingStartedAt +
 * financingDeadlineDays) مقارنة بالوقت الفعلي الحالي (Date.now())،
 * مش عداد محلي بيبلش من الصفر كل ما الصفحة تتحمّل. لو المستخدم سكّر
 * المتصفح وفتحه بعد ساعتين، القيمة صحيحة فوراً لأنها محسوبة من توقيت
 * ثابت مخزّن بقاعدة البيانات، مو من عداد بالمتصفح.
 *
 * أول جزء فعلي من "شريط الحالة الدائم" (روح القسم 6 بـroadmap.md) —
 * بيظهر بكل شاشات اللعبة التالية طالما قرار التمويل مؤكّد.
 */

function formatRemaining(ms: number): string {
  if (ms <= 0) return "انتهت المهلة";

  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return `متبقي ${days} يوم ${hours}س ${minutes}د ${seconds}ث`;
}

export default function FinancingCountdown({
  startedAt,
  deadlineDays,
}: {
  startedAt: string;
  deadlineDays: number;
}) {
  const deadline = new Date(startedAt).getTime() + deadlineDays * 24 * 60 * 60 * 1000;

  // بنبلش بـnull (بدل ما نحسب Date.now() وقت الرندر) — تفادي أي
  // Hydration Mismatch بين وقت السيرفر (وقت الرندر) ووقت المتصفح (وقت
  // الفتح). أول قيمة فعلية بتجي من الـinterval نفسه، مو باستدعاء
  // setState مباشر جوا الـeffect.
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    const interval = setInterval(() => {
      setNow(Date.now());
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  const text = now === null ? "جاري حساب المهلة..." : formatRemaining(deadline - now);

  return (
    <div className="sticky top-2 z-10 flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <span aria-hidden="true">⏳</span>
      <span>{text}</span>
    </div>
  );
}
