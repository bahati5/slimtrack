-- ─────────────────────────────────────────────────────────────
-- SlimTrack — Contrainte unique (user_id, measured_at) pour upsert
--
-- L’app utilise .upsert(..., { onConflict: "user_id,measured_at" }) sur
-- public.measurements. Sans UNIQUE, Postgres renvoie :
-- « there is no unique or exclusion constraint matching the ON CONFLICT specification »
-- ─────────────────────────────────────────────────────────────

-- Garde une seule ligne par (user_id, measured_at) : la plus récente (created_at).
delete from public.measurements m
where m.id in (
  select id
  from (
    select
      id,
      row_number() over (
        partition by user_id, measured_at
        order by created_at desc
      ) as rn
    from public.measurements
  ) t
  where t.rn > 1
);

drop index if exists public.idx_measurements_user_date;

create unique index if not exists measurements_user_id_measured_at_key
  on public.measurements (user_id, measured_at);
