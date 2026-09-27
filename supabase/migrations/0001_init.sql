-- Pip & Pour — reconstructed schema
--
-- WHY THIS FILE EXISTS
-- The original Supabase project (ref wytzftxroyrxtvalywlh, "Pip the Panda") was deleted.
-- Deletion is irreversible and takes the schema and backups with it, and the repo held no
-- migrations directory, so the schema survives only inside the client code. This file
-- rebuilds it. Verified against src/lib/hydration/api.ts types and query patterns
-- on 2026-09-27.
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
  logged_at  timestamptz not null default now()
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
-- REQUIRED, not a convenience. The client calls .maybeSingle() on both tables and falls
-- back to defaults when the row is absent, so the UI copes without seeding. The pip-chat
-- edge function does not: it authorises the caller by checking for a streaks row and
-- returns 403 "no Pip account found" when it is missing
-- (supabase/functions/pip-chat/index.ts, step 2). Without this trigger, every newly
-- signed-up user can log in but Pip's dialogue is permanently forbidden.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_settings (user_id) values (new.id)
    on conflict (user_id) do nothing;
  insert into public.streaks (user_id) values (new.id)
    on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
