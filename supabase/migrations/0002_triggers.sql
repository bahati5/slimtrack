-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Triggers (PRD §3.2)
-- ─────────────────────────────────────────────────────────────

-- ══════════ handle_new_user : crée un profil à l'inscription ══════════
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, avatar_url, role)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.raw_user_meta_data->>'avatar_url',
    coalesce((new.raw_user_meta_data->>'role')::user_role, 'user')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ══════════ set_updated_at ══════════
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_profiles_updated on public.profiles;
create trigger trg_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();

drop trigger if exists trg_daily_logs_updated on public.daily_logs;
create trigger trg_daily_logs_updated before update on public.daily_logs
  for each row execute function public.set_updated_at();

-- ══════════ Trigger 4 — Mifflin-St Jeor sur UPDATE profiles ══════════
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

  new_tdee := round(bmr * new.activity_level);
  new_target := new_tdee - coalesce(new.deficit_kcal, 0);

  new.tdee := new_tdee;
  new.target_kcal := new_target;
  return new;
end;
$$;

drop trigger if exists trg_profiles_tdee on public.profiles;
create trigger trg_profiles_tdee
  before insert or update of age, sex, height_cm, current_weight_kg, activity_level, deficit_kcal
  on public.profiles
  for each row execute function public.recalc_profile_tdee();

-- ══════════ Helper — (re)calcul d'un daily_log ══════════
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
    steps_kcal_burned = coalesce((
      select sum(
        case when steps is not null then
          round(steps * 0.04 * (
            coalesce((select current_weight_kg from public.profiles where id = v_user), 70) / 70.0
          ))::integer
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

-- ══════════ Trigger 1 — meal_items → meals.total_* ══════════
create or replace function public.recalc_meal_totals()
returns trigger language plpgsql as $$
declare
  v_meal uuid;
  v_daily uuid;
begin
  v_meal := coalesce(new.meal_id, old.meal_id);
  update public.meals m set
    total_kcal      = coalesce((select round(sum(kcal_total))::integer from public.meal_items where meal_id = v_meal), 0),
    total_protein_g = coalesce((select sum(protein_g * quantity_g / 100.0)::numeric(6,1) from public.meal_items where meal_id = v_meal), 0),
    total_carbs_g   = coalesce((select sum(carbs_g   * quantity_g / 100.0)::numeric(6,1) from public.meal_items where meal_id = v_meal), 0),
    total_fat_g     = coalesce((select sum(fat_g     * quantity_g / 100.0)::numeric(6,1) from public.meal_items where meal_id = v_meal), 0)
  where id = v_meal
  returning daily_log_id into v_daily;

  if v_daily is not null then
    perform public.recalc_daily_log(v_daily);
  end if;

  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_meal_items_recalc on public.meal_items;
create trigger trg_meal_items_recalc
  after insert or update or delete on public.meal_items
  for each row execute function public.recalc_meal_totals();

-- ══════════ Trigger 2 — meals CRUD → daily_logs ══════════
create or replace function public.trg_meals_recalc()
returns trigger language plpgsql as $$
begin
  perform public.recalc_daily_log(coalesce(new.daily_log_id, old.daily_log_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_meals_recalc on public.meals;
create trigger trg_meals_recalc
  after insert or update or delete on public.meals
  for each row execute function public.trg_meals_recalc();

-- ══════════ Trigger 3 — activities CRUD → daily_logs ══════════
create or replace function public.trg_activities_recalc()
returns trigger language plpgsql as $$
begin
  perform public.recalc_daily_log(coalesce(new.daily_log_id, old.daily_log_id));
  return coalesce(new, old);
end;
$$;

drop trigger if exists trg_activities_recalc on public.activities;
create trigger trg_activities_recalc
  after insert or update or delete on public.activities
  for each row execute function public.trg_activities_recalc();

-- ══════════ Helper RPC : get_or_create_daily_log ══════════
create or replace function public.get_or_create_daily_log(p_date date default current_date)
returns public.daily_logs
language plpgsql security definer set search_path = public as $$
declare
  v_log public.daily_logs;
  v_target integer;
begin
  select target_kcal into v_target from public.profiles where id = auth.uid();

  insert into public.daily_logs (user_id, log_date, target_kcal)
  values (auth.uid(), p_date, v_target)
  on conflict (user_id, log_date) do update set target_kcal = coalesce(public.daily_logs.target_kcal, excluded.target_kcal)
  returning * into v_log;

  return v_log;
end;
$$;

grant execute on function public.get_or_create_daily_log(date) to authenticated;
