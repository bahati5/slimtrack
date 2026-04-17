-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Database Webhooks pour les notifications push
-- À exécuter APRÈS 0007.
--
-- Ces triggers appellent les Edge Functions Supabase via pg_net quand :
--   1. daily_logs.status change  → notifie le COACH  (client-log-notify)
--   2. daily_logs.coach_comment  → notifie la CLIENTE (coach-notify)
--
-- ÉTAPE UNIQUE REQUISE : exécuter slim_track_configure() une fois
-- depuis le SQL Editor Supabase après avoir rempli les valeurs ci-dessous.
-- ─────────────────────────────────────────────────────────────

-- Active pg_net (HTTP depuis Postgres — disponible sur Supabase Cloud)
create extension if not exists pg_net schema extensions;

-- ══════════ 1. Table de configuration (1 ligne) ══════════
-- Stocke l'URL de base et la service_role_key de façon sécurisée en base.
-- RLS désactivée (lecture security definer uniquement depuis les triggers).
create table if not exists public.app_config (
  key   text primary key,
  value text not null
);
revoke all on public.app_config from anon, authenticated;

-- ══════════ 2. Fonction de configuration ══════════
-- Appeler UNE FOIS depuis le SQL Editor après la migration :
--
--   select public.slim_track_configure(
--     'https://TONPROJECTREF.supabase.co',
--     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'   -- service_role key
--   );
--
create or replace function public.slim_track_configure(
  p_supabase_url  text,
  p_service_key   text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.app_config (key, value)
  values
    ('supabase_url', p_supabase_url),
    ('service_role_key', p_service_key)
  on conflict (key) do update set value = excluded.value;
end;
$$;

grant execute on function public.slim_track_configure(text, text) to postgres;

-- ══════════ 3. Helpers internes ══════════
create or replace function public._cfg(p_key text)
returns text
language sql
security definer
stable
set search_path = public
as $$
  select value from public.app_config where key = p_key;
$$;

-- ══════════ 4. Trigger : daily_logs UPDATE → client-log-notify (coach) ══════════
create or replace function public.trg_notify_coach_on_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  if new.status = 'empty' then return new; end if;
  if new.status = old.status and new.total_kcal_eaten = old.total_kcal_eaten then
    return new;
  end if;

  v_url := public._cfg('supabase_url') || '/functions/v1/client-log-notify';
  v_key := public._cfg('service_role_key');
  if v_url is null or v_key is null then return new; end if;

  perform extensions.http_post(
    url     := v_url,
    body    := json_build_object(
                 'record',     row_to_json(new),
                 'old_record', json_build_object('status', old.status)
               )::text::jsonb,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               )
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_daily_log_coach_notify on public.daily_logs;
create trigger trg_daily_log_coach_notify
  after update of status, total_kcal_eaten on public.daily_logs
  for each row execute function public.trg_notify_coach_on_log();

-- ══════════ 5. Trigger : daily_logs.coach_comment → coach-notify (cliente) ══════════
create or replace function public.trg_notify_client_on_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  if new.coach_comment is not distinct from old.coach_comment then return new; end if;
  if new.coach_comment is null then return new; end if;

  v_url := public._cfg('supabase_url') || '/functions/v1/coach-notify';
  v_key := public._cfg('service_role_key');
  if v_url is null or v_key is null then return new; end if;

  perform extensions.http_post(
    url     := v_url,
    body    := json_build_object(
                 'record', json_build_object(
                   'user_id',       new.user_id,
                   'coach_comment', new.coach_comment,
                   'log_date',      new.log_date
                 )
               )::text::jsonb,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               )
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_daily_log_client_notify on public.daily_logs;
create trigger trg_daily_log_client_notify
  after update of coach_comment on public.daily_logs
  for each row execute function public.trg_notify_client_on_comment();

-- ══════════ APRÈS LA MIGRATION ══════════
-- Exécuter UNE FOIS dans le SQL Editor Supabase
-- (remplacer les valeurs par celles de Settings → API) :
--
--   select public.slim_track_configure(
--     'https://TONPROJECTREF.supabase.co',
--     'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...'
--   );
