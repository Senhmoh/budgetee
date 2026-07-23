// ============================================================
// Chargement + calculs du dashboard (côté serveur).
// Initialise le mois si nécessaire (salaire, charges, ancrage),
// puis assemble toutes les données et métriques.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import {
  adjustedCharges,
  adjustedMonthlyTarget,
  annualSavingsRate,
  annualTrajectory,
  daysInMonth,
  ecartPointage,
  monthlySavingsRate,
  radQuotidien,
  radRestantReel,
  radTheorique,
  savingsGaugeStatus,
  soldeTheorique,
} from "@/lib/finance";
import type { DashboardData, Settings, Transaction } from "@/lib/types";

/**
 * Injections automatiques à l'ouverture d'un mois :
 * - revenu par défaut (1er du mois) si absent ;
 * - charges fixes depuis les modèles actifs si absentes ;
 * - ancrage de solde = dernier pointage connu, si absent.
 */
async function ensureMonthInitialized(month: string, settings: Settings) {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("transactions")
    .select("type")
    .eq("month", month)
    .is("deleted_at", null)
    .in("type", ["income", "fixed_charge", "balance_anchor"]);

  const types = new Set((existing ?? []).map((t) => t.type));
  const inserts: Record<string, unknown>[] = [];

  if (!types.has("income") && settings.default_income > 0) {
    inserts.push({
      type: "income",
      label: "Salaire",
      amount: settings.default_income,
      expected_amount: settings.default_income,
      month,
      occurred_at: month,
    });
  }

  if (!types.has("fixed_charge")) {
    const { data: templates } = await supabase
      .from("fixed_charge_templates")
      .select("*")
      .eq("active", true);
    for (const t of templates ?? []) {
      inserts.push({
        type: "fixed_charge",
        label: t.label,
        amount: null,
        expected_amount: t.default_amount,
        month,
        occurred_at: month,
        metadata: { template_id: t.id },
      });
    }
  }

  if (!types.has("balance_anchor")) {
    const { data: lastCheck } = await supabase
      .from("transactions")
      .select("amount")
      .eq("type", "balance_check")
      .lt("month", month)
      .is("deleted_at", null)
      .order("occurred_at", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (lastCheck?.amount != null) {
      inserts.push({
        type: "balance_anchor",
        label: "Solde initial (dernier pointage)",
        amount: lastCheck.amount,
        month,
        occurred_at: month,
      });
    }
  }

  if (inserts.length > 0) {
    await supabase.from("transactions").insert(inserts);
  }
}

export async function getDashboardData(month: string): Promise<DashboardData> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  // Settings (création à la volée au premier accès)
  let { data: settings } = await supabase
    .from("settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle();
  if (!settings) {
    const { data: created } = await supabase
      .from("settings")
      .upsert({ user_id: user.id }, { onConflict: "user_id" })
      .select()
      .single();
    settings = created;
  }
  const s = settings as Settings;

  await ensureMonthInitialized(month, s);

  const year = month.slice(0, 4);
  const monthNum = Number(month.slice(5, 7));

  // Transactions du mois
  const { data: monthTx } = await supabase
    .from("transactions")
    .select("*")
    .eq("month", month)
    .is("deleted_at", null)
    .order("created_at", { ascending: true });

  // Créances / dettes : toutes les actives (hors budget mensuel, toutes périodes)
  const { data: openLoans } = await supabase
    .from("transactions")
    .select("*")
    .in("type", ["receivable", "debt"])
    .is("deleted_at", null)
    .order("created_at", { ascending: false });

  // Agrégats annuels (revenus + épargne, jusqu'au mois courant inclus)
  const { data: yearTx } = await supabase
    .from("transactions")
    .select("type, amount, month")
    .gte("month", `${year}-01-01`)
    .lte("month", month)
    .in("type", ["income", "savings"])
    .is("deleted_at", null);

  const tx = (monthTx ?? []) as Transaction[];
  const pick = (t: string) => tx.filter((x) => x.type === t);

  const income = pick("income")[0] ?? null;
  const savings = pick("savings")[0] ?? null;
  const charges = pick("fixed_charge");
  const bigExpenses = pick("big_expense");
  const anchor = pick("balance_anchor")[0] ?? null;
  const checks = pick("balance_check");
  const lastBalanceCheck =
    checks.length > 0
      ? [...checks].sort((a, b) =>
          (b.occurred_at + b.created_at).localeCompare(a.occurred_at + a.created_at)
        )[0]
      : null;

  const receivables = (openLoans ?? []).filter((x) => x.type === "receivable") as Transaction[];
  const debts = (openLoans ?? []).filter((x) => x.type === "debt") as Transaction[];

  // ---- Calculs ----
  const annualSaved = (yearTx ?? [])
    .filter((x) => x.type === "savings")
    .reduce((sum, x) => sum + (x.amount ?? 0), 0);
  const annualIncome = (yearTx ?? [])
    .filter((x) => x.type === "income")
    .reduce((sum, x) => sum + (x.amount ?? 0), 0);

  const savedThisMonth = savings?.amount ?? 0;
  const savedBeforeThisMonth = annualSaved - savedThisMonth;
  const monthsRemaining = 12 - monthNum + 1; // mois courant inclus
  const adjustedTarget = adjustedMonthlyTarget(
    s.annual_savings_target,
    savedBeforeThisMonth,
    monthsRemaining
  );

  const incomeAmount = income?.amount ?? 0;
  const chargesAdjusted = adjustedCharges(
    charges.map((c) => ({ expected: c.expected_amount ?? 0, actual: c.amount }))
  );
  const bigExpensesTotal = bigExpenses.reduce((sum, x) => sum + (x.amount ?? 0), 0);
  const radTheo = radTheorique(
    incomeAmount,
    savedThisMonth,
    adjustedTarget,
    chargesAdjusted,
    bigExpensesTotal
  );

  const now = new Date();
  const isCurrentMonth =
    now.getFullYear() === Number(year) && now.getMonth() + 1 === monthNum;
  const dim = daysInMonth(Number(year), monthNum);
  const today = isCurrentMonth ? now.getDate() : dim;
  const monthIsOver = new Date(`${month}T00:00:00`) < new Date(now.getFullYear(), now.getMonth(), 1);

  const chargesPaid = charges.reduce((sum, c) => sum + (c.amount ?? 0), 0);
  const chargesUnpaidExpected = charges
    .filter((c) => c.amount == null)
    .reduce((sum, c) => sum + (c.expected_amount ?? 0), 0);

  let soldeTheo: number | null = null;
  let ecart: number | null = null;
  let radRestant: number | null = null;
  let radDaily: number | null = null;

  if (anchor?.amount != null) {
    soldeTheo = soldeTheorique({
      anchor: anchor.amount,
      income: incomeAmount,
      savingsDeposited: savedThisMonth,
      chargesPaid,
      bigExpensesTotal,
      radTheo,
      dayOfMonth: today,
      daysInMonth: dim,
    });
    if (lastBalanceCheck?.amount != null) {
      ecart = ecartPointage(lastBalanceCheck.amount, soldeTheo);
    }
  }
  if (lastBalanceCheck?.amount != null) {
    radRestant = radRestantReel({
      soldeReel: lastBalanceCheck.amount,
      chargesUnpaidExpected,
      savingsDeposited: savedThisMonth,
      adjustedTarget,
    });
    radDaily = radQuotidien(radRestant, dim - today + 1);
  }

  return {
    month,
    settings: s,
    income,
    savings,
    charges,
    bigExpenses,
    receivables,
    debts,
    anchor,
    lastBalanceCheck,
    adjustedTarget,
    monthlyRate: monthlySavingsRate(savedThisMonth, incomeAmount),
    gaugeStatus: savingsGaugeStatus(savedThisMonth, adjustedTarget, monthIsOver),
    annualSaved,
    annualIncome,
    annualRate: annualSavingsRate(annualSaved, annualIncome),
    trajectory: annualTrajectory(annualSaved, s.annual_savings_target, monthNum),
    chargesAdjusted,
    bigExpensesTotal,
    radTheo,
    radRestant,
    radQuotidien: radDaily,
    soldeTheo,
    ecart,
  };
}
