-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Schéma initial (PRD §3.1)
-- ─────────────────────────────────────────────────────────────

create extension if not exists "uuid-ossp";
create extension if not exists "pgcrypto";

-- ══════════ Enums ══════════
do $$ begin
  create type user_role as enum ('user','coach');
exception when duplicate_object then null; end $$;

do $$ begin
  create type sex_type as enum ('F','M');
exception when duplicate_object then null; end $$;

do $$ begin
  create type meal_type_enum as enum ('breakfast','lunch','dinner','snack');
exception when duplicate_object then null; end $$;

do $$ begin
  create type activity_type_enum as enum (
    'youtube','gym','walk','run','cycling','swim','other'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type daily_status as enum ('complete','partial','empty');
exception when duplicate_object then null; end $$;

-- ══════════ profiles ══════════
create table if not exists public.profiles (
  id                uuid primary key references auth.users(id) on delete cascade,
  role              user_role not null default 'user',
  full_name         text,
  avatar_url        text,
  age               integer check (age is null or (age between 10 and 120)),
  sex               sex_type,
  height_cm         numeric(5,1) check (height_cm is null or height_cm between 100 and 230),
  current_weight_kg numeric(5,2) check (current_weight_kg is null or current_weight_kg between 30 and 300),
  goal_weight_kg    numeric(5,2) check (goal_weight_kg is null or goal_weight_kg between 30 and 300),
  activity_level    numeric(4,3) check (activity_level is null or activity_level between 1.0 and 2.0),
  deficit_kcal      integer check (deficit_kcal is null or deficit_kcal between 0 and 1500) default 500,
  tdee              integer,
  target_kcal       integer,
  coach_id          uuid references public.profiles(id) on delete set null,
  timezone          text default 'Africa/Libreville',
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);

create index if not exists idx_profiles_coach on public.profiles(coach_id);

-- ══════════ weight_logs ══════════
create table if not exists public.weight_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  weight_kg  numeric(5,2) not null,
  logged_at  date not null default current_date,
  note       text,
  created_at timestamptz not null default now(),
  unique (user_id, logged_at)
);
create index if not exists idx_weight_logs_user_date on public.weight_logs(user_id, logged_at desc);

-- ══════════ measurements ══════════
create table if not exists public.measurements (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  waist_cm        numeric(5,1),
  hips_cm         numeric(5,1),
  chest_cm        numeric(5,1),
  left_thigh_cm   numeric(5,1),
  right_thigh_cm  numeric(5,1),
  left_arm_cm     numeric(5,1),
  right_arm_cm    numeric(5,1),
  measured_at     date not null default current_date,
  created_at      timestamptz not null default now()
);
create index if not exists idx_measurements_user_date
  on public.measurements(user_id, measured_at desc);

-- ══════════ daily_logs ══════════
create table if not exists public.daily_logs (
  id                  uuid primary key default gen_random_uuid(),
  user_id             uuid not null references public.profiles(id) on delete cascade,
  log_date            date not null default current_date,
  total_kcal_eaten    integer not null default 0,
  total_kcal_burned   integer not null default 0,
  total_steps         integer not null default 0,
  steps_kcal_burned   integer not null default 0,
  net_kcal            integer not null default 0,
  target_kcal         integer,
  deficit_respected   boolean not null default true,
  coach_comment       text,
  coach_commented_at  timestamptz,
  status              daily_status not null default 'empty',
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now(),
  unique (user_id, log_date)
);
create index if not exists idx_daily_logs_user_date
  on public.daily_logs(user_id, log_date desc);

-- ══════════ meals ══════════
create table if not exists public.meals (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles(id) on delete cascade,
  daily_log_id    uuid not null references public.daily_logs(id) on delete cascade,
  name            text not null,
  meal_type       meal_type_enum not null,
  total_kcal      integer not null default 0,
  total_protein_g numeric(6,1) not null default 0,
  total_carbs_g   numeric(6,1) not null default 0,
  total_fat_g     numeric(6,1) not null default 0,
  media_urls      text[] default '{}',
  eaten_at        timestamptz not null default now(),
  notes           text,
  created_at      timestamptz not null default now()
);
create index if not exists idx_meals_daily on public.meals(daily_log_id);
create index if not exists idx_meals_user_time on public.meals(user_id, eaten_at desc);

-- ══════════ meal_items ══════════
create table if not exists public.meal_items (
  id            uuid primary key default gen_random_uuid(),
  meal_id       uuid not null references public.meals(id) on delete cascade,
  user_id       uuid not null references public.profiles(id) on delete cascade,
  food_name     text not null,
  quantity_g    numeric(7,1) not null check (quantity_g > 0),
  kcal_per_100g numeric(6,1) not null,
  kcal_total    numeric(7,1) generated always as ((quantity_g * kcal_per_100g) / 100) stored,
  protein_g     numeric(6,1) not null default 0,
  carbs_g       numeric(6,1) not null default 0,
  fat_g         numeric(6,1) not null default 0,
  fiber_g       numeric(5,1) not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists idx_meal_items_meal on public.meal_items(meal_id);

-- ══════════ activities ══════════
create table if not exists public.activities (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles(id) on delete cascade,
  daily_log_id      uuid not null references public.daily_logs(id) on delete cascade,
  activity_type     activity_type_enum not null,
  name              text not null,
  youtube_url       text,
  youtube_thumbnail text,
  duration_min      integer,
  kcal_burned       integer not null default 0,
  steps             integer,
  media_urls        text[] default '{}',
  notes             text,
  done_at           timestamptz not null default now(),
  created_at        timestamptz not null default now()
);
create index if not exists idx_activities_daily on public.activities(daily_log_id);
create index if not exists idx_activities_user_time on public.activities(user_id, done_at desc);

-- ══════════ food_database ══════════
create table if not exists public.food_database (
  id               uuid primary key default gen_random_uuid(),
  name             text not null,
  name_fr          text not null,
  kcal_per_100g    numeric(6,1) not null,
  protein_per_100g numeric(5,1) not null default 0,
  carbs_per_100g   numeric(5,1) not null default 0,
  fat_per_100g     numeric(5,1) not null default 0,
  fiber_per_100g   numeric(5,1) not null default 0,
  category         text,
  is_custom        boolean not null default false,
  created_by       uuid references public.profiles(id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists idx_food_name_fr on public.food_database using gin (to_tsvector('french', name_fr));
create index if not exists idx_food_category on public.food_database(category);

-- ══════════ notifications ══════════
create table if not exists public.notifications (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  type       text not null,
  title      text not null,
  body       text not null,
  is_read    boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists idx_notifications_user on public.notifications(user_id, created_at desc);

-- ══════════ push_subscriptions ══════════
create table if not exists public.push_subscriptions (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  endpoint   text not null unique,
  p256dh     text not null,
  auth       text not null,
  user_agent text,
  created_at timestamptz not null default now()
);
create index if not exists idx_push_user on public.push_subscriptions(user_id);
