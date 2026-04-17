-- ─────────────────────────────────────────────────────────────
-- Les triggers utilisaient extensions.http_post — ce n’est pas l’API pg_net.
-- Résultat : erreur à l’exécution, avalée par exception → aucune notif.
-- Corriger en net.http_post (voir doc Supabase pg_net).
-- ─────────────────────────────────────────────────────────────

create or replace function public.trg_notify_on_meal_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  v_url := public._cfg('supabase_url') || '/functions/v1/meal-comment-notify';
  v_key := public._cfg('service_role_key');
  if v_url is null or v_key is null then return new; end if;

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object('record', to_jsonb(new)),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );

  return new;
exception when others then
  raise warning 'trg_notify_on_meal_comment: %', sqlerrm;
  return new;
end;
$$;

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

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'record', to_jsonb(new),
      'old_record', jsonb_build_object(
        'status', old.status,
        'total_kcal_eaten', old.total_kcal_eaten,
        'total_kcal_burned', old.total_kcal_burned,
        'steps_kcal_burned', old.steps_kcal_burned,
        'net_kcal', old.net_kcal
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );

  return new;
exception when others then
  raise warning 'trg_notify_coach_on_log: %', sqlerrm;
  return new;
end;
$$;

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

  perform net.http_post(
    url := v_url,
    body := jsonb_build_object(
      'record', jsonb_build_object(
        'user_id', new.user_id,
        'coach_comment', new.coach_comment,
        'log_date', new.log_date
      )
    ),
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || v_key
    )
  );

  return new;
exception when others then
  raise warning 'trg_notify_client_on_comment: %', sqlerrm;
  return new;
end;
$$;
