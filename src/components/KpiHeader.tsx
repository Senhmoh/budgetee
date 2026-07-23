"use client";

// KPIs d'en-tête : revenu éditable, jauge d'épargne (4 états), bilan annuel.

import { setMonthIncome, setMonthSavings } from "@/actions/transactions";
import type { DashboardData } from "@/lib/types";
import { Card, InlineMoney, fmt } from "./ui";

const GAUGE_STYLES: Record<DashboardData["gaugeStatus"], { label: string; cls: string; bar: string }> = {
  en_cours: { label: "En cours", cls: "text-neutral-300", bar: "bg-sky-500" },
  atteint: { label: "Objectif atteint", cls: "text-emerald-400", bar: "bg-emerald-500" },
  surplus: { label: "Dépassé", cls: "text-lime-300", bar: "bg-lime-400" },
  non_atteint: { label: "Non atteint", cls: "text-red-400", bar: "bg-red-500" },
};

const TRAJ_LABELS: Record<DashboardData["trajectory"], { label: string; cls: string }> = {
  avance: { label: "En avance", cls: "text-emerald-400" },
  a_jour: { label: "À jour", cls: "text-neutral-300" },
  rattrapage: { label: "Rattrapage en cours", cls: "text-amber-400" },
};

export default function KpiHeader({ data }: { data: DashboardData }) {
  const saved = data.savings?.amount ?? 0;
  const surplus = saved - data.adjustedTarget;
  const gauge = GAUGE_STYLES[data.gaugeStatus];
  const traj = TRAJ_LABELS[data.trajectory];
  const pct =
    data.adjustedTarget > 0 ? Math.min(100, (saved / data.adjustedTarget) * 100) : saved > 0 ? 100 : 0;

  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <Card title="Revenu du mois">
        <div className="flex items-baseline justify-between">
          <InlineMoney
            value={data.income?.amount ?? null}
            onSave={async (v) => {
              if (data.income && v != null) await setMonthIncome(data.income.id, v);
            }}
            className="text-2xl font-bold"
          />
        </div>
        <p className="mt-2 text-sm text-neutral-400">
          Taux d&apos;épargne mensuel :{" "}
          <span className="font-medium text-neutral-200">{data.monthlyRate} %</span>
        </p>
        {data.income?.expected_amount != null &&
          data.income.amount !== data.income.expected_amount && (
            <p className="mt-1 text-xs text-neutral-500">
              Défaut : {fmt(data.income.expected_amount)} (inchangé)
            </p>
          )}
      </Card>

      <Card title="Épargne mensuelle">
        <div className="flex items-baseline justify-between gap-2">
          <InlineMoney
            value={data.savings?.amount ?? null}
            onSave={async (v) => {
              if (v != null) await setMonthSavings(data.month, v, data.savings?.id);
            }}
            className="text-2xl font-bold"
            placeholder="Saisir"
          />
          <span className="text-sm text-neutral-400">/ {fmt(data.adjustedTarget)}</span>
        </div>
        <div className="mt-3 h-2 w-full overflow-hidden rounded-full bg-neutral-800">
          <div className={`h-full ${gauge.bar}`} style={{ width: `${pct}%` }} />
        </div>
        <p className={`mt-2 text-sm font-medium ${gauge.cls}`}>
          {gauge.label}
          {data.gaugeStatus === "surplus" && (
            <span className="ml-2 rounded bg-lime-400/10 px-1.5 py-0.5 text-xs font-bold text-lime-300">
              +{fmt(surplus)} vs Objectif
            </span>
          )}
        </p>
        <p className="mt-1 text-xs text-neutral-500">
          Cible ajustée (rattrapage dynamique inclus)
        </p>
      </Card>

      <Card title="Bilan annuel">
        <p className="text-2xl font-bold tabular-nums">{fmt(data.annualSaved)}</p>
        <p className="mt-2 text-sm text-neutral-400">
          Taux annuel : <span className="font-medium text-neutral-200">{data.annualRate} %</span>
          <span className="mx-2 text-neutral-700">·</span>
          Cible : {fmt(data.settings.annual_savings_target)}
        </p>
        <p className={`mt-1 text-sm font-medium ${traj.cls}`}>{traj.label}</p>
      </Card>
    </div>
  );
}
