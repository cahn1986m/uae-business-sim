import { t, type Language } from "@/lib/i18n";

/**
 * شريط الحالة الدائم — مهلة الأداء + currentCapital، ظاهر بكل شاشات
 * /game بمجرد وجود قرار تمويل محفوظ. مهلة الأداء "محاكاة" أيام، مو
 * وقت حقيقي بالثواني — بتحسب المتبقي من `financingDeadlineDays -
 * daysConsumed` (القيمتين مخزّنتين بقاعدة البيانات) **بدون أي
 * setInterval أو Date.now() إطلاقاً**. ما بيتغيّر أبداً بمجرد إعادة
 * تحميل الصفحة؛ القيمة الوحيدة يلي ممكن تغيّره هي استدعاء
 * consumeGameDays فعلياً (مربوط الآن بمراحل الإيجار/المعدات/الإنتاج).
 *
 * لما daysConsumed يتخطى financingDeadlineDays: عرض تحذير بصري بس
 * (خلفية حمراء + رسالة تتصاعد حسب investorEquityPercent) — بدون أي
 * حجب فعلي لأي إجراء (حسب roadmap.md: "لا اعتراض فعلي على قرارات
 * اللاعب بهذه النسخة").
 *
 * مكوّن سيرفر عادي (بدون "use client") — ما في أي حالة أو تفاعل هون.
 */
export default function FinancingCountdown({
  remainingDays,
  totalDays,
  currentCapital,
  isOverdue,
  investorEquityPercent,
  pendingReceivablesTotal,
  language,
}: {
  remainingDays: number;
  totalDays: number;
  currentCapital: number;
  isOverdue: boolean;
  investorEquityPercent: number;
  pendingReceivablesTotal?: number;
  language: Language;
}) {
  const pressureMessage = t(`financing.pressure.${investorEquityPercent}`, language);

  return (
    <div
      className={`sticky top-2 z-10 flex flex-col items-center gap-1 rounded-md border px-4 py-2 text-sm font-medium ${
        isOverdue
          ? "border-red-300 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          : "border-amber-300 bg-amber-50 text-amber-800 dark:border-amber-800 dark:bg-amber-950 dark:text-amber-200"
      }`}
    >
      <div className="flex items-center justify-center gap-3">
        <span className="flex items-center gap-1">
          <span aria-hidden="true">💰</span>
          <span>{t("hud.capital", language, { amount: currentCapital.toLocaleString("ar") })}</span>
        </span>
        <span className="flex items-center gap-1">
          <span aria-hidden="true">⏳</span>
          <span>{t("hud.remaining", language, { days: remainingDays, total: totalDays })}</span>
        </span>
      </div>
      {!!pendingReceivablesTotal && pendingReceivablesTotal > 0 && (
        <span className="flex items-center gap-1 text-xs">
          <span aria-hidden="true">💵</span>
          <span>{t("hud.pending", language, { amount: pendingReceivablesTotal.toLocaleString("ar") })}</span>
        </span>
      )}
      {isOverdue && pressureMessage && <p className="text-xs">{pressureMessage}</p>}
    </div>
  );
}
