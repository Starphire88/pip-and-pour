-- ============================================================================================
-- Streak Buddies schema. WRITTEN, DELIBERATELY NOT APPLIED.
-- ============================================================================================
-- The MVP runs on local state (src/lib/buddies/store.ts). This migration is the Supabase path
-- for when a second real account exists. Nothing in the UI assumes local storage: the store
-- already exposes the adapter seam (BuddyDataSource) this schema would implement.
--
-- Why it is not applied yet:
--   1. It changes the live database used by the shipped app. That is a deliberate,
--      user-approved step, not something to fold into a prototype build.
--   2. There is no second authenticated user (Don) to populate buddy_relationships against.
--
-- The RLS problem this solves: every existing table is scoped `auth.uid() = user_id`, so a
-- signed-in user cannot read their buddy's rows. The helper below answers "is this user my
-- active buddy?" without recursion, which is what a policy needs.
--
-- Apply with: supabase db push   (run from Terminal.app, not an agent shell)
-- ============================================================================================

-- ------------------------------------------------------------------------------ pet_pals
-- Reusable entity, not an enum: adding a Pet Pal becomes an insert, not a code change.
create table if not exists public.pet_pals (
  id          text primary key,
  name        text not null,
  short_name  text not null,
  emoji       text not null,
  personality text[] not null default '{}',
  blurb       text,
  accent      text not null default '#A8D5E2',
  sort_order  integer not null default 0
);

insert into public.pet_pals (id, name, short_name, emoji, personality, blurb, accent, sort_order)
values
  ('panda',    'Pip the Panda',    'Pip',   '🐼', '{Deadpan,Loyal,Emotionally invested}',
   'Already here. Already judging your fluid intake. Mostly on your side.', '#A8D5E2', 0),
  ('elephant', 'Ellie the Elephant','Ellie','🐘', '{Steady,Strong,Consistent}',
   'Remembers everything. Has never once forgotten to drink water.', '#F2C57E', 1),
  ('dolphin',  'Dolly the Dolphin', 'Dolly','🐬', '{Playful,Energetic,Social}',
   'Treats hydration like a group activity. Will splash you into participating.', '#A8D5E2', 2)
on conflict (id) do update
  set name = excluded.name,
      short_name = excluded.short_name,
      emoji = excluded.emoji,
      personality = excluded.personality,
      blurb = excluded.blurb,
      accent = excluded.accent,
      sort_order = excluded.sort_order;

-- Pet Pal selection lives on the existing per-user settings row rather than a new table.
alter table public.user_settings
  add column if not exists pet_pal_id text references public.pet_pals (id) on delete set null;

-- --------------------------------------------------------------------- buddy_relationships
create table if not exists public.buddy_relationships (
  id         uuid primary key default gen_random_uuid(),
  user_a     uuid not null references auth.users (id) on delete cascade,
  user_b     uuid not null references auth.users (id) on delete cascade,
  status     text not null default 'active' check (status in ('pending', 'active', 'ended')),
  created_at timestamptz not null default now(),
  constraint buddy_relationships_not_self check (user_a <> user_b)
);

create unique index if not exists buddy_relationships_pair_idx
  on public.buddy_relationships (least(user_a, user_b), greatest(user_a, user_b))
  where status <> 'ended';

alter table public.buddy_relationships enable row level security;

-- One membership helper, security definer so a policy can call it without recursing into RLS.
create or replace function public.is_buddy_of(target uuid, viewer uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.buddy_relationships r
    where r.status = 'active'
      and (
        (r.user_a = viewer and r.user_b = target)
        or (r.user_b = viewer and r.user_a = target)
      )
  );
$$;

