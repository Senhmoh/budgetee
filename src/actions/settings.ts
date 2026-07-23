"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function updateSettings(patch: {
  default_income?: number;
  monthly_savings_target?: number;
  annual_savings_target?: number;
}) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) throw new Error("Non authentifié");

  const { error } = await supabase
    .from("settings")
    .upsert({ user_id: user.id, ...patch }, { onConflict: "user_id" });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function addChargeTemplate(label: string, default_amount: number) {
  const supabase = await createClient();
  const { error } = await supabase
    .from("fixed_charge_templates")
    .insert({ label, default_amount });
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function updateChargeTemplate(
  id: string,
  patch: Partial<{ label: string; default_amount: number; active: boolean }>
) {
  const supabase = await createClient();
  const { error } = await supabase.from("fixed_charge_templates").update(patch).eq("id", id);
  if (error) throw new Error(error.message);
  revalidatePath("/", "layout");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
}
