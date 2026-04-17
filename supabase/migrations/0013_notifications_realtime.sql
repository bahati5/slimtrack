-- Realtime sur notifications pour rafraîchir la cloche sans polling seul
do $$ begin
  alter publication supabase_realtime add table public.notifications;
exception when duplicate_object then null; end $$;
