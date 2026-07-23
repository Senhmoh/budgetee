import Link from "next/link";
import { getDashboardData } from "@/lib/dashboard";
import { monthKey } from "@/lib/finance";
import KpiHeader from "@/components/KpiHeader";
import Pointage from "@/components/Pointage";
import { ChargesFixes, GrossesDepenses } from "@/components/Charges";
import Registre from "@/components/Registre";
import SettingsPanel from "@/components/SettingsPanel";

export const dynamic = "force-dynamic";

function shiftMonth(month: string, delta: number): string {
  const d = new Date(`${month}T00:00:00`);
  d.setMonth(d.getMonth() + delta);
  return monthKey(d);
}

export default async function Dashboard({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const params = await searchParams;
  const month =
    params.month && /^\d{4}-\d{2}-01$/.test(params.month)
      ? params.month
      : monthKey(new Date());

  const data = await getDashboardData(month);
  const monthLabel = new Date(`${month}T00:00:00`).toLocaleDateString("fr-FR", {
    month: "long",
    year: "numeric",
  });

  return (
    <main className="mx-auto max-w-5xl space-y-4 p-4 pb-16 sm:p-6">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-bold">budgetee</h1>
        <nav className="flex items-center gap-3 text-sm">
          <Link
            href={`/?month=${shiftMonth(month, -1)}`}
            className="rounded border border-neutral-800 px-2 py-1 hover:bg-neutral-900"
          >
            ←
          </Link>
          <span className="min-w-32 text-center font-medium capitalize">{monthLabel}</span>
          <Link
            href={`/?month=${shiftMonth(month, 1)}`}
            className="rounded border border-neutral-800 px-2 py-1 hover:bg-neutral-900"
          >
            →
          </Link>
        </nav>
      </header>

      <KpiHeader data={data} />
      <Pointage data={data} />

      <div className="grid gap-4 lg:grid-cols-2">
        <ChargesFixes data={data} />
        <GrossesDepenses data={data} />
      </div>

      <Registre data={data} />
      <SettingsPanel settings={data.settings} />
    </main>
  );
}
