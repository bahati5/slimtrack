-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Réaligne le hash bcrypt du super admin (après 0007)
-- À exécuter si tu as déjà appliqué 0007 avec `gen_salt('bf')` sans coût
-- et que la connexion échoue alors que l’email / mot de passe sont corrects.
--
-- Même email / mot de passe que 0007 — adapte si tu les as changés dans le fichier.
-- ─────────────────────────────────────────────────────────────

-- Cast explicite : sinon Postgres résout `gen_salt(unknown, integer)` et échoue (42883).
-- `crypt` / `gen_salt` viennent de l’extension pgcrypto (schéma `extensions` sur Supabase).
update auth.users
set
  encrypted_password = extensions.crypt(
    'SlimTrack2025!'::text,
    extensions.gen_salt('bf'::text, 10)
  ),
  updated_at = now()
where email = 'admin@slimtrack.app';
