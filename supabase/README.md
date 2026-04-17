# Supabase — SlimTrack

Tout le métier de SlimTrack vit ici : schéma, triggers, RLS, Edge Functions.

## Mise en place

### Option A — SQL Editor (simple)

1. Ouvre ton projet sur [supabase.com](https://supabase.com) → **SQL Editor**.
2. Colle le contenu de chaque fichier `migrations/*.sql` **dans l'ordre** :
   - `0001_schema.sql` — tables & enums
   - `0002_triggers.sql` — triggers PL/pgSQL (Mifflin-St Jeor, recalc meals/daily_logs, kcal pas)
   - `0003_rls.sql` — Row Level Security
   - `0004_seed_food.sql` — base d'aliments FR (~120 aliments courants)
3. Dans **Authentication → URL Configuration**, ajoute au minimum :
   - `http://localhost:3000/auth/callback` (lien magique + réinitialisation mot de passe via PKCE)
   - `http://localhost:3000/auth/update-password` (page de choix du nouveau mot de passe après redirection)
   - En prod, les mêmes chemins avec ton domaine. Tu peux aussi utiliser un motif du type `http://localhost:3000/auth/**` si ton projet Supabase l’accepte.
4. Copie `URL` + `anon` key + `service_role` key dans `.env.local`.

### Option B — Supabase CLI

```bash
pnpm dlx supabase login
pnpm dlx supabase link --project-ref <ton-project-ref>
pnpm dlx supabase db push
```

### Générer les types TypeScript

```bash
pnpm dlx supabase gen types typescript --project-id <ref> --schema public > types/database.ts
```

## Edge Functions

- `functions/push-reminders` — cron 12h/19h → envoie un rappel push si pas de log du jour.
- `functions/coach-notify` — déclenché par trigger sur `daily_logs.coach_comment` → notifie la cliente.

```bash
pnpm dlx supabase functions deploy push-reminders
pnpm dlx supabase functions deploy coach-notify
```

Secrets à définir sur Supabase (Functions → Secrets) :

- `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`
- `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (présents par défaut)
