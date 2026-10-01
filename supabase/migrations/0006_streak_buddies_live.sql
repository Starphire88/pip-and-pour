-- 0006_streak_buddies_live.sql
-- Turns the schema from 0005 into a working two-account Streak Buddies flow.
--
-- Why this file exists: 0005 laid out the tables but everything in this app is scoped
-- auth.uid() = user_id, so a member cannot read a buddy's goal, Pet Pal or daily progress.
-- Rather than punch a blanket cross-user hole in RLS, every read and write the dashboard
-- needs goes through a security definer RPC that resolves "my buddy" server side.
-- No client code ever needs service-role access, and no policy widens beyond the pair.
--
-- Applied 2026-10-01 against project wytzftxroyrxtvalywlh (Pip the Panda) via the
-- Management API, because the CLI has no database password in the keychain.

-- ---------------------------------------------------------------------------
-- 1. Display names (an account-level label, so a buddy sees "Ashley", not an email)
-- ---------------------------------------------------------------------------
alter table public.user_settings
    add column if not exists display_name text;

comment on column public.user_settings.display_name is
    'Preferred name shown to a Streak Buddy. Falls back to the email local part.';

-- ---------------------------------------------------------------------------
-- 2. Invites
-- ---------------------------------------------------------------------------
create table if not exists public.buddy_invites (
    id          uuid primary key default gen_random_uuid(),
    code        text not null unique,
    inviter     uuid not null references auth.users (id) on delete cascade,
    status      text not null default 'open'
                check (status in ('open', 'accepted', 'revoked')),
    created_at  timestamptz not null default now(),
    expires_at  timestamptz not null default (now() + interval '14 days'),
    accepted_by uuid references auth.users (id) on delete set null,
    accepted_at timestamptz
);

create index if not exists buddy_invites_inviter_idx
    on public.buddy_invites (inviter, status);

alter table public.buddy_invites enable row level security;

drop policy if exists "Inviter can read own invites" on public.buddy_invites;
create policy "Inviter can read own invites" on public.buddy_invites
    for select using (auth.uid() = inviter);

drop policy if exists "Inviter can create own invites" on public.buddy_invites;
create policy "Inviter can create own invites" on public.buddy_invites
    for insert with check (auth.uid() = inviter);

-- ---------------------------------------------------------------------------
-- 3. Internal helpers (definer only, never granted to a client role)
-- ---------------------------------------------------------------------------
create or replace function public.buddy_name(p_user uuid)
returns text
language sql
stable
security definer
set search_path = public, auth
as $$
    select coalesce(
               nullif(btrim(s.display_name), ''),
               initcap(split_part(u.email, '@', 1))
           )
    from auth.users u
    left join public.user_settings s on s.user_id = u.id
    where u.id = p_user;
$$;

create or replace function public.buddy_active_relationship(p_user uuid)
returns public.buddy_relationships
language sql
stable
security definer
set search_path = public
as $$
    select r.*
    from public.buddy_relationships r
    where r.status = 'active'
      and (r.user_a = p_user or r.user_b = p_user)
    order by r.created_at desc
    limit 1;
$$;

create or replace function public.buddy_active_challenge(p_relationship uuid)
returns public.buddy_challenges
language sql
stable
security definer
set search_path = public
as $$
    select c.*
    from public.buddy_challenges c
    where c.relationship_id = p_relationship
      and c.status = 'active'
    order by c.created_at desc
    limit 1;
$$;

create or replace function public.buddy_new_code()
returns text
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    alphabet text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    candidate text;
begin
    for attempt in 1..25 loop
        select string_agg(substr(alphabet, floor(random() * length(alphabet))::int + 1, 1), '')
          into candidate
          from generate_series(1, 6);
        if not exists (select 1 from public.buddy_invites i where upper(i.code) = candidate) then
            return candidate;
        end if;
    end loop;
    raise exception 'could_not_generate_invite_code';
end;
$$;

