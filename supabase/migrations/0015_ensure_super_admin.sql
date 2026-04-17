-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Garantir un super admin (création ou réparation)
-- À exécuter après 0005 + 0007 (les policies admin existent déjà).
--
-- - Si aucun utilisateur avec cet email : création auth + profil admin.
-- - Si l’utilisateur existe déjà : mise à jour du hash mot de passe + profil admin.
--
-- Adapte v_email / v_pass ci-dessous avant la prod, puis change le mot de passe
-- depuis le dashboard ou l’app une fois connecté.
--
-- Voir 0007 : tokens texte non NULL + ligne auth.identities (sinon erreur GoTrue).
-- ─────────────────────────────────────────────────────────────

do $$
declare
  v_uid   uuid;
  v_email text := 'admin@slimtrack.app';
  v_pass  text := 'SlimTrack2025!';
begin
  select id into v_uid from auth.users where email = v_email limit 1;

  if v_uid is null then
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
      email_change,
      email_change_token_new,
      aud,
      role
    ) values (
      v_uid,
      '00000000-0000-0000-0000-000000000000',
      v_email,
      extensions.crypt(v_pass::text, extensions.gen_salt('bf'::text, 10)),
      now(),
      '{"provider":"email","providers":["email"]}',
      '{"full_name":"Super Admin"}',
      now(),
      now(),
      '',
      '',
      '',
      '',
      'authenticated',
      'authenticated'
    );

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    values (
      gen_random_uuid(),
      v_uid,
      v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    );
  else
    update auth.users
    set
      encrypted_password = extensions.crypt(
        v_pass::text,
        extensions.gen_salt('bf'::text, 10)
      ),
      email_confirmed_at = coalesce(email_confirmed_at, now()),
      confirmation_token = coalesce(confirmation_token, ''),
      recovery_token = coalesce(recovery_token, ''),
      email_change = coalesce(email_change, ''),
      email_change_token_new = coalesce(email_change_token_new, ''),
      updated_at = now()
    where id = v_uid;

    insert into auth.identities (
      id,
      user_id,
      provider_id,
      identity_data,
      provider,
      last_sign_in_at,
      created_at,
      updated_at
    )
    select
      gen_random_uuid(),
      v_uid,
      v_uid::text,
      jsonb_build_object('sub', v_uid::text, 'email', v_email),
      'email',
      now(),
      now(),
      now()
    where not exists (
      select 1
      from auth.identities i
      where i.user_id = v_uid and i.provider = 'email'
    );
  end if;

  insert into public.profiles (id, role, full_name, can_edit_foods)
  values (v_uid, 'admin', 'Super Admin', true)
  on conflict (id) do update
    set role = 'admin',
        can_edit_foods = true,
        full_name = coalesce(public.profiles.full_name, excluded.full_name);
end $$;
