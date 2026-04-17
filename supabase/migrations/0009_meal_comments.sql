-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Table meal_comments
--
-- Fil de discussion coach ⇄ cliente par repas.
-- Accès : auteur du repas OU coach affilié à l'auteur.
-- ─────────────────────────────────────────────────────────────

create table if not exists public.meal_comments (
  id         uuid primary key default gen_random_uuid(),
  meal_id    uuid not null references public.meals(id) on delete cascade,
  author_id  uuid not null references public.profiles(id) on delete cascade,
  body       text not null check (length(body) between 1 and 1000),
  created_at timestamptz not null default now()
);

create index if not exists idx_meal_comments_meal on public.meal_comments(meal_id, created_at);

alter table public.meal_comments enable row level security;

-- Active le realtime (broadcast INSERT/UPDATE/DELETE via Supabase channels)
do $$ begin
  alter publication supabase_realtime add table public.meal_comments;
exception when duplicate_object then null; end $$;

-- Lecture : auteur du repas OU son coach
drop policy if exists "meal_comments: read" on public.meal_comments;
create policy "meal_comments: read"
  on public.meal_comments for select
  to authenticated
  using (
    exists (
      select 1 from public.meals m
      join public.profiles p on p.id = m.user_id
      where m.id = meal_comments.meal_id
        and (m.user_id = auth.uid() or p.coach_id = auth.uid())
    )
  );

-- Insertion : auteur du repas OU son coach
drop policy if exists "meal_comments: insert" on public.meal_comments;
create policy "meal_comments: insert"
  on public.meal_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and exists (
      select 1 from public.meals m
      join public.profiles p on p.id = m.user_id
      where m.id = meal_comments.meal_id
        and (m.user_id = auth.uid() or p.coach_id = auth.uid())
    )
  );

-- Suppression : seul l'auteur du commentaire
drop policy if exists "meal_comments: delete own" on public.meal_comments;
create policy "meal_comments: delete own"
  on public.meal_comments for delete
  to authenticated
  using (author_id = auth.uid());

-- ══════════ Trigger : meal_comments INSERT → meal-comment-notify ══════════
-- Requiert app_config rempli via slim_track_configure() (cf. 0008).
create or replace function public.trg_notify_on_meal_comment()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_url text;
  v_key text;
begin
  v_url := public._cfg('supabase_url') || '/functions/v1/meal-comment-notify';
  v_key := public._cfg('service_role_key');
  if v_url is null or v_key is null then return new; end if;

  perform extensions.http_post(
    url     := v_url,
    body    := json_build_object('record', row_to_json(new))::text::jsonb,
    headers := jsonb_build_object(
                 'Content-Type',  'application/json',
                 'Authorization', 'Bearer ' || v_key
               )
  );

  return new;
exception when others then
  return new;
end;
$$;

drop trigger if exists trg_meal_comment_notify on public.meal_comments;
create trigger trg_meal_comment_notify
  after insert on public.meal_comments
  for each row execute function public.trg_notify_on_meal_comment();
