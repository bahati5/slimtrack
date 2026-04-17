-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Rôle admin + policies bypass
-- À exécuter APRÈS les migrations 0001 → 0004.
-- ─────────────────────────────────────────────────────────────

-- ══════════ 1. Ajouter 'admin' à l'enum user_role ══════════
-- `alter type ... add value` est idempotent depuis Postgres 12 avec `if not exists`.
alter type public.user_role add value if not exists 'admin';

-- ══════════ 2. Helper : le user courant est-il admin ? ══════════
-- Note : on cast role::text pour éviter l'erreur 55P04 "unsafe use of new
-- enum value 'admin'" lorsque cette migration s'exécute dans la même
-- transaction que le ALTER TYPE (cas du SQL Editor Supabase).
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role::text = 'admin'
  );
$$;

-- ══════════ 3. Policies admin : bypass en lecture / écriture ══════════
-- Convention : on crée des policies additives « admin: full access » qui
-- s'ajoutent aux policies user/coach existantes (RLS = OR entre policies).

-- ---- profiles ----
drop policy if exists "admin: full access profiles" on public.profiles;
create policy "admin: full access profiles"
  on public.profiles for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- weight_logs ----
drop policy if exists "admin: full access weight_logs" on public.weight_logs;
create policy "admin: full access weight_logs"
  on public.weight_logs for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- measurements ----
drop policy if exists "admin: full access measurements" on public.measurements;
create policy "admin: full access measurements"
  on public.measurements for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- daily_logs ----
drop policy if exists "admin: full access daily_logs" on public.daily_logs;
create policy "admin: full access daily_logs"
  on public.daily_logs for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- meals ----
drop policy if exists "admin: full access meals" on public.meals;
create policy "admin: full access meals"
  on public.meals for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- meal_items ----
drop policy if exists "admin: full access meal_items" on public.meal_items;
create policy "admin: full access meal_items"
  on public.meal_items for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- activities ----
drop policy if exists "admin: full access activities" on public.activities;
create policy "admin: full access activities"
  on public.activities for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- food_database ----
drop policy if exists "admin: full access food_database" on public.food_database;
create policy "admin: full access food_database"
  on public.food_database for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- notifications ----
drop policy if exists "admin: full access notifications" on public.notifications;
create policy "admin: full access notifications"
  on public.notifications for all
  using (public.is_admin())
  with check (public.is_admin());

-- ---- push_subscriptions ----
drop policy if exists "admin: full access push_subscriptions" on public.push_subscriptions;
create policy "admin: full access push_subscriptions"
  on public.push_subscriptions for all
  using (public.is_admin())
  with check (public.is_admin());

-- ══════════ 4. Empêcher qu'un user quelconque se self-promeuve ══════════
-- La policy "profiles: owner can update" existante permet à un user de
-- modifier sa propre ligne — ce qui inclut `role` et `coach_id`. On remplace
-- par une version qui bloque toute élévation de privilège.
drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update"
  on public.profiles for update
  using (id = auth.uid())
  with check (
    id = auth.uid()
    -- Le rôle ne peut pas changer sauf si on est admin (autre policy).
    and role = (select role from public.profiles p where p.id = auth.uid())
  );

-- ══════════ 5. (Optionnel) Promouvoir le premier admin ══════════
-- ⚠️ À exécuter dans un **second run SQL** (après avoir exécuté ce fichier une
-- première fois), car un ALTER TYPE ne peut pas coexister avec l'usage de la
-- nouvelle valeur dans la même transaction.
--
--   update public.profiles
--   set role = 'admin'
--   where id = (select id from auth.users where email = 'ton-email@example.com');
