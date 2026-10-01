-- 0002 — reconcile the live database with the intended schema
--
-- Context (2026-09-27 adversarial audit). 0001_init.sql was written as a reconstruction
-- after a project deletion that never actually happened. The live project
-- (ref wytzftxroyrxtvalywlh, "Pip the Panda") is up, and 0001 was never applied to it.
-- The live tables therefore differ from 0001 in four ways, all verified with live requests
-- against the anon key:
--
--   1. hydration_logs has no check constraint. The audit inserted amount_ml = -500 and
--      amount_ml = 0 and both returned HTTP 201. A negative or zero drink corrupts every
--      total the UI shows, and nothing on the server stops it.
--   2. user_settings has no check constraint. daily_goal_ml = 99999 and daily_goal_ml = 100
--      were both accepted. The client clamps to 500..5000 before writing, but the clamp is
--      the only guard.
--   3. hydration_logs has an extra column, drink_type text not null default 'Water', that
--      0001 did not declare. Nothing in the client reads or writes it.
--   4. There is no on_auth_user_created trigger, so no streaks row is created for a new
--      user. pip-chat authorises on that row and answers 403 "no Pip account found" for
--      every fresh account until the client happens to write one.
--
-- This migration does not delete or rewrite data. It adds constraints, adds the trigger,
-- and backfills the streaks rows that should already exist. Run it in a transaction so a
-- failure on a pre-existing bad value leaves the tables untouched (see the note below).
--
-- Apply with:  supabase db push --linked
--
-- NOTE ON EXISTING BAD DATA. Step 2 will fail if any row already violates the constraint,
-- which is the point: it surfaces the damage instead of hiding it. Find them with:
--   select id, user_id, amount_ml from public.hydration_logs where amount_ml <= 0;
--   select user_id, daily_goal_ml from public.user_settings
--     where daily_goal_ml not between 500 and 5000;
-- Clean those rows up deliberately, then re-run.

begin;

-- 1. drink_type, present in the live database and missing from 0001 -------------------
alter table public.hydration_logs
  add column if not exists drink_type text not null default 'Water';

-- 2. the constraints the client has been trusting -------------------------------------
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.hydration_logs'::regclass
      and conname  = 'hydration_logs_amount_ml_check'
  ) then
    alter table public.hydration_logs
      add constraint hydration_logs_amount_ml_check
      check (amount_ml > 0 and amount_ml <= 5000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.user_settings'::regclass
      and conname  = 'user_settings_daily_goal_ml_check'
  ) then
    alter table public.user_settings
      add constraint user_settings_daily_goal_ml_check
      check (daily_goal_ml between 500 and 5000);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.streaks'::regclass
      and conname  = 'streaks_non_negative_check'
  ) then
    alter table public.streaks
      add constraint streaks_non_negative_check
      check (current_streak >= 0 and longest_streak >= 0);
  end if;
end
$$;

-- Indexes 0001 declares. `if not exists` makes these safe whether or not they exist.
create index if not exists hydration_logs_user_logged_at_idx
  on public.hydration_logs (user_id, logged_at desc);

-- 3. seed a streaks row for new users, and backfill existing accounts ------------------
-- Streaks only. Seeding user_settings would make the client's onboarding gate
-- (`!settingsQuery.data` -> show Onboarding) unreachable, and the user would never get to
-- choose a daily goal. See the long note in 0001_init.sql.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Every account that already exists should have had a streaks row. Give it one so Pip
-- stops answering 403 for people who signed up before this migration.
insert into public.streaks (user_id)
select u.id from auth.users u
on conflict (user_id) do nothing;

commit;

-- Verify afterwards:
--   select count(*) from public.streaks;                              -- should equal the user count
--   select conname from pg_constraint
--     where conrelid in ('public.hydration_logs'::regclass,
--                        'public.user_settings'::regclass,
--                        'public.streaks'::regclass)
--       and contype = 'c';
