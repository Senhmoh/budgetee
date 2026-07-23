"use client";

// Pointage bancaire : saisie du solde réel, RAD quotidien/mensuel, écart Δ.

import { useState } from "react";
import { addBalanceCheck, setAnchor } from "@/actions/transactions";
import type { DashboardData } from "@/lib/types";
import { Card, InlineMoney, fmt } from "./ui";

export default function Pointage({ data }: { data: DashboardData }) {
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    const n = Number(draft.trim().replace(",", "."));
    if (Number.isNaN(n) || draft.trim() === "") return;
    setBusy(true);
    await addBalanceCheck(data.month, Math.round(n * 100) / 100);
    setDraft("");
    setBusy(false);
  };

  return (
    <Card title="Pointage bancaire">
      <div className="flex flex-wrap items-end gap-3">
        <div>
          <label className="mb-1 block text-xs text-neutral-500">Solde réel constaté</label>
          <div className="flex gap-2">
            <input
              inputMode="decimal"
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submit()}
              placeholder={data.lastBalanceCheck ? fmt(data.lastBalanceCheck.amount) : "0,00 €"}
              className="w-32 rounded-md border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-neutral-400"
            />
            <button
              onClick={submit}
              disabled={busy}
              className="rounded-md bg-white px-3 py-1.5 text-sm font-medium text-black hover:bg-neutral-200 disabled:opacity-50"
            >
              Pointer
            </button>
          </div>
        </div>
        <div className="text-sm text-neutral-400">
          Solde initial du mois :{" "}
          <InlineMoney
            value={data.anchor?.amount ?? null}
            onSave={async (v) => {
              if (v != null) await setAnchor(data.month, v, data.anchor?.id);
            }}
            placeholder="Définir"
          />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Metric label="RAD mensuel (théorique)" value={fmt(data.radTheo)} />
        <Metric
          label="RAD restant (réel)"
          value={data.radRestant != null ? fmt(data.radRestant) : "— pointer d'abord"
          }
          cls={data.radRestant != null && data.radRestant < 0 ? "text-red-400" : ""}
        />
        <Metric
          label="RAD quotidien"
          value={data.radQuotidien != null ? fmt(data.radQuotidien) : "—"}
        />
        <Metric
          label="Écart Δ (réel − théorique)"
          value={data.ecart != null ? fmt(data.ecart) : "—"}
          cls={
            data.ecart == null ? "" : data.ecart < 0 ? "text-red-400" : "text-emerald-400"
          }
          sub={
            data.ecart == null
              ? undefined
              : data.ecart < 0
                ? "Surconsommation"
                : "Budget respecté"
          }
        />
      </div>
      {data.lastBalanceCheck && (
        <p className="mt-3 text-xs text-neutral-500">
          Dernier pointage : {fmt(data.lastBalanceCheck.amount)} le{" "}
          {new Date(data.lastBalanceCheck.occurred_at).toLocaleDateString("fr-FR")}
        </p>
      )}
    </Card>
  );
}

function Metric({
  label,
  value,
  cls = "",
  sub,
}: {
  label: string;
  value: string;
  cls?: string;
  sub?: string;
}) {
  return (
    <div className="rounded-lg bg-neutral-900 p-3">
      <p className="text-xs text-neutral-500">{label}</p>
      <p className={`mt-1 text-lg font-semibold tabular-nums ${cls}`}>{value}</p>
      {sub && <p className={`text-xs ${cls}`}>{sub}</p>}
    </div>
  );
}
