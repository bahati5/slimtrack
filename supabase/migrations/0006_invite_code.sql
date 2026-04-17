-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Codes d'invitation + permission can_edit_foods
-- À exécuter APRÈS 0005.
-- ─────────────────────────────────────────────────────────────

-- ══════════ 1. Colonnes profiles ══════════
alter table public.profiles
  add column if not exists invite_code    text unique,
  add column if not exists can_edit_foods boolean not null default false;

create index if not exists idx_profiles_invite_code on public.profiles(invite_code);

-- ══════════ 2. Générateur de codes (8 caractères A-Z0-9 sans I/O/0/1) ══════════
create or replace function public.generate_invite_code()
returns text language plpgsql as $$
declare
  alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  n        int  := length(alphabet);
  code     text;
  tries    int  := 0;
begin
  loop
    code := '';
    for _ in 1..8 loop
      code := code || substr(alphabet, 1 + floor(random() * n)::int, 1);
    end loop;
    -- Unicité
    perform 1 from public.profiles where invite_code = code;
    if not found then
      return code;
    end if;
    tries := tries + 1;
    if tries > 10 then
      raise exception 'Impossible de générer un code unique';
    end if;
  end loop;
end $$;

-- ══════════ 3. Backfill : générer un code pour les profils existants ══════════
update public.profiles
set invite_code = public.generate_invite_code()
where invite_code is null;

-- ══════════ 4. Trigger : code auto à la création d'un profil ══════════
create or replace function public.set_invite_code()
returns trigger language plpgsql as $$
begin
  if new.invite_code is null then
    new.invite_code := public.generate_invite_code();
  end if;
  return new;
end $$;

drop trigger if exists trg_profiles_invite_code on public.profiles;
create trigger trg_profiles_invite_code
  before insert on public.profiles
  for each row execute function public.set_invite_code();

-- ══════════ 5. RPC : un coach s'affilie une cliente via son code ══════════
-- Sécurité : la fonction vérifie que l'appelant est coach ou admin.
create or replace function public.coach_claim_client(p_code text)
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me     public.profiles;
  target public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  if me.role not in ('coach','admin') then
    raise exception 'Seul un coach ou un admin peut affilier une cliente'
      using errcode = '42501';
  end if;

  select * into target
  from public.profiles
  where invite_code = upper(trim(p_code));

  if target is null then
    raise exception 'Code invalide' using errcode = 'P0002';
  end if;

  if target.id = me.id then
    raise exception 'Tu ne peux pas t''affilier toi-même' using errcode = '22023';
  end if;

  if target.coach_id is not null and target.coach_id <> me.id then
    raise exception 'Cette cliente a déjà un coach' using errcode = '23505';
  end if;

  update public.profiles
  set coach_id = me.id
  where id = target.id
  returning * into target;

  return target;
end $$;

grant execute on function public.coach_claim_client(text) to authenticated;

-- ══════════ 6. RPC : rotation du code d'invitation par son propriétaire ══════════
create or replace function public.rotate_my_invite_code()
returns text
language plpgsql
security definer
set search_path = public
as $$
declare
  new_code text;
begin
  if auth.uid() is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  new_code := public.generate_invite_code();
  update public.profiles set invite_code = new_code where id = auth.uid();
  return new_code;
end $$;

grant execute on function public.rotate_my_invite_code() to authenticated;

-- ══════════ 7. RLS : food_database — coachs autorisés peuvent tout éditer ══════════
drop policy if exists "food: authorized edit" on public.food_database;
create policy "food: authorized edit"
  on public.food_database for update
  using (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and can_edit_foods = true
    )
  );

drop policy if exists "food: authorized delete" on public.food_database;
create policy "food: authorized delete"
  on public.food_database for delete
  using (
    public.is_admin()
    or created_by = auth.uid()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and can_edit_foods = true
    )
  );

-- Les policies existantes "food: creator update" / "food: creator delete"
-- restent actives (additives) : un user peut toujours modifier ses propres
-- aliments. Les nouvelles permettent en plus aux coachs autorisés.

-- ══════════ 8. RLS : profiles — coach peut aussi lire par invite_code ══════════
-- Pas besoin de policy spéciale : la RPC `coach_claim_client` est security definer
-- donc elle bypass le RLS au moment de la lecture.
