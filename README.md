# budgetee

PWA de gestion budgétaire personnelle : pointage bancaire, épargne avec rattrapage dynamique, créances/dettes hors budget.

## Stack

Next.js (App Router, Server Actions) · Supabase (PostgreSQL + Auth magic link) · Tailwind CSS 4 · Serwist (PWA) · Vercel.

## Modèle de données

Table unique `transactions` : chaque mouvement (revenu, épargne, charge fixe, grosse dépense, créance, dette, remboursement, pointage, solde initial) est une ligne datée. Aucune suppression physique (soft delete via `deleted_at`). Un trigger PostgreSQL historise chaque INSERT/UPDATE/DELETE dans `transaction_audit` avec l'état complet avant/après en JSONB — toutes les analyses futures restent possibles.

## Installation

```bash
npm install
cp .env.example .env.local   # renseigner URL, anon key, ADMIN_EMAIL
npm run dev
```

### Supabase

1. Exécuter `supabase/schema.sql` dans le SQL Editor.
2. Authentication → Providers : activer Email (magic link).
3. Se connecter une première fois avec l'email admin, puis désactiver "Allow new users to sign up" (le middleware vérifie aussi `ADMIN_EMAIL`).

### Déploiement Vercel

Importer le repo, définir les variables d'environnement (`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `ADMIN_EMAIL`, `NEXT_PUBLIC_SITE_URL`), déployer. Ajouter l'URL de production dans Supabase → Authentication → URL Configuration (Site URL + Redirect URLs `/auth/confirm`).

## Règles métier clés

- Cible d'épargne ajustée : `(E_annuel − cumul épargné) / mois restants` (mois courant inclus, jamais négative).
- RAD théorique : `revenu − épargne (réelle si versée, sinon cible ajustée) − charges ajustées − grosses dépenses`.
- Charges ajustées : montant réel si saisi, sinon prévu.
- Solde théorique : `solde initial + revenus − épargne versée − charges payées − grosses dépenses − prorata du budget courant` (RAD × jours écoulés / jours du mois). Δ = solde réel − solde théorique ; Δ < 0 = surconsommation.
- RAD restant réel : `solde réel − charges impayées − épargne restant à verser` ; RAD quotidien = RAD restant / jours restants.
- Créances/dettes : hors budget mensuel (impact 0 €), remboursements tracés via transactions liées.

## Tests

```bash
npm test   # vitest — logique métier pure (src/lib/finance.ts)
```
