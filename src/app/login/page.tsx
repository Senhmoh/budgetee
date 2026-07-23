import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

async function sendMagicLink(formData: FormData) {
  "use server";
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase();
  if (!email || (adminEmail && email !== adminEmail)) {
    redirect("/login?error=unauthorized");
  }
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"}/auth/confirm`,
    },
  });
  redirect(error ? "/login?error=send_failed" : "/login?sent=1");
}

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; sent?: string }>;
}) {
  const params = await searchParams;
  return (
    <main className="flex min-h-dvh items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-6">
        <div>
          <h1 className="text-2xl font-bold">budgetee</h1>
          <p className="text-sm text-neutral-400">Gestion budgétaire personnelle</p>
        </div>
        {params.sent ? (
          <p className="rounded-md border border-emerald-700 bg-emerald-950 p-3 text-sm text-emerald-300">
            Lien de connexion envoyé. Vérifie ta boîte mail.
          </p>
        ) : (
          <form action={sendMagicLink} className="space-y-3">
            <input
              type="email"
              name="email"
              required
              placeholder="Email"
              className="w-full rounded-md border border-neutral-700 bg-neutral-900 px-3 py-2 text-sm outline-none focus:border-neutral-400"
            />
            <button
              type="submit"
              className="w-full rounded-md bg-white px-3 py-2 text-sm font-medium text-black hover:bg-neutral-200"
            >
              Recevoir un lien magique
            </button>
          </form>
        )}
        {params.error === "unauthorized" && (
          <p className="text-sm text-red-400">Accès réservé à l&apos;administrateur.</p>
        )}
        {params.error === "send_failed" && (
          <p className="text-sm text-red-400">Échec de l&apos;envoi. Réessaie.</p>
        )}
      </div>
    </main>
  );
}
