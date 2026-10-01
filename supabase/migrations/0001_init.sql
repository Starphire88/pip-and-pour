-- Pip & Pour — reconstructed schema
--
-- CORRECTION, 2026-09-27 (adversarial audit). The header below used to claim the original
-- Supabase project had been deleted. It had not. Project ref wytzftxroyrxtvalywlh ("Pip the
-- Panda") is alive: it answers on /auth/v1/settings, /rest/v1/<table> and
-- /functions/v1/pip-chat with the anon key from .env (verified with real requests; see
-- ~/.hermes/scripts/pp-probe.sh). The "deleted" claim came from a recovery note written
-- during an outage and was never re-tested.
--
-- Consequence: this file was never applied to the live database. The live tables carry no
-- check constraints and hydration_logs has an extra drink_type column. DO NOT run this file
-- against the live project without reading 0002_reconcile_live_schema.sql first: the tables
-- here are declared with `if not exists`, so applying it would be a silent no-op that leaves
-- the live schema unprotected.
--
-- WHY THIS FILE STILL EXISTS
-- It documents the intended shape of the schema for a fresh project, and 0002 brings the
-- live project up to it. Shape verified against src/lib/hydration/api.ts types and query
-- patterns, and (2026-09-27) against the live database's actual columns.
--
-- Table shape derived from:
--   hydration_logs  -> api.ts:55-121 (amount_ml, user_id, logged_at; delete by id)
--   user_settings   -> api.ts:81-137 (user_id, daily_goal_ml, updated_at; upsert on user_id)
--   streaks         -> api.ts:92-186 (user_id, current_streak, longest_streak,
--                                     last_logged_date, updated_at; upsert on user_id)
--
-- Apply with:  supabase db push --linked     (after `supabase link --project-ref <new-ref>`)

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------- hydration_logs
create table if not exists public.hydration_logs (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references auth.users (id) on delete cascade,
  amount_ml  integer not null check (amount_ml > 0),
  logged_at  timestamptz not null default now(),
  -- Present in the live database, unused by the current client. Kept so a fresh project
  -- matches the live one (found by the 2026-09-27 audit; the client never reads or
  -- writes it, and api.ts sends no value, so the server default applies).
  drink_type text not null default 'Water'
);

create index if not exists hydration_logs_user_logged_at_idx
  on public.hydration_logs (user_id, logged_at desc);

-- ----------------------------------------------------------------- user_settings
create table if not exists public.user_settings (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null unique references auth.users (id) on delete cascade,
  daily_goal_ml integer not null default 2000 check (daily_goal_ml between 500 and 5000),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- ----------------------------------------------------------------------- streaks
create table if not exists public.streaks (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null unique references auth.users (id) on delete cascade,
  current_streak   integer not null default 0,
  longest_streak   integer not null default 0,
  last_logged_date date,
  updated_at       timestamptz not null default now()
);

-- ------------------------------------------------------------------------- RLS
-- The anon key ships in the browser bundle, so RLS is the only thing stopping one
-- signed-in user reading another user's hydration rows.
alter table public.hydration_logs enable row level security;
alter table public.user_settings  enable row level security;
alter table public.streaks        enable row level security;

drop policy if exists "own logs" on public.hydration_logs;
create policy "own logs" on public.hydration_logs
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own settings" on public.user_settings;
create policy "own settings" on public.user_settings
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

drop policy if exists "own streak" on public.streaks;
create policy "own streak" on public.streaks
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- --------------------------------------------------------------- new-user seeding
-- Seed the streaks row ONLY.
--
-- The streaks insert is REQUIRED. The pip-chat edge function authorises callers by checking
-- for a streaks row and returns 403 "no Pip account found" without one
-- (supabase/functions/pip-chat/index.ts, step 2), so a new user can sign in but can never
-- get a line from Pip until some later client write creates the row.
--
-- The user_settings insert is deliberately NOT done. An earlier revision seeded it as well,
-- on the assumption that the UI copes with a pre-existing row. It does not: the dashboard
-- treats "a user_settings row exists" as "onboarding is finished"
-- (src/routes/index.tsx -> `if (!settingsQuery.data) return <Onboarding />`), so seeding the
-- row makes the onboarding screen, and the goal the user is supposed to pick, unreachable.
-- A missing settings row is the client's signal to onboard; leave it missing.
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
