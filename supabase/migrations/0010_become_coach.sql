-- ─────────────────────────────────────────────────────────────
-- SlimTrack — RPC become_coach
--
-- Permet à un utilisateur (role='user') de passer en role='coach'
-- après inscription, s'il s'est trompé de choix initial.
-- Pas de downgrade coach→user pour éviter d'orpheliner les clientes.
-- ─────────────────────────────────────────────────────────────

create or replace function public.become_coach()
returns public.profiles
language plpgsql
security definer
set search_path = public
as $$
declare
  me public.profiles;
begin
  select * into me from public.profiles where id = auth.uid();
  if me is null then
    raise exception 'Non authentifié' using errcode = '42501';
  end if;
  if me.role = 'coach' or me.role = 'admin' then
    return me;
  end if;
  update public.profiles
    set role = 'coach'
    where id = auth.uid()
    returning * into me;
  return me;
end;
$$;

grant execute on function public.become_coach() to authenticated;
