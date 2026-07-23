"use client";

// Petits composants partagés : format monétaire + édition inline.

import { useState } from "react";

export const fmt = (n: number | null | undefined, currency = "EUR") =>
  n == null
    ? "—"
    : new Intl.NumberFormat("fr-FR", { style: "currency", currency }).format(n);

/**
 * Montant éditable inline : clic → input → Entrée/blur → onSave(valeur).
 * Chaîne vide → onSave(null) si allowNull.
 */
export function InlineMoney({
  value,
  onSave,
  allowNull = false,
  className = "",
  placeholder = "—",
}: {
  value: number | null;
  onSave: (v: number | null) => Promise<void> | void;
  allowNull?: boolean;
  className?: string;
  placeholder?: string;
}) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [busy, setBusy] = useState(false);

  const commit = async () => {
    setEditing(false);
    const trimmed = draft.trim().replace(",", ".");
    if (trimmed === "") {
      if (allowNull && value !== null) {
        setBusy(true);
        await onSave(null);
        setBusy(false);
      }
      return;
    }
    const n = Number(trimmed);
    if (Number.isNaN(n) || n === value) return;
    setBusy(true);
    await onSave(Math.round(n * 100) / 100);
    setBusy(false);
  };

  if (editing) {
    return (
      <input
        autoFocus
        inputMode="decimal"
        defaultValue={value ?? ""}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter") (e.target as HTMLInputElement).blur();
          if (e.key === "Escape") setEditing(false);
        }}
        className={`w-24 rounded border border-neutral-600 bg-neutral-900 px-1 py-0.5 text-right text-sm outline-none focus:border-neutral-300 ${className}`}
      />
    );
  }

  return (
    <button
      type="button"
      onClick={() => {
        setDraft(String(value ?? ""));
        setEditing(true);
      }}
      className={`cursor-text rounded px-1 py-0.5 text-right tabular-nums underline decoration-dotted decoration-neutral-600 underline-offset-4 hover:bg-neutral-800 ${busy ? "opacity-50" : ""} ${className}`}
      title="Cliquer pour modifier"
    >
      {value == null ? placeholder : fmt(value)}
    </button>
  );
}

export function Card({
  title,
  children,
  accent,
}: {
  title: string;
  children: React.ReactNode;
  accent?: string;
}) {
  return (
    <section className={`rounded-xl border border-neutral-800 bg-neutral-950 p-4 ${accent ?? ""}`}>
      <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-neutral-500">
        {title}
      </h2>
      {children}
    </section>
  );
}
