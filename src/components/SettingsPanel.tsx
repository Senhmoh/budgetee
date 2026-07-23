"use client";

// Paramètres : salaire par défaut, cibles d'épargne mensuelle et annuelle.

import { updateSettings, signOut } from "@/actions/settings";
import type { Settings } from "@/lib/types";
import { Card, InlineMoney } from "./ui";

export default function SettingsPanel({ settings }: { settings: Settings }) {
  return (
    <Card title="Paramètres">
      <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-3">
        <div className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900 p-3">
          <span className="text-neutral-400">Salaire par défaut</span>
          <InlineMoney
            value={settings.default_income}
            onSave={async (v) => {
              if (v != null) await updateSettings({ default_income: v });
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900 p-3">
          <span className="text-neutral-400">Cible épargne / mois</span>
          <InlineMoney
            value={settings.monthly_savings_target}
            onSave={async (v) => {
              if (v != null) await updateSettings({ monthly_savings_target: v });
            }}
          />
        </div>
        <div className="flex items-center justify-between gap-2 rounded-lg bg-neutral-900 p-3">
          <span className="text-neutral-400">Cible épargne / an</span>
          <InlineMoney
            value={settings.annual_savings_target}
            onSave={async (v) => {
              if (v != null) await updateSettings({ annual_savings_target: v });
            }}
          />
        </div>
      </div>
      <button
        onClick={() => signOut()}
        className="mt-3 text-xs text-neutral-600 hover:text-neutral-300"
      >
        Se déconnecter
      </button>
    </Card>
  );
}
