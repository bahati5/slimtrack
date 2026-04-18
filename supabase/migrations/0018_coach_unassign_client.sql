-- RPC : délier une cliente (coach/admin) ou côté serveur pour bypass RLS coach → profil cliente.

create or replace function public.coach_unassign_client(p_client_id uuid)
returns void
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
  if me.role not in ('coach', 'admin') then
    raise exception 'Seul un coach ou un admin peut délier une cliente'
      using errcode = '42501';
  end if;

  if me.role = 'admin' then
    update public.profiles set coach_id = null where id = p_client_id;
    return;
  end if;

  update public.profiles
  set coach_id = null
  where id = p_client_id and coach_id = me.id;

  if not FOUND then
    raise exception 'Cliente introuvable ou non affiliée à ton compte' using errcode = 'P0002';
  end if;
end $$;

grant execute on function public.coach_unassign_client(uuid) to authenticated;
