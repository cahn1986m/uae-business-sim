import { FINANCING_TIERS, type FinancingDecision, type FinancingTierKey } from "@/lib/financing";
import type { ProductionCycle } from "@/lib/production";
import {
  WHOLESALE_PAYMENT_MARGIN,
  type SalesChannel,
  type SalesTransaction,
  type PendingReceivable,
  type WholesalePaymentMethod,
} from "@/lib/sales";

/**
 * مرحلة "النتيجة" (المرحلة 10، الأخيرة) — بدون أي منطق لعب جديد، فقط
 * دوال قراءة/تجميع صرفة فوق الحقول المخزّنة أصلاً من المراحل 1-9.
 */

/** النتيجة النهائية — currentCapital + مبالغ pendingReceivables غير المحصّلة (تُحتسب كأصول). */
export function computeFinalNetWorth(currentCapital: number, pendingReceivables: PendingReceivable[]): number {
  const uncollected = pendingReceivables.filter((r) => !r.collected).reduce((sum, r) => sum + r.amount, 0);
  return currentCapital + uncollected;
}

export function getVerdict(finalNetWorth: number, startingCapital: number): "نجحت" | "خسرت" {
  return finalNetWorth > startingCapital ? "نجحت" : "خسرت";
}

export type FinancialProjection = {
  daysElapsed: number;
  netChangeSoFar: number;
  dailyRate: number;
  daysRemaining: number;
  projectedFinalNetWorth: number;
  onTrackToSucceed: boolean;
};

/**
 * توقع خطي مبسّط (تصحيح مهلة السداد السنوية) — يُستخدم فقط لما
 * المهلة لسا ما انتهت (daysConsumed < financingDeadlineDays)، لعرض
 * "توقع" بمرحلة 10 بدل حكم نهائي قاطع. افتراض متعمد إن المعدل
 * الحالي (منذ بداية التمويل، daysConsumed) بيستمر بلا تغيّر حتى نهاية
 * المهلة — تبسيط، مو نموذج تنبؤ دقيق. بترجع null لو daysElapsed=0
 * (تفادي القسمة على صفر — لا بيانات كافية بعد).
 */
export function computeFinancialProjection(
  finalNetWorth: number,
  startingCapital: number,
  daysConsumed: number,
  financingDeadlineDays: number
): FinancialProjection | null {
  const daysElapsed = daysConsumed;
  if (daysElapsed === 0) return null;

  const netChangeSoFar = finalNetWorth - startingCapital;
  const dailyRate = netChangeSoFar / daysElapsed;
  const daysRemaining = financingDeadlineDays - daysConsumed;
  const projectedFinalNetWorth = finalNetWorth + dailyRate * daysRemaining;

  return {
    daysElapsed,
    netChangeSoFar,
    dailyRate,
    daysRemaining,
    projectedFinalNetWorth,
    onTrackToSucceed: projectedFinalNetWorth > startingCapital,
  };
}

/** مستوى التمويل المختار — مُشتق من (financingDeadlineDays, investorEquityPercent) المخزَّنين، مو حقل مباشر. */
export function getFinancingTierKey(decision: FinancingDecision): FinancingTierKey | null {
  const tier = FINANCING_TIERS.find(
    (t) =>
      t.deadlineDays === decision.financingDeadlineDays &&
      t.investorEquityPercent === decision.investorEquityPercent
  );
  return tier?.key ?? null;
}

/**
 * طريقة الدفع الفعلية لعملية بيع بقناة "تجار جملة" — اشتقاق بحت من
 * revenuePerUnit المخزّن مقابل unitCost الثابت (نفس صيغة التقريب
 * المستخدمة وقت البيع نفسها)، بدون أي حقل إضافي مخزَّن أو تعديل على
 * منطق مرحلة البيع.
 */
export function classifyWholesalePayment(
  revenuePerUnit: number,
  unitCost: number
): WholesalePaymentMethod | null {
  const methods: WholesalePaymentMethod[] = ["cash", "credit-30", "credit-60", "credit-90"];
  for (const method of methods) {
    if (Math.round(unitCost * (1 + WHOLESALE_PAYMENT_MARGIN[method])) === revenuePerUnit) {
      return method;
    }
  }
  return null;
}

export type CreditSalesSummaryEntry = {
  method: WholesalePaymentMethod;
  count: number;
  totalRevenue: number;
};

/** تجميع مبيعات "تجار جملة" حسب طريقة الدفع الفعلية (كاش/تسهيلات 30/60/90). */
export function summarizeWholesalePayments(
  transactions: SalesTransaction[],
  unitCost: number
): CreditSalesSummaryEntry[] {
  const byMethod = new Map<WholesalePaymentMethod, CreditSalesSummaryEntry>();
  for (const t of transactions) {
    if (t.channel !== "wholesaler") continue;
    const method = classifyWholesalePayment(t.revenuePerUnit, unitCost);
    if (!method) continue;
    const entry = byMethod.get(method) ?? { method, count: 0, totalRevenue: 0 };
    entry.count += 1;
    entry.totalRevenue += t.totalRevenue;
    byMethod.set(method, entry);
  }
  return Array.from(byMethod.values());
}

/** إجمالي الإيراد المؤكَّد لكل قناة بيع على حدة. */
export function sumRevenueByChannel(transactions: SalesTransaction[]): Record<SalesChannel, number> {
  const totals: Record<SalesChannel, number> = {
    "discount-market": 0,
    wholesaler: 0,
    "boutique-trader": 0,
  };
  for (const t of transactions) {
    totals[t.channel] += t.totalRevenue;
  }
  return totals;
}

/**
 * إجمالي عمولة موظف المبيعات المدفوعة فعلياً — الفرق بين الإيراد الخام
 * المُعاد حسابه (unitsSold × revenuePerUnit) والمبلغ الصافي المخزَّن
 * (totalRevenue) لكل عملية. صفر تلقائياً لأي عملية سبقت التوظيف.
 */
export function computeTotalCommissionPaid(transactions: SalesTransaction[]): number {
  return transactions.reduce((sum, t) => sum + (t.unitsSold * t.revenuePerUnit - t.totalRevenue), 0);
}

/** عدد المرات الفعلي (عدّ حقيقي، مو تقدير) يلي حدث فيها خطأ كيميائي عبر كل دورات الإنتاج. */
export function countChemistErrors(cycles: ProductionCycle[]): number {
  return cycles.filter((c) => c.chemistErrorOccurred).length;
}

/** مجموع finalProducedUnits عبر كل دورات الإنتاج. */
export function sumFinalProducedUnits(cycles: ProductionCycle[]): number {
  return cycles.reduce((sum, c) => sum + c.finalProducedUnits, 0);
}
