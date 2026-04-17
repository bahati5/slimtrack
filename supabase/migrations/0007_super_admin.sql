-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Super admin par défaut + policy INSERT foods
-- À exécuter APRÈS 0006.
-- ─────────────────────────────────────────────────────────────

-- ══════════ 1. Super admin par défaut ══════════
-- Crée un compte auth + profil admin s'il n'existe pas déjà.
-- L'email/mot de passe peuvent être changés ensuite dans le dashboard Supabase.
--
-- IMPORTANT : remplace l'email et le mot de passe avant d'exécuter
-- en production, ou modifie-les immédiatement après via le dashboard.

do $$
declare
  v_uid  uuid;
  v_email text := 'admin@slimtrack.app';
  v_pass  text := 'SlimTrack2025!';
begin
  -- Vérifie si l'utilisateur existe déjà
  select id into v_uid from auth.users where email = v_email limit 1;

  if v_uid is null then
    -- Crée l'utilisateur auth
    v_uid := gen_random_uuid();
    insert into auth.users (
      id,
      instance_id,
      email,
      encrypted_password,
      email_confirmed_at,
      raw_app_meta_data,
      raw_user_meta_data,
      created_at,
      updated_at,
      confirmation_token,
      recovery_token,
      aud,
      role
    ) values (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      crypt(v_pass, gen_salt('bf')),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now(),
      '',
      '',
      'authenticated',
      'authenticated'
    );
  end if;

  -- Upsert le profil avec role admin + can_edit_foods
  insert into public.profiles (id, role, full_name, can_edit_foods)
  values (v_uid, 'admin', 'Super Admin', true)
  on conflict (id) do update
    set role          = 'admin',
        can_edit_foods = true,
        full_name     = coalesce(public.profiles.full_name, 'Super Admin');
end $$;

-- ══════════ 2. Policy INSERT food_database pour can_edit_foods ══════════
-- Les utilisateurs avec can_edit_foods=true peuvent aussi insérer
-- des aliments dans la base publique (pas seulement leurs propres).

drop policy if exists "food: authorized insert" on public.food_database;
create policy "food: authorized insert"
  on public.food_database for insert
  with check (
    public.is_admin()
    or exists (
      select 1 from public.profiles
      where id = auth.uid() and can_edit_foods = true
    )
  );
