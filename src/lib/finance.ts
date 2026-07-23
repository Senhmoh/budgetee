// ============================================================
// budgetee — Logique métier pure (aucune dépendance I/O, testable)
// Toutes les valeurs monétaires en euros (number, 2 décimales).
// ============================================================

export interface ChargeLine {
  expected: number; // montant prévu
  actual: number | null; // montant réel payé (null = pas encore payé)
}

export type SavingsGaugeStatus = "en_cours" | "atteint" | "surplus" | "non_atteint";
export type AnnualTrajectory = "avance" | "a_jour" | "rattrapage";

const round2 = (n: number) => Math.round(n * 100) / 100;

// ---------- Épargne ----------

/**
 * Cible mensuelle ajustée (rattrapage dynamique) :
 * E_ajustée = (E_annuel − Cumul épargné) / mois restants dans l'année.
 * `monthsRemaining` inclut le mois courant. Jamais négatif.
 */
export function adjustedMonthlyTarget(
  annualTarget: number,
  cumulativeSaved: number,
  monthsRemaining: number
): number {
  if (monthsRemaining <= 0) return 0;
  return round2(Math.max(0, (annualTarget - cumulativeSaved) / monthsRemaining));
}

/** Taux d'épargne mensuel en % : épargne réelle / revenu du mois. */
export function monthlySavingsRate(saved: number, income: number): number {
  if (income <= 0) return 0;
  return round2((saved / income) * 100);
}

/** Taux d'épargne annuel en % : cumul épargné / cumul revenus. */
export function annualSavingsRate(cumulativeSaved: number, cumulativeIncome: number): number {
  if (cumulativeIncome <= 0) return 0;
  return round2((cumulativeSaved / cumulativeIncome) * 100);
}

/** État de la jauge d'épargne mensuelle (4 états du cahier des charges). */
export function savingsGaugeStatus(
  saved: number,
  target: number,
  monthIsOver: boolean
): SavingsGaugeStatus {
  if (target <= 0) return saved > 0 ? "surplus" : "en_cours";
  if (saved > target) return "surplus";
  if (saved >= target) return "atteint";
  return monthIsOver ? "non_atteint" : "en_cours";
}

/**
 * Trajectoire annuelle : compare le cumul épargné au prorata de la cible
 * annuelle à date (mois écoulés / 12).
 */
export function annualTrajectory(
  cumulativeSaved: number,
  annualTarget: number,
  monthsElapsed: number
): AnnualTrajectory {
  if (annualTarget <= 0) return "a_jour";
  const expectedToDate = (annualTarget * monthsElapsed) / 12;
  if (cumulativeSaved > expectedToDate) return "avance";
  if (cumulativeSaved >= expectedToDate) return "a_jour";
  return "rattrapage";
}

// ---------- Charges & RAD ----------

/** Charges ajustées : réel si saisi, sinon prévu. */
export function adjustedCharges(charges: ChargeLine[]): number {
  return round2(charges.reduce((s, c) => s + (c.actual ?? c.expected), 0));
}

/**
 * RAD théorique du mois :
 * Revenu − Épargne de référence − Charges ajustées − Grosses dépenses.
 * Épargne de référence = épargne réelle si déjà versée, sinon cible ajustée
 * (hypothèse prudente : la cible sera versée).
 */
export function radTheorique(
  income: number,
  savingsDeposited: number,
  adjustedTarget: number,
  chargesAdjusted: number,
  bigExpensesTotal: number
): number {
  const savingsRef = savingsDeposited > 0 ? savingsDeposited : adjustedTarget;
  return round2(income - savingsRef - chargesAdjusted - bigExpensesTotal);
}

/** RAD quotidien : RAD restant / jours restants dans le mois (>= 1). */
export function radQuotidien(radRemaining: number, daysRemaining: number): number {
  return round2(radRemaining / Math.max(1, daysRemaining));
}

// ---------- Pointage bancaire ----------

/**
 * Solde théorique à l'instant T :
 * ancrage + revenus perçus − épargne versée − charges réellement payées
 * − grosses dépenses − budget courant consommé au prorata du mois.
 *
 * Le prorata (RAD théorique × jours écoulés / jours du mois) représente les
 * dépenses courantes "autorisées" à date : sans lui, tout achat du quotidien
 * apparaîtrait comme une surconsommation.
 */
export function soldeTheorique(params: {
  anchor: number;
  income: number;
  savingsDeposited: number;
  chargesPaid: number; // somme des montants réels payés uniquement
  bigExpensesTotal: number;
  radTheo: number;
  dayOfMonth: number;
  daysInMonth: number;
}): number {
  const { anchor, income, savingsDeposited, chargesPaid, bigExpensesTotal, radTheo, dayOfMonth, daysInMonth } = params;
  const prorata = Math.max(0, radTheo) * (dayOfMonth / daysInMonth);
  return round2(anchor + income - savingsDeposited - chargesPaid - bigExpensesTotal - prorata);
}

/** Écart de pointage : Δ = solde réel − solde théorique. Δ < 0 → surconsommation. */
export function ecartPointage(soldeReel: number, soldeTheo: number): number {
  return round2(soldeReel - soldeTheo);
}

/**
 * RAD mensuel restant réel, à partir du dernier pointage :
 * solde réel − engagements restants du mois
 * (charges non payées au prévu + épargne restant à verser).
 */
export function radRestantReel(params: {
  soldeReel: number;
  chargesUnpaidExpected: number;
  savingsDeposited: number;
  adjustedTarget: number;
}): number {
  const { soldeReel, chargesUnpaidExpected, savingsDeposited, adjustedTarget } = params;
  const savingsRemaining = Math.max(0, adjustedTarget - savingsDeposited);
  return round2(soldeReel - chargesUnpaidExpected - savingsRemaining);
}

// ---------- Dates ----------

export function monthKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

export function daysInMonth(year: number, month1to12: number): number {
  return new Date(year, month1to12, 0).getDate();
}
