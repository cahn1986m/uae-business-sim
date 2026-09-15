/**
 * عرض ثابت لمهلة الأداء — "محاكاة" أيام، مو وقت حقيقي بالثواني.
 * بيحسب المتبقي من `financingDeadlineDays - daysConsumed` (القيمتين
 * الاثنتين مخزّنتين بقاعدة البيانات) — **بدون أي setInterval أو
 * Date.now() إطلاقاً**. ما بيتغيّر أبداً بمجرد إعادة تحميل الصفحة؛
 * القيمة الوحيدة يلي ممكن تغيّره هي استدعاء consumeGameDays فعلياً
 * (منطق لعبة لاحق، لسا ما موجود بأي مرحلة).
 *
 * مكوّن سيرفر عادي (بدون "use client") — ما في أي حالة أو تفاعل هون.
 */
export default function FinancingCountdown({
  remainingDays,
  totalDays,
}: {
  remainingDays: number;
  totalDays: number;
}) {
  return (
    <div className="sticky top-2 z-10 flex items-center justify-center gap-2 rounded-md border border-amber-300 bg-amber-50 px-4 py-2 text-sm font-medium text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200">
      <span aria-hidden="true">⏳</span>
      <span>
        متبقي {remainingDays} يوم من {totalDays}
      </span>
    </div>
  );
}