-- ---------------------------------------------------------------------------
-- 4. The shared streak engine
--    Buddy Streak = consecutive days where BOTH members completed their OWN goal.
--    Anchored at today when today is already shared, otherwise at yesterday, so the
--    streak does not appear to die at midnight while the day is still in progress.
-- ---------------------------------------------------------------------------
create or replace function public.refresh_buddy_streak(p_relationship uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    current_streak integer := 0;
    longest_streak integer := 0;
    last_shared    date;
begin
    with per_day as (
        select p.day,
               count(*) filter (where p.completed) as completed_count,
               count(distinct p.user_id)          as member_count
        from public.buddy_daily_progress p
        join public.buddy_challenges c on c.id = p.challenge_id
        where c.relationship_id = p_relationship
        group by p.day
    ),
    shared as (
        select day from per_day where completed_count >= 2 and member_count >= 2
    ),
    islands as (
        select day, day - (row_number() over (order by day))::int as island from shared
    ),
    agg as (
        select island, count(*)::int as len from islands group by island
    ),
    anchor as (
        select case
                   when exists (select 1 from shared where day = current_date) then current_date
                   when exists (select 1 from shared where day = current_date - 1) then current_date - 1
                   else null::date
               end as day
    )
    select
        coalesce((select a.len
                  from agg a
                  join islands i on i.island = a.island
                  join anchor an on an.day = i.day
                  limit 1), 0),
        coalesce((select max(a.len) from agg a), 0),
        (select max(day) from shared)
      into current_streak, longest_streak, last_shared;

    insert into public.buddy_streaks as s
        (relationship_id, current_streak, longest_streak, last_shared_date, updated_at)
    values
        (p_relationship, current_streak, longest_streak, last_shared, now())
    on conflict (relationship_id) do update
        set current_streak   = excluded.current_streak,
            longest_streak   = greatest(s.longest_streak, excluded.longest_streak),
            last_shared_date = excluded.last_shared_date,
            updated_at       = now();

    return jsonb_build_object(
        'current', current_streak,
        'longest', longest_streak,
        'lastSharedDate', last_shared
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 5. Invite lifecycle
-- ---------------------------------------------------------------------------
create or replace function public.create_buddy_invite(p_display_name text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me      uuid := auth.uid();
    code    text;
    expires timestamptz := now() + interval '14 days';
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;
    if public.buddy_active_relationship(me) is not null then
        raise exception 'already_paired';
    end if;

    if p_display_name is not null and length(btrim(p_display_name)) > 0 then
        insert into public.user_settings (user_id, display_name)
        values (me, left(btrim(p_display_name), 40))
        on conflict (user_id) do update
            set display_name = excluded.display_name, updated_at = now();
    end if;

    update public.buddy_invites
       set status = 'revoked'
     where inviter = me and status = 'open';

    code := public.buddy_new_code();

    insert into public.buddy_invites (code, inviter, expires_at)
    values (code, me, expires);

    return jsonb_build_object('code', code, 'expiresAt', expires);
end;
$$;

create or replace function public.accept_buddy_invite(p_code text, p_display_name text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me    uuid := auth.uid();
    inv   public.buddy_invites;
    rel   public.buddy_relationships;
    chal  uuid;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;
    if p_code is null or length(btrim(p_code)) = 0 then
        raise exception 'code_required';
    end if;

    select * into inv
      from public.buddy_invites i
     where upper(i.code) = upper(btrim(p_code))
       and i.status = 'open'
       and i.expires_at > now()
     order by i.created_at desc
     limit 1;

    if inv.id is null then
        raise exception 'invalid_or_expired_code';
    end if;
    if inv.inviter = me then
        raise exception 'cannot_accept_own_invite';
    end if;
    if public.buddy_active_relationship(me) is not null then
        raise exception 'already_paired';
    end if;
    if public.buddy_active_relationship(inv.inviter) is not null then
        raise exception 'inviter_already_paired';
    end if;

    update public.buddy_invites
       set status = 'accepted', accepted_by = me, accepted_at = now()
     where id = inv.id;

    insert into public.buddy_relationships (user_a, user_b)
    values (inv.inviter, me)
    returning * into rel;

    insert into public.buddy_challenges (relationship_id, type)
    values (rel.id, 'cooperative')
    returning id into chal;

    if p_display_name is not null and length(btrim(p_display_name)) > 0 then
        insert into public.user_settings (user_id, display_name)
        values (me, left(btrim(p_display_name), 40))
        on conflict (user_id) do update
            set display_name = excluded.display_name, updated_at = now();
    end if;

    perform public.refresh_buddy_streak(rel.id);

    return jsonb_build_object(
        'relationshipId', rel.id,
        'challengeId', chal,
        'buddyName', public.buddy_name(inv.inviter)
    );
end;
$$;

create or replace function public.leave_buddy_relationship()
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
    me  uuid := auth.uid();
    rel public.buddy_relationships;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    rel := public.buddy_active_relationship(me);
    if rel.id is null then
        raise exception 'no_relationship';
    end if;

    update public.buddy_relationships set status = 'ended' where id = rel.id;
    -- buddy_challenges.status only allows active/complete/abandoned, so a departed pair
    -- abandons its challenge rather than "ending" it.
    update public.buddy_challenges
       set status = 'abandoned', end_date = current_date
     where relationship_id = rel.id and status = 'active';

    return jsonb_build_object('status', 'ended');
end;
$$;

-- ---------------------------------------------------------------------------
-- 6. Daily progress writes
-- ---------------------------------------------------------------------------
create or replace function public.upsert_my_buddy_progress(
    p_total_ml integer default null,
    p_day      date    default current_date
)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me    uuid := auth.uid();
    rel   public.buddy_relationships;
    chal  public.buddy_challenges;
    goal  integer;
    total integer;
    pct   integer;
    done  boolean;
    rowp  public.buddy_daily_progress;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    rel := public.buddy_active_relationship(me);
    if rel.id is null then
        return jsonb_build_object('status', 'no_relationship');
    end if;

    chal := public.buddy_active_challenge(rel.id);
    if chal.id is null then
        return jsonb_build_object('status', 'no_challenge');
    end if;

    goal := coalesce((select s.daily_goal_ml from public.user_settings s where s.user_id = me), 2000);

    if p_total_ml is null then
        select coalesce(sum(l.amount_ml), 0)::int
          into total
          from public.hydration_logs l
         where l.user_id = me
           and l.logged_at >= p_day::timestamptz
           and l.logged_at < (p_day + 1)::timestamptz;
    else
        total := greatest(p_total_ml, 0);
    end if;

    pct  := least(100, round(total::numeric / nullif(goal, 0) * 100))::int;
    done := total >= goal;

    insert into public.buddy_daily_progress as p
        (challenge_id, user_id, day, total_ml, goal_ml, hydration_percentage, completed, completed_at)
    values
        (chal.id, me, p_day, total, goal, pct, done, case when done then now() else null end)
    on conflict (challenge_id, user_id, day) do update
        set total_ml             = excluded.total_ml,
            goal_ml              = excluded.goal_ml,
            hydration_percentage = excluded.hydration_percentage,
            completed            = excluded.completed,
            completed_at         = case
                                       when excluded.completed then coalesce(p.completed_at, now())
                                       else null
                                   end,
            updated_at           = now()
    returning * into rowp;

    perform public.refresh_buddy_streak(rel.id);

    return jsonb_build_object(
        'status', 'ok',
        'day', rowp.day,
        'totalMl', rowp.total_ml,
        'goalMl', rowp.goal_ml,
        'percentage', rowp.hydration_percentage,
        'completed', rowp.completed
    );
end;
$$;

-- Derive the last N days of daily progress from real hydration logs. Honest backfill:
-- totals come from actual rows; the goal used is the goal in force when the row is written.
create or replace function public.backfill_my_buddy_progress(p_days integer default 90)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me    uuid := auth.uid();
    rel   public.buddy_relationships;
    chal  public.buddy_challenges;
    goal  integer;
    rec   record;
    wrote integer := 0;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    rel := public.buddy_active_relationship(me);
    if rel.id is null then
        return jsonb_build_object('status', 'no_relationship');
    end if;
    chal := public.buddy_active_challenge(rel.id);
    if chal.id is null then
        return jsonb_build_object('status', 'no_challenge');
    end if;

    goal := coalesce((select s.daily_goal_ml from public.user_settings s where s.user_id = me), 2000);

    for rec in
        select l.logged_at::date as day,
               sum(l.amount_ml)::int as total
          from public.hydration_logs l
         where l.user_id = me
           and l.logged_at >= (current_date - greatest(p_days, 1))
         group by 1
         order by 1
    loop
        insert into public.buddy_daily_progress as p
            (challenge_id, user_id, day, total_ml, goal_ml, hydration_percentage, completed, completed_at)
        values
            (chal.id, me, rec.day, rec.total, goal,
             least(100, round(rec.total::numeric / nullif(goal, 0) * 100))::int,
             rec.total >= goal,
             case when rec.total >= goal then rec.day::timestamptz + interval '12 hours' else null end)
        on conflict (challenge_id, user_id, day) do update
            set total_ml             = excluded.total_ml,
                goal_ml              = excluded.goal_ml,
                hydration_percentage = excluded.hydration_percentage,
                completed            = excluded.completed,
                completed_at         = coalesce(p.completed_at, excluded.completed_at),
                updated_at           = now();
        wrote := wrote + 1;
    end loop;

    perform public.refresh_buddy_streak(rel.id);

    return jsonb_build_object('status', 'ok', 'daysWritten', wrote);
end;
$$;

-- ---------------------------------------------------------------------------
-- 7. Pet Pal, race toggle, encouragement
-- ---------------------------------------------------------------------------
create or replace function public.set_buddy_pet_pal(p_pet_pal_id text)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me uuid := auth.uid();
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;
    if p_pet_pal_id is not null and not exists (select 1 from public.pet_pals pp where pp.id = p_pet_pal_id) then
        raise exception 'unknown_pet_pal';
    end if;

    insert into public.user_settings (user_id, pet_pal_id)
    values (me, p_pet_pal_id)
    on conflict (user_id) do update
        set pet_pal_id = excluded.pet_pal_id, updated_at = now();

    return jsonb_build_object('petPalId', p_pet_pal_id);
end;
$$;

create or replace function public.set_buddy_race(p_enabled boolean)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me    uuid := auth.uid();
    rel   public.buddy_relationships;
    chal  public.buddy_challenges;
    newtype text := case when coalesce(p_enabled, false) then 'goal_race' else 'cooperative' end;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    rel := public.buddy_active_relationship(me);
    if rel.id is null then
        raise exception 'no_relationship';
    end if;
    chal := public.buddy_active_challenge(rel.id);
    if chal.id is null then
        raise exception 'no_challenge';
    end if;

    update public.buddy_challenges set type = newtype where id = chal.id;
    return jsonb_build_object('type', newtype);
end;
$$;

create or replace function public.send_buddy_encouragement(p_message text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
    me      uuid := auth.uid();
    rel     public.buddy_relationships;
    partner uuid;
    inserted boolean := false;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    rel := public.buddy_active_relationship(me);
    if rel.id is null then
        raise exception 'no_relationship';
    end if;
    partner := case when rel.user_a = me then rel.user_b else rel.user_a end;

    insert into public.buddy_encouragements (relationship_id, from_user, to_user, day, message)
    values (rel.id, me, partner, current_date, nullif(left(btrim(coalesce(p_message, '')), 140), ''))
    on conflict (relationship_id, from_user, to_user, day) do nothing;

    get diagnostics inserted = row_count;

    return jsonb_build_object(
        'sent', inserted,
        'alreadySentToday', not inserted,
        'message', (select e.message from public.buddy_encouragements e
                    where e.relationship_id = rel.id and e.from_user = me and e.day = current_date
                    limit 1)
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 8. The one read the dashboard needs
-- ---------------------------------------------------------------------------
create or replace function public.my_buddy_overview()
returns jsonb
language plpgsql
stable
security definer
set search_path = public, auth
as $$
declare
    me      uuid := auth.uid();
    rel     public.buddy_relationships;
    partner uuid;
    chal    public.buddy_challenges;
    invite  jsonb;
begin
    if me is null then
        raise exception 'not_authenticated';
    end if;

    select jsonb_build_object('code', i.code, 'expiresAt', i.expires_at)
      into invite
      from public.buddy_invites i
     where i.inviter = me and i.status = 'open' and i.expires_at > now()
     order by i.created_at desc
     limit 1;

    rel := public.buddy_active_relationship(me);

    if rel.id is null then
        return jsonb_build_object(
            'relationship', null,
            'invite', invite,
            'streak', jsonb_build_object('current', 0, 'longest', 0, 'lastSharedDate', null),
            'progress', '[]'::jsonb,
            'challenge', null,
            'self', jsonb_build_object(
                'id', me,
                'name', public.buddy_name(me),
                'goalMl', coalesce((select s.daily_goal_ml from public.user_settings s where s.user_id = me), 2000),
                'petPalId', (select s.pet_pal_id from public.user_settings s where s.user_id = me)
            ),
            'todaySelfMl', coalesce((select sum(l.amount_ml) from public.hydration_logs l
                                     where l.user_id = me
                                       and l.logged_at >= current_date
                                       and l.logged_at < current_date + 1), 0)::int,
            'encouragements', jsonb_build_object(
                'sentByMe', false, 'sentByBuddy', false, 'myMessage', null, 'buddyMessage', null)
        );
    end if;

    partner := case when rel.user_a = me then rel.user_b else rel.user_a end;
    chal    := public.buddy_active_challenge(rel.id);

    return jsonb_build_object(
        'relationship', jsonb_build_object(
            'id', rel.id, 'status', rel.status, 'createdAt', rel.created_at),
        'invite', invite,
        'self', jsonb_build_object(
            'id', me,
            'name', public.buddy_name(me),
            'goalMl', coalesce((select s.daily_goal_ml from public.user_settings s where s.user_id = me), 2000),
            'petPalId', (select s.pet_pal_id from public.user_settings s where s.user_id = me)
        ),
        'buddy', jsonb_build_object(
            'id', partner,
            'name', public.buddy_name(partner),
            'goalMl', coalesce((select s.daily_goal_ml from public.user_settings s where s.user_id = partner), 2000),
            'petPalId', (select s.pet_pal_id from public.user_settings s where s.user_id = partner)
        ),
        'challenge', case when chal.id is null then null else jsonb_build_object(
            'id', chal.id, 'type', chal.type, 'startDate', chal.start_date) end,
        'progress', coalesce((
            select jsonb_agg(jsonb_build_object(
                       'userId', p.user_id,
                       'day', p.day,
                       'totalMl', p.total_ml,
                       'goalMl', p.goal_ml,
                       'percentage', p.hydration_percentage,
                       'completed', p.completed,
                       'completedAt', p.completed_at)
                   order by p.day)
              from public.buddy_daily_progress p
             where chal.id is not null
               and p.challenge_id = chal.id
               and p.day >= current_date - 60
        ), '[]'::jsonb),
        'streak', coalesce((
            select jsonb_build_object(
                       'current', s.current_streak,
                       'longest', s.longest_streak,
                       'lastSharedDate', s.last_shared_date)
              from public.buddy_streaks s
             where s.relationship_id = rel.id
        ), jsonb_build_object('current', 0, 'longest', 0, 'lastSharedDate', null)),
        'todaySelfMl', coalesce((select sum(l.amount_ml) from public.hydration_logs l
                                 where l.user_id = me
                                   and l.logged_at >= current_date
                                   and l.logged_at < current_date + 1), 0)::int,
        'todayBuddyMl', coalesce((
            select p.total_ml from public.buddy_daily_progress p
             where chal.id is not null and p.challenge_id = chal.id
               and p.user_id = partner and p.day = current_date
             limit 1), 0),
        'encouragements', jsonb_build_object(
            'sentByMe', exists(select 1 from public.buddy_encouragements e
                               where e.relationship_id = rel.id and e.from_user = me and e.day = current_date),
            'sentByBuddy', exists(select 1 from public.buddy_encouragements e
                                  where e.relationship_id = rel.id and e.from_user = partner and e.day = current_date),
            'myMessage', (select e.message from public.buddy_encouragements e
                          where e.relationship_id = rel.id and e.from_user = me and e.day = current_date limit 1),
            'buddyMessage', (select e.message from public.buddy_encouragements e
                             where e.relationship_id = rel.id and e.from_user = partner and e.day = current_date limit 1)
        )
    );
end;
$$;

-- ---------------------------------------------------------------------------
-- 9. Privileges: anon keeps nothing on buddy data; authenticated gets only the RPCs
-- ---------------------------------------------------------------------------
revoke all on public.buddy_invites,
              public.buddy_relationships,
              public.buddy_challenges,
              public.buddy_daily_progress,
              public.buddy_encouragements,
              public.buddy_streaks
    from anon;

grant select on public.pet_pals to anon, authenticated;

do $$
declare
    fn text;
    internal_fns text[] := array[
        'public.buddy_name(uuid)',
        'public.buddy_active_relationship(uuid)',
        'public.buddy_active_challenge(uuid)',
        'public.buddy_new_code()',
        'public.refresh_buddy_streak(uuid)'
    ];
    public_fns text[] := array[
        'public.create_buddy_invite(text)',
        'public.accept_buddy_invite(text, text)',
        'public.leave_buddy_relationship()',
        'public.upsert_my_buddy_progress(integer, date)',
        'public.backfill_my_buddy_progress(integer)',
        'public.set_buddy_pet_pal(text)',
        'public.set_buddy_race(boolean)',
        'public.send_buddy_encouragement(text)',
        'public.my_buddy_overview()'
    ];
begin
    foreach fn in array internal_fns loop
        execute format('revoke all on function %s from public, anon, authenticated', fn);
    end loop;
    foreach fn in array public_fns loop
        execute format('revoke all on function %s from public, anon', fn);
        execute format('grant execute on function %s to authenticated, service_role', fn);
    end loop;
end;
$$;
