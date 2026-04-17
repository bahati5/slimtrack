-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Répare le compte super admin pour GoTrue (Auth)
--
-- Symptôme : connexion 500 « Database error querying schema »
-- Causes fréquentes :
--   - colonnes texte dans auth.users à NULL (GoTrue attend des chaînes) ;
--   - absence d’une ligne auth.identities pour provider `email`.
--
-- Idempotent : même email que 0007 / 0015 (à adapter si besoin).
-- À appliquer si le compte existait déjà avant la correction de 0015.
-- ─────────────────────────────────────────────────────────────

do $$
declare
  v_uid   uuid;
  v_email text := 'admin@slimtrack.app';
begin
  select id into v_uid from auth.users where email = v_email limit 1;

  if v_uid is null then
    raise notice 'Aucun utilisateur % — exécute plutôt 0015_ensure_super_admin.sql', v_email;
    return;
  end if;

  update auth.users
  set
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
end $$;
