"use client";

// Charges fixes [Label | Prévu | Réel éditable] + grosses dépenses avec
// simulateur d'impact sur le RAD.

import { useState } from "react";
import { addTransaction, removeTransaction, setChargeReal } from "@/actions/transactions";
import { addChargeTemplate } from "@/actions/settings";
import type { DashboardData } from "@/lib/types";
import { Card, InlineMoney, fmt } from "./ui";

export function ChargesFixes({ data }: { data: DashboardData }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");

  const addTemplate = async () => {
    const n = Number(amount.replace(",", "."));
    if (!label.trim() || Number.isNaN(n)) return;
    await addChargeTemplate(label.trim(), Math.round(n * 100) / 100);
    // Injection immédiate dans le mois courant
    await addTransaction({
      type: "fixed_charge",
      label: label.trim(),
      expected_amount: Math.round(n * 100) / 100,
      month: data.month,
    });
    setLabel("");
    setAmount("");
  };

  return (
    <Card title="Charges fixes">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-neutral-800 text-left text-xs text-neutral-500">
            <th className="pb-2 font-normal">Label</th>
            <th className="pb-2 text-right font-normal">Prévu</th>
            <th className="pb-2 text-right font-normal">Réel</th>
            <th className="pb-2" />
          </tr>
        </thead>
        <tbody>
          {data.charges.map((c) => (
            <tr key={c.id} className="border-b border-neutral-900">
              <td className="py-2">{c.label}</td>
              <td className="py-2 text-right tabular-nums text-neutral-400">
                {fmt(c.expected_amount)}
              </td>
              <td className="py-2 text-right">
                <InlineMoney
                  value={c.amount}
                  allowNull
                  onSave={(v) => setChargeReal(c.id, v)}
                  placeholder="prévu"
                />
              </td>
              <td className="py-2 pl-2 text-right">
                <button
                  onClick={() => removeTransaction(c.id)}
                  className="text-xs text-neutral-600 hover:text-red-400"
                  title="Retirer du mois"
                >
                  ✕
                </button>
              </td>
            </tr>
          ))}
          <tr>
            <td colSpan={2} className="pt-2 text-right font-medium">
              Total ajusté
            </td>
            <td className="pt-2 text-right font-semibold tabular-nums">
              {fmt(data.chargesAdjusted)}
            </td>
            <td />
          </tr>
        </tbody>
      </table>

      <div className="mt-3 flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Nouvelle charge (ex. Loyer)"
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
          onClick={addTemplate}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800"
        >
          Ajouter
        </button>
      </div>
    </Card>
  );
}

export function GrossesDepenses({ data }: { data: DashboardData }) {
  const [label, setLabel] = useState("");
  const [amount, setAmount] = useState("");
  const sim = Number(amount.replace(",", "."));
  const simValid = !Number.isNaN(sim) && amount.trim() !== "";

  const add = async () => {
    if (!simValid) return;
    await addTransaction({
      type: "big_expense",
      label: label.trim() || "Grosse dépense",
      amount: Math.round(sim * 100) / 100,
      month: data.month,
    });
    setLabel("");
    setAmount("");
  };

  return (
    <Card title="Grosses dépenses">
      {data.bigExpenses.length > 0 && (
        <ul className="mb-3 space-y-1 text-sm">
          {data.bigExpenses.map((e) => (
            <li key={e.id} className="flex items-center justify-between border-b border-neutral-900 py-1.5">
              <span>{e.label}</span>
              <span className="flex items-center gap-2">
                <span className="tabular-nums">{fmt(e.amount)}</span>
                <button
                  onClick={() => removeTransaction(e.id)}
                  className="text-xs text-neutral-600 hover:text-red-400"
                >
                  ✕
                </button>
              </span>
            </li>
          ))}
        </ul>
      )}

      <div className="flex gap-2">
        <input
          value={label}
          onChange={(e) => setLabel(e.target.value)}
          placeholder="Label (optionnel)"
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
          disabled={!simValid}
          className="rounded-md border border-neutral-700 px-3 py-1.5 text-sm hover:bg-neutral-800 disabled:opacity-40"
        >
          Enregistrer
        </button>
      </div>

      {simValid && (
        <p className="mt-2 text-sm text-neutral-400">
          Impact simulé : RAD {fmt(data.radTheo)} →{" "}
          <span className={data.radTheo - sim < 0 ? "font-medium text-red-400" : "font-medium text-neutral-200"}>
            {fmt(Math.round((data.radTheo - sim) * 100) / 100)}
          </span>
        </p>
      )}
    </Card>
  );
}
