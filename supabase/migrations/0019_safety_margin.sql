-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Audit coach : sécurise le déficit calorique
--   1) TDEE de base toujours calculé avec activity_level = 1.2
--      (évite le double comptage entre TDEE × niveau d'activité
--       et kcal brûlées loggées dans la journée).
--   2) Malus de sécurité 0.8 sur les kcal brûlées (pas & sport)
--      pour compenser la surestimation des montres/algos.
-- ─────────────────────────────────────────────────────────────

-- ══════════ Trigger 4 (bis) — BMR × 1.2 fixe ══════════
create or replace function public.recalc_profile_tdee()
returns trigger language plpgsql as $$
declare
  bmr numeric;
  new_tdee integer;
  new_target integer;
begin
  if new.age is null or new.sex is null or new.height_cm is null
     or new.current_weight_kg is null or new.activity_level is null then
    new.tdee := null;
    new.target_kcal := null;
    return new;
  end if;

  if new.sex = 'F' then
    bmr := 10 * new.current_weight_kg + 6.25 * new.height_cm - 5 * new.age - 161;
  else
    bmr := 10 * new.current_weight_kg + 6.25 * new.height_cm - 5 * new.age + 5;
  end if;

  -- Politique coach : TDEE de base toujours "sédentaire" (×1.2).
  -- Les kcal dépensées en activité/pas s'ajoutent ensuite via le daily_log
  -- UNIQUEMENT si l'utilisatrice les logge consciemment.
  new_tdee := round(bmr * 1.2);
  new_target := new_tdee - coalesce(new.deficit_kcal, 0);

  new.tdee := new_tdee;
  new.target_kcal := new_target;
  return new;
end;
$$;

-- Recalcule les profils existants afin d'aligner le target_kcal
-- sur la nouvelle politique (sans toucher à activity_level).
update public.profiles
   set updated_at = now()
 where age is not null
   and sex is not null
   and height_cm is not null
   and current_weight_kg is not null
   and activity_level is not null;

-- ══════════ Helper recalc_daily_log — malus 0.8 sur kcal_pas ══════════
create or replace function public.recalc_daily_log(p_daily_id uuid)
returns void language plpgsql as $$
declare
  v_user uuid;
  v_date date;
  v_target integer;
begin
  select user_id, log_date, target_kcal into v_user, v_date, v_target
    from public.daily_logs where id = p_daily_id;

  if v_user is null then return; end if;

  if v_target is null then
    select target_kcal into v_target from public.profiles where id = v_user;
  end if;

  update public.daily_logs dl set
    total_kcal_eaten = coalesce((
      select sum(total_kcal)::integer from public.meals where daily_log_id = p_daily_id
    ), 0),
    total_kcal_burned = coalesce((
      select sum(kcal_burned)::integer from public.activities where daily_log_id = p_daily_id
    ), 0),
    total_steps = coalesce((
      select sum(steps)::integer from public.activities where daily_log_id = p_daily_id and steps is not null
    ), 0),
    -- Malus de sécurité 0.8 : les pas surestiment toujours la dépense réelle.
    steps_kcal_burned = coalesce((
      select sum(
        case when steps is not null then
          round(steps * 0.04 * (
            coalesce((select current_weight_kg from public.profiles where id = v_user), 70) / 70.0
          ) * 0.8)::integer
        else 0 end
      ) from public.activities where daily_log_id = p_daily_id and activity_type in ('walk','run')
    ), 0),
    target_kcal = v_target,
    status = case
      when (select count(*) from public.meals where daily_log_id = p_daily_id) = 0
        and (select count(*) from public.activities where daily_log_id = p_daily_id) = 0 then 'empty'::daily_status
      when (select count(*) from public.meals where daily_log_id = p_daily_id) >= 2 then 'complete'::daily_status
      else 'partial'::daily_status
    end,
    updated_at = now()
  where id = p_daily_id;

  update public.daily_logs set
    net_kcal = total_kcal_eaten - total_kcal_burned - steps_kcal_burned,
    deficit_respected = (total_kcal_eaten - total_kcal_burned - steps_kcal_burned) <= coalesce(target_kcal, 99999)
  where id = p_daily_id;
end;
$$;
