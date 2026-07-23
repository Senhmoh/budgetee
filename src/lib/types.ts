export type TransactionType =
  | "income"
  | "savings"
  | "fixed_charge"
  | "big_expense"
  | "receivable"
  | "debt"
  | "repayment"
  | "balance_check"
  | "balance_anchor";

export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  label: string;
  amount: number | null;
  expected_amount: number | null;
  month: string; // YYYY-MM-01
  occurred_at: string; // YYYY-MM-DD
  related_id: string | null;
  status: "active" | "settled";
  settled_at: string | null;
  deleted_at: string | null;
  notes: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface Settings {
  user_id: string;
  default_income: number;
  monthly_savings_target: number;
  annual_savings_target: number;
  currency: string;
}

export interface FixedChargeTemplate {
  id: string;
  user_id: string;
  label: string;
  default_amount: number;
  active: boolean;
}

export interface DashboardData {
  month: string; // YYYY-MM-01
  settings: Settings;
  income: Transaction | null;
  savings: Transaction | null;
  charges: Transaction[];
  bigExpenses: Transaction[];
  receivables: Transaction[];
  debts: Transaction[];
  anchor: Transaction | null;
  lastBalanceCheck: Transaction | null;
  // Calculs
  adjustedTarget: number;
  monthlyRate: number;
  gaugeStatus: "en_cours" | "atteint" | "surplus" | "non_atteint";
  annualSaved: number;
  annualIncome: number;
  annualRate: number;
  trajectory: "avance" | "a_jour" | "rattrapage";
  chargesAdjusted: number;
  bigExpensesTotal: number;
  radTheo: number;
  radRestant: number | null; // null si aucun pointage
  radQuotidien: number | null;
  soldeTheo: number | null; // null si pas d'ancrage
  ecart: number | null;
}
