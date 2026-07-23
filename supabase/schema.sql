-- ============================================================
-- budgetee — Schéma Supabase (PostgreSQL)
-- Registre de transactions unique + audit complet + RLS
-- À exécuter dans le SQL Editor de Supabase.
-- ============================================================

-- ---------- 1. Table settings (paramètres utilisateur) ----------
create table if not exists public.settings (
  user_id uuid primary key default auth.uid() references auth.users (id) on delete cascade,
  default_income numeric(12, 2) not null default 0,
  monthly_savings_target numeric(12, 2) not null default 0,
  annual_savings_target numeric(12, 2) not null default 0,
  currency text not null default 'EUR',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 2. Modèles de charges fixes ----------
create table if not exists public.fixed_charge_templates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  label text not null,
  default_amount numeric(12, 2) not null,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- 3. Registre des transactions (source de vérité) ----------
-- Chaque mouvement financier, quel que soit son type, est une ligne.
-- Rien n'est supprimé physiquement (soft delete via deleted_at).
create table if not exists public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users (id) on delete cascade,
  type text not null check (
    type in (
      'income',          -- revenu du mois
      'savings',         -- épargne réellement versée
      'fixed_charge',    -- charge fixe (expected = prévu, amount = réel payé)
      'big_expense',     -- grosse dépense ponctuelle
      'receivable',      -- créance : on me doit (hors budget)
      'debt',            -- dette : je dois (hors budget)
      'repayment',       -- remboursement lié à une créance/dette (related_id)
      'balance_check',   -- pointage : solde réel constaté
      'balance_anchor'   -- solde initial du mois (ancrage du solde théorique)
    )
  ),
  label text not null default '',
  amount numeric(12, 2),           -- montant réel (null = charge fixe pas encore payée)
  expected_amount numeric(12, 2),  -- montant prévu (charges fixes, salaire par défaut)
  month date not null,             -- 1er jour du mois de rattachement
  occurred_at date not null default current_date,
  related_id uuid references public.transactions (id),
  status text not null default 'active' check (status in ('active', 'settled')),
  settled_at timestamptz,
  deleted_at timestamptz,          -- soft delete : jamais de DELETE physique côté app
  notes text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_transactions_user_month on public.transactions (user_id, month);
create index if not exists idx_transactions_type on public.transactions (user_id, type);

-- ---------- 4. Journal d'audit ----------
-- Historise automatiquement chaque INSERT / UPDATE / DELETE sur transactions,
-- avec l'état complet avant/après en JSONB. Base de toute analyse future.
create table if not exists public.transaction_audit (
  id bigint generated always as identity primary key,
  transaction_id uuid not null,
  user_id uuid,
  action text not null check (action in ('INSERT', 'UPDATE', 'DELETE')),
  old_data jsonb,
  new_data jsonb,
  changed_at timestamptz not null default now()
);

create index if not exists idx_audit_transaction on public.transaction_audit (transaction_id);

create or replace function public.log_transaction_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.transaction_audit (transaction_id, user_id, action, new_data)
    values (new.id, new.user_id, 'INSERT', to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.transaction_audit (transaction_id, user_id, action, old_data, new_data)
    values (new.id, new.user_id, 'UPDATE', to_jsonb(old), to_jsonb(new));
    return new;
  else
    insert into public.transaction_audit (transaction_id, user_id, action, old_data)
    values (old.id, old.user_id, 'DELETE', to_jsonb(old));
    return old;
  end if;
end;
$$;

drop trigger if exists trg_transactions_audit on public.transactions;
create trigger trg_transactions_audit
after insert or update or delete on public.transactions
for each row execute function public.log_transaction_change();

-- ---------- 5. updated_at automatique ----------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_transactions_updated on public.transactions;
create trigger trg_transactions_updated
before update on public.transactions
for each row execute function public.set_updated_at();

drop trigger if exists trg_settings_updated on public.settings;
create trigger trg_settings_updated
before update on public.settings
for each row execute function public.set_updated_at();

drop trigger if exists trg_templates_updated on public.fixed_charge_templates;
create trigger trg_templates_updated
before update on public.fixed_charge_templates
for each row execute function public.set_updated_at();

-- ---------- 6. RLS : accès strictement limité à l'utilisateur ----------
alter table public.settings enable row level security;
alter table public.fixed_charge_templates enable row level security;
alter table public.transactions enable row level security;
alter table public.transaction_audit enable row level security;

drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own templates" on public.fixed_charge_templates;
create policy "own templates" on public.fixed_charge_templates
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "own transactions" on public.transactions;
create policy "own transactions" on public.transactions
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Audit : lecture seule pour l'utilisateur, écriture uniquement via trigger (security definer)
drop policy if exists "read own audit" on public.transaction_audit;
create policy "read own audit" on public.transaction_audit
  for select using (user_id = auth.uid());

-- ============================================================
-- Après exécution :
-- 1. Authentication > Providers : activer Email (magic link).
-- 2. Se connecter une première fois avec l'email admin,
--    puis Authentication > Settings : désactiver "Allow new users to sign up".
--    (L'app vérifie aussi ADMIN_EMAIL côté middleware.)
-- ============================================================
