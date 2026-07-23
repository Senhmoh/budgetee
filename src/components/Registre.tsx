"use client";

// Registre créances / dettes — hors budget mensuel (impact 0 € sur le RAD).

import { useState } from "react";
import { addTransaction, settleTransaction } from "@/actions/transactions";
import type { DashboardData, Transaction } from "@/lib/types";
import { Card, fmt } from "./ui";

function LoanTable({
  items,
  settleLabel,
  emptyLabel,
}: {
  items: Transaction[];
  settleLabel: string;
  emptyLabel: string;
}) {
  const open = items.filter((i) => i.status === "active");
  const settled = items.filter((i) => i.status === "settled");
  const [showSettled, setShowSettled] = useState(false);

  return (
    <div>
      {open.length === 0 && <p className="text-sm text-neutral-500">{emptyLabel}</p>}
      <ul className="space-y-1 text-sm">
        {open.map((i) => (
          <li key={i.id} className="flex items-center justify-between border-b border-neutral-900 py-1.5">
            <span>
              {i.label}
              <span className="ml-2 text-xs text-neutral-500">
                {new Date(i.occurred_at).toLocaleDateString("fr-FR")}
              </span>
            </span>
            <span className="flex items-center gap-3">
              <span className="font-medium tabular-nums">{fmt(i.amount)}</span>
              <button
                onClick={() => settleTransaction(i.id)}
                className="rounded border border-neutral-700 px-2 py-0.5 text-xs hover:bg-neutral-800"
              >
                {settleLabel}
              </button>
            </span>
          </li>
        ))}
      </ul>
      {settled.length > 0 && (
        <button
          onClick={() => setShowSettled(!showSettled)}
          className="mt-2 text-xs text-neutral-500 hover:text-neutral-300"
        >
          {showSettled ? "Masquer" : `Historique (${settled.length})`}
        </button>
      )}
      {showSettled && (
        <ul className="mt-1 space-y-1 text-sm text-neutral-500">
          {settled.map((i) => (
            <li key={i.id} className="flex justify-between py-1 line-through">
              <span>{i.label}</span>
              <span className="tabular-nums">{fmt(i.amount)}</span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function AddLoanForm({ type, month }: { type: "receivable" | "debt"; month: string }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const add = async () => {
    const n = Number(amount.replace(",", "."));
    if (!label.trim() || Number.isNaN(n)) return;
    await addTransaction({
      type,
      label: label.trim(),
      amount: Math.round(n * 100) / 100,
      month,
    });
    setLabel("");
    setAmount("");
  };

  return (
    <div className="mt-3 flex gap-2">
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        placeholder={type === "receivable" ? "Qui / quoi" : "À qui / quoi"}
        className="flex-1 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm outline-none focus:border-neutral-400"
      />
      <input
        value={amount}
        onChange={(e) => setAmount(e.target.value)}
        inputMode="decimal"
        placeholder="Montant"
        className="w-24 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-right text-sm outline-none focus:border-neutral-400"
      />
      <button
        onClick={add}
        className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
      >
        Ajouter
      </button>
    </div>
  );
}

export default function Registre({ data }: { data: DashboardData }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <Card title="Créances — on me doit">
        <LoanTable
          items={data.receivables}
          settleLabel="Marquer comme remboursé"
          emptyLabel="Aucune créance en cours."
        />
        <AddLoanForm type="receivable" month={data.month} />
      </Card>
      <Card title="Dettes — je dois">
        <LoanTable
          items={data.debts}
          settleLabel="Marquer comme payé"
          emptyLabel="Aucune dette en cours."
        />
        <AddLoanForm type="debt" month={data.month} />
      </Card>
    </div>
  );
}