create or replace function public.is_in_relationship(rel uuid, viewer uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select exists (
    select 1
    from public.buddy_relationships r
    where r.id = rel
      and r.status <> 'ended'
      and (r.user_a = viewer or r.user_b = viewer)
  );
$$;

drop policy if exists "own relationships" on public.buddy_relationships;
create policy "own relationships" on public.buddy_relationships
  for select using (auth.uid() = user_a or auth.uid() = user_b);

drop policy if exists "create relationships" on public.buddy_relationships;
create policy "create relationships" on public.buddy_relationships
  for insert with check (auth.uid() = user_a or auth.uid() = user_b);

-- ---------------------------------------------------------------------- buddy_challenges
create table if not exists public.buddy_challenges (
  id            uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.buddy_relationships (id) on delete cascade,
  type          text not null default 'cooperative'
                  check (type in ('cooperative', 'goal_race', 'consistency', 'team', 'combined_goal')),
  start_date    date not null default current_date,
  end_date      date,
  status        text not null default 'active' check (status in ('active', 'complete', 'abandoned')),
  created_at    timestamptz not null default now()
);

create index if not exists buddy_challenges_relationship_idx
  on public.buddy_challenges (relationship_id, status);

alter table public.buddy_challenges enable row level security;

drop policy if exists "read own challenges" on public.buddy_challenges;
create policy "read own challenges" on public.buddy_challenges
  for select using (public.is_in_relationship(relationship_id, auth.uid()));

drop policy if exists "write own challenges" on public.buddy_challenges;
create policy "write own challenges" on public.buddy_challenges
  for all using (public.is_in_relationship(relationship_id, auth.uid()))
  with check (public.is_in_relationship(relationship_id, auth.uid()));

-- ------------------------------------------------------------------ buddy_daily_progress
-- One row per member per day, written by each member for themselves. The buddy can read it,
-- which is what makes a shared dashboard possible at all.
create table if not exists public.buddy_daily_progress (
  challenge_id        uuid not null references public.buddy_challenges (id) on delete cascade,
  user_id             uuid not null references auth.users (id) on delete cascade,
  day                 date not null,
  total_ml            integer not null default 0 check (total_ml >= 0),
  goal_ml             integer not null check (goal_ml between 500 and 5000),
  -- Snapshot of the percentage rather than a live computation, so a goal change does not
  -- rewrite history.
  hydration_percentage integer not null default 0 check (hydration_percentage between 0 and 100),
  completed           boolean not null default false,
  completed_at        timestamptz,
  updated_at          timestamptz not null default now(),
  primary key (challenge_id, user_id, day)
);

create index if not exists buddy_daily_progress_day_idx
  on public.buddy_daily_progress (day desc);

alter table public.buddy_daily_progress enable row level security;

drop policy if exists "read shared progress" on public.buddy_daily_progress;
create policy "read shared progress" on public.buddy_daily_progress
  for select using (public.is_in_relationship(challenge_id, auth.uid()));

drop policy if exists "write own progress" on public.buddy_daily_progress;
create policy "write own progress" on public.buddy_daily_progress
  for all using (auth.uid() = user_id and public.is_in_relationship(challenge_id, auth.uid()))
  with check (auth.uid() = user_id and public.is_in_relationship(challenge_id, auth.uid()));

-- ---------------------------------------------------------------------- buddy_streaks
-- Cached shared counter. The calculation in src/lib/buddies/progress.ts stays the source of
-- truth; this table exists so a dashboard does not have to scan history on every load.
create table if not exists public.buddy_streaks (
  relationship_id uuid primary key references public.buddy_relationships (id) on delete cascade,
  current_streak  integer not null default 0 check (current_streak >= 0),
  longest_streak  integer not null default 0 check (longest_streak >= 0),
  last_shared_date date,
  updated_at      timestamptz not null default now()
);

alter table public.buddy_streaks enable row level security;

drop policy if exists "read own buddy streak" on public.buddy_streaks;
create policy "read own buddy streak" on public.buddy_streaks
  for select using (public.is_in_relationship(relationship_id, auth.uid()));

-- ----------------------------------------------------------------- buddy_encouragements
-- Lightweight nudge log. Deliberately NOT a messaging system: a row is a nudge, nothing else.
create table if not exists public.buddy_encouragements (
  id              uuid primary key default gen_random_uuid(),
  relationship_id uuid not null references public.buddy_relationships (id) on delete cascade,
  from_user       uuid not null references auth.users (id) on delete cascade,
  to_user         uuid not null references auth.users (id) on delete cascade,
  day             date not null default current_date,
  message         text,
  created_at      timestamptz not null default now(),
  constraint buddy_encouragements_once_per_day unique (relationship_id, from_user, to_user, day)
);

alter table public.buddy_encouragements enable row level security;

drop policy if exists "read own encouragements" on public.buddy_encouragements;
create policy "read own encouragements" on public.buddy_encouragements
  for select using (public.is_in_relationship(relationship_id, auth.uid()));

drop policy if exists "send encouragement" on public.buddy_encouragements;
create policy "send encouragement" on public.buddy_encouragements
  for insert with check (
    auth.uid() = from_user
    and public.is_buddy_of(to_user, auth.uid())
    and public.is_in_relationship(relationship_id, auth.uid())
  );

-- ------------------------------------------------------------------------------- grants
grant select on public.pet_pals to authenticated;
grant select on public.buddy_relationships to authenticated;
grant select, insert on public.buddy_challenges to authenticated;
grant select, insert, update on public.buddy_daily_progress to authenticated;
grant select on public.buddy_streaks to authenticated;
grant select, insert on public.buddy_encouragements to authenticated;
