/**
 * مرحلة "الترخيص" (المرحلة 4) — أول إنفاق فعلي بالمشروع (`currentCapital`).
 * مسارين معروضين بوضوح (التكلفة/المدة معلنة، مو محايدة بصرياً — الفرق
 * بينهم معروف للاعب)، بس "المفاجآت" داخل مسار الترخيص الذاتي مخفية
 * لحد ما تقع فعلياً.
 */

export type LicensingPath = "agency" | "self";

export const AGENCY_COST = 55000;
export const AGENCY_DAYS = 10;

export const SELF_BASE_COST = 45000;
export const SELF_BASE_DAYS = 25;
export const SELF_UNREADY_EXTRA_DAYS = 5;

export type SelfLicensingEventKey = "missingDocs" | "siteInspection" | "safetyRequirements";

/**
 * كود كل حدث (ميزة اللغة، الجزء ب) — بدل نص عربي جاهز نخزّن الكود بس
 * ونترجمه وقت العرض عبر t() (lib/i18n.ts). نفس الاحتمالات والتكاليف
 * والأيام بدون أي تغيير.
 */
export type SelfLicensingEventCode =
  | "licensing_missing_docs"
  | "licensing_site_inspection"
  | "licensing_civil_defense";

/** الأحداث الثلاثة — مستقلة عن بعضها، كل وحدة تُقيَّم لحالها. */
export const SELF_LICENSING_EVENTS: {
  key: SelfLicensingEventKey;
  chance: number;
  extraCost: number;
  extraDays: number;
  code: SelfLicensingEventCode;
}[] = [
  { key: "missingDocs", chance: 0.35, extraCost: 0, extraDays: 5, code: "licensing_missing_docs" },
  { key: "siteInspection", chance: 0.25, extraCost: 3000, extraDays: 8, code: "licensing_site_inspection" },
  { key: "safetyRequirements", chance: 0.2, extraCost: 4000, extraDays: 6, code: "licensing_civil_defense" },
];

export type SelfLicensingEvent = {
  key: SelfLicensingEventKey;
  code: SelfLicensingEventCode;
  extraCost: number;
  extraDays: number;
};

export type LicensingResult = {
  confirmed: true;
  decidedAt: string;
  path: LicensingPath;
  totalCost: number;
  totalDays: number;
  /** بس لمسار "self" — وجود المربع محدد وقت التأكيد. */
  wasReady?: boolean;
  /** بس لمسار "self" — الأحداث يلي فعلاً صارت (فاضية لو ولا وحدة صارت). */
  events?: SelfLicensingEvent[];
};

/** يرمي نرد كل حدث لحاله (35% / 25% / 20%) — ممكن يصير أي عدد منهم مع بعض. */
export function rollSelfLicensingEvents(): SelfLicensingEvent[] {
  return SELF_LICENSING_EVENTS.filter((e) => Math.random() < e.chance).map((e) => ({
    key: e.key,
    code: e.code,
    extraCost: e.extraCost,
    extraDays: e.extraDays,
  }));
}
