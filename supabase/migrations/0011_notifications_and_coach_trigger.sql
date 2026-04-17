-- ─────────────────────────────────────────────────────────────
-- Pas de suppression des commentaires repas (UI + RLS)
-- Colonne link_url pour les notifications in-app
-- Trigger coach : notif à chaque repas/activité (même si statut inchangé)
-- ─────────────────────────────────────────────────────────────

-- 1) Commentaires : plus de DELETE pour les utilisateurs authentifiés
drop policy if exists "meal_comments: delete own" on public.meal_comments;

-- 2) Lien optionnel pour ouvrir l’écran concerné depuis l’app
alter table public.notifications
  add column if not exists link_url text;

-- 3) Remplace le trigger coach : notifier quand le contenu du journal change
--    (kcal, statut, brûlées…), pas quand seul coach_comment change.
create or replace function public.trg_notify_coach_on_log()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
  v_data_changed boolean;
begin
  if tg_op <> 'UPDATE' then
    return new;
  end if;

  if new.status = 'empty' then
    return new;
  end if;

  v_data_changed :=
       new.status is distinct from old.status
    or new.total_kcal_eaten is distinct from old.total_kcal_eaten
    or new.total_kcal_burned is distinct from old.total_kcal_burned
    or new.steps_kcal_burned is distinct from old.steps_kcal_burned
    or new.net_kcal is distinct from old.net_kcal;

  if not v_data_changed then
    return new;
  end if;

  v_url := public._cfg('supabase_url') || '/functions/v1/client-log-notify';
  v_key := public._cfg('service_role_key');
  if v_url is null or v_key is null then
    return new;
  end if;

  perform extensions.http_post(
    url     := v_url,
    body    := json_build_object(
                 'record',     row_to_json(new),
                 'old_record', json_build_object(
                   'status',            old.status,
                   'total_kcal_eaten',  old.total_kcal_eaten,
                   'total_kcal_burned', old.total_kcal_burned,
                   'steps_kcal_burned', old.steps_kcal_burned,
                   'net_kcal',          old.net_kcal
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

drop trigger if exists trg_daily_log_coach_notify on public.daily_logs;
create trigger trg_daily_log_coach_notify
  after update on public.daily_logs
  for each row execute function public.trg_notify_coach_on_log();
