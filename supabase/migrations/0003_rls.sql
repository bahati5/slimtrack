-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Row Level Security (PRD §3.3)
-- ─────────────────────────────────────────────────────────────

alter table public.profiles           enable row level security;
alter table public.weight_logs        enable row level security;
alter table public.measurements       enable row level security;
alter table public.daily_logs         enable row level security;
alter table public.meals              enable row level security;
alter table public.meal_items         enable row level security;
alter table public.activities         enable row level security;
alter table public.food_database      enable row level security;
alter table public.notifications      enable row level security;
alter table public.push_subscriptions enable row level security;

-- ══════════ Helper : le user courant est-il le coach de target_user ? ══════════
create or replace function public.is_coach_of(target_user uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = target_user and coach_id = auth.uid()
  );
$$;

-- ══════════ profiles ══════════
drop policy if exists "profiles: owner or coach can select" on public.profiles;
create policy "profiles: owner or coach can select"
  on public.profiles for select using (
    id = auth.uid() or coach_id = auth.uid()
  );

drop policy if exists "profiles: owner can update" on public.profiles;
create policy "profiles: owner can update"
  on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "profiles: owner can insert" on public.profiles;
create policy "profiles: owner can insert"
  on public.profiles for insert with check (id = auth.uid());

-- ══════════ daily_logs ══════════
drop policy if exists "daily_logs: owner or coach" on public.daily_logs;
create policy "daily_logs: owner or coach"
  on public.daily_logs for select using (
    user_id = auth.uid() or public.is_coach_of(user_id)
  );

drop policy if exists "daily_logs: owner write" on public.daily_logs;
create policy "daily_logs: owner write"
  on public.daily_logs for insert with check (user_id = auth.uid());

drop policy if exists "daily_logs: owner update" on public.daily_logs;
create policy "daily_logs: owner update"
  on public.daily_logs for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Le coach peut UPDATE uniquement le champ coach_comment.
drop policy if exists "daily_logs: coach comment" on public.daily_logs;
create policy "daily_logs: coach comment"
  on public.daily_logs for update using (public.is_coach_of(user_id))
  with check (public.is_coach_of(user_id));

drop policy if exists "daily_logs: owner delete" on public.daily_logs;
create policy "daily_logs: owner delete"
  on public.daily_logs for delete using (user_id = auth.uid());

-- ══════════ meals ══════════
drop policy if exists "meals: owner all" on public.meals;
create policy "meals: owner all"
  on public.meals for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid());

-- ══════════ meal_items ══════════
drop policy if exists "meal_items: owner all" on public.meal_items;
create policy "meal_items: owner all"
  on public.meal_items for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid());

-- ══════════ activities ══════════
drop policy if exists "activities: owner all" on public.activities;
create policy "activities: owner all"
  on public.activities for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid());

-- ══════════ weight_logs ══════════
drop policy if exists "weight_logs: owner all" on public.weight_logs;
create policy "weight_logs: owner all"
  on public.weight_logs for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid());

-- ══════════ measurements ══════════
drop policy if exists "measurements: owner all" on public.measurements;
create policy "measurements: owner all"
  on public.measurements for all
  using (user_id = auth.uid() or public.is_coach_of(user_id))
  with check (user_id = auth.uid());

-- ══════════ food_database ══════════
drop policy if exists "food: public select" on public.food_database;
create policy "food: public select"
  on public.food_database for select using (true);

drop policy if exists "food: authenticated insert" on public.food_database;
create policy "food: authenticated insert"
  on public.food_database for insert
  with check (auth.role() = 'authenticated' and (created_by = auth.uid() or created_by is null));

drop policy if exists "food: creator update" on public.food_database;
create policy "food: creator update"
  on public.food_database for update using (created_by = auth.uid());

drop policy if exists "food: creator delete" on public.food_database;
create policy "food: creator delete"
  on public.food_database for delete using (created_by = auth.uid());

-- ══════════ notifications ══════════
drop policy if exists "notif: owner select" on public.notifications;
create policy "notif: owner select"
  on public.notifications for select using (user_id = auth.uid());

drop policy if exists "notif: owner update" on public.notifications;
create policy "notif: owner update"
  on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());

-- ══════════ push_subscriptions ══════════
drop policy if exists "push: owner all" on public.push_subscriptions;
create policy "push: owner all"
  on public.push_subscriptions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
