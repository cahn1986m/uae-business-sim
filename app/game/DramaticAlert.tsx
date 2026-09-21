"use client";

import { useState } from "react";
import { t, type Language } from "@/lib/i18n";

/**
 * إشعار "رجة الهاتف" — لحظات مفاجئة/سلبية فقط (نصب، مفاجأة ترخيص،
 * خطأ كيميائي، استقالة...). يهتز بصرياً عند الظهور (CSS بحت، بدون
 * مكتبات خارجية)، ويبقى ظاهراً حتى يضغط اللاعب زر الإغلاق — مجرد
 * تنبيه بصري inline، بدون أي حجب (لا overlay ولا backdrop).
 */
export default function DramaticAlert({
  children,
  language,
}: {
  children: React.ReactNode;
  language: Language;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <div className="dramatic-alert-shake flex items-start gap-2 rounded-md border border-red-300 bg-red-50 px-4 py-3 text-right text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
      <span aria-hidden="true" className="text-lg leading-none">
        ⚠️
      </span>
      <div className="flex-1">{children}</div>
      <button
        type="button"
        onClick={() => setDismissed(true)}
        aria-label={t("common.closeAlert", language)}
        className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200"
      >
        ✕
      </button>
    </div>
  );
}
