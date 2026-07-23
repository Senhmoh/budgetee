"use server";

// ============================================================
// Server Actions — écritures sur le registre de transactions.
// Aucune suppression physique : soft delete (deleted_at) uniquement.
// Chaque écriture est historisée en base par le trigger d'audit.
// ============================================================

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import type { TransactionType } from "@/lib/types";

async function db() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");
  return { supabase, user };
}

function reval() {
  revalidatePath("/", "layout");
}

/** Création générique d'une transaction. */
export async function addTransaction(input: {
  type: TransactionType;
  label?: string;
  amount?: number | null;
  expected_amount?: number | null;
  month: string; // YYYY-MM-01
  occurred_at?: string;
  related_id?: string | null;
  notes?: string;
}) {
  const { supabase } = await db();
  const { error } = await supabase.from("transactions").insert({
    type: input.type,
    label: input.label ?? "",
    amount: input.amount ?? null,
    expected_amount: input.expected_amount ?? null,
    month: input.month,
    occurred_at: input.occurred_at ?? new Date().toISOString().slice(0, 10),
    related_id: input.related_id ?? null,
    notes: input.notes ?? null,
  });
  if (error) throw new Error(error.message);
  reval();
}

/** Mise à jour partielle (montant, label, notes…). */
export async function updateTransaction(
  id: string,
  patch: Partial<{
    label: string;
    amount: number | null;
    expected_amount: number | null;
    occurred_at: string;
    notes: string;
  }>
) {
  const { supabase } = await db();
  const { error } = await supabase.from("transactions").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  reval();
}

/** Soft delete : la ligne reste en base (deleted_at) + audit. */
export async function removeTransaction(id: string) {
  const { supabase } = await db();
  const { error } = await supabase
    .from("transactions")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw new Error(error.message);
  reval();
}

/**
 * Marquer une créance comme remboursée / une dette comme payée.
 * Crée une transaction `repayment` liée (traçabilité) et passe la ligne
 * d'origine en `settled`. Aucun impact sur les revenus du mois.
 */
export async function settleTransaction(id: string) {
  const { supabase } = await db();
  const { data: origin, error: e1 } = await supabase
    .from("transactions")
    .select("*")
    .eq("id", id)
    .single();
  if (e1 || !origin) throw new Error(e1?.message ?? "Introuvable");

  const today = new Date();
  const monthKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-01`;

  const { error: e2 } = await supabase.from("transactions").insert({
    type: "repayment",
    label: `Remboursement — ${origin.label}`,
    amount: origin.amount,
    month: monthKey,
    occurred_at: today.toISOString().slice(0, 10),
    related_id: origin.id,
  });
  if (e2) throw new Error(e2.message);

  const { error: e3 } = await supabase
    .from("transactions")
    .update({ status: "settled", settled_at: new Date().toISOString() })
    .eq("id", id);
  if (e3) throw new Error(e3.message);
  reval();
}

/** Écraser le montant réel d'une charge fixe du mois (null = revenir au prévu). */
export async function setChargeReal(id: string, amount: number | null) {
  await updateTransaction(id, { amount });
}

/** Ajuster le revenu du mois courant (sans toucher au défaut ni à l'historique). */
export async function setMonthIncome(id: string, amount: number) {
  await updateTransaction(id, { amount });
}

/** Enregistrer / modifier l'épargne réellement versée pour un mois. */
export async function setMonthSavings(month: string, amount: number, existingId?: string) {
  if (existingId) {
    await updateTransaction(existingId, { amount });
  } else {
    await addTransaction({ type: "savings", label: "Épargne du mois", amount, month });
  }
}

/** Pointage : enregistrer le solde réel constaté. */
export async function addBalanceCheck(month: string, amount: number) {
  await addTransaction({ type: "balance_check", label: "Pointage", amount, month });
}

/** Modifier le solde d'ancrage du mois (solde initial). */
export async function setAnchor(month: string, amount: number, existingId?: string) {
  if (existingId) {
    await updateTransaction(existingId, { amount });
  } else {
    await addTransaction({ type: "balance_anchor", label: "Solde initial", amount, month });
  }
}
