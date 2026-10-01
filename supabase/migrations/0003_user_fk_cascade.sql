-- 0003: make account deletion actually delete account data.
--
-- Finding (2026-10-01 adversarial pass): user_settings carried a foreign key to auth.users
-- with ON DELETE CASCADE, but streaks and hydration_logs carried no foreign key at all. Deleting
-- an account therefore removed its settings row and silently orphaned its streaks row and every
-- hydration log it had ever written. The audit hit this directly: removing two throwaway accounts
-- left two orphaned streaks rows behind, which only surfaced because the post-delete counts did
-- not match (users 4, streaks 6).
--
-- Orphan sweep before this migration: 0 logs, 0 streaks, 0 settings, so the constraints can be
-- added VALIDATED rather than NOT VALID.
--
-- Idempotent: safe to re-run.

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'streaks_user_id_fkey' and conrelid = 'public.streaks'::regclass
  ) then
    alter table public.streaks
      add constraint streaks_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'hydration_logs_user_id_fkey' and conrelid = 'public.hydration_logs'::regclass
  ) then
    alter table public.hydration_logs
      add constraint hydration_logs_user_id_fkey
      foreign key (user_id) references auth.users (id) on delete cascade;
  end if;
end $$;

-- Cascading deletes scan the child side; both tables are queried by user_id on every page load.
create index if not exists streaks_user_id_idx on public.streaks (user_id);
create index if not exists hydration_logs_user_id_idx on public.hydration_logs (user_id);
