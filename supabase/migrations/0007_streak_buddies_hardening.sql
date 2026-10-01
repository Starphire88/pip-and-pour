-- 0007_streak_buddies_hardening.sql
-- Adversarial pass over the write paths added in 0005/0006. Every change here closes a way
-- for an authenticated account to write something that looks fine and is wrong.
--
-- Findings fixed:
--   1. Any signed-in account could INSERT a buddy_relationships row naming itself and any
--      other user. my_buddy_overview() picks the newest active row, so a third account could
--      take over someone else's dashboard with a bogus pairing. Pairing now happens only
--      through accept_buddy_invite(), which requires a live invite code.
--   2. is_in_relationship() only matched relationship ids, but two policies pass a challenge
--      id. Those policies therefore always denied: fail-closed and safe, but the intended
--      "each member writes their own row" rule was never actually expressible. The helper now
--      resolves either id.
--   3. refresh_buddy_streak() was executable by any signed-in account and took an arbitrary
--      relationship id, so another pair's cached streak could be rewritten. Execute is now
--      revoked from clients and the function enforces membership.
--   4. upsert_my_buddy_progress() accepted any p_day, so a member could write rows for
--      arbitrary dates (farm the longest streak) and any p_total_ml, including absurd ones.
--      Both are now bounded.
--   5. Encouragement messages were unbounded text.
--   6. Two accounts accepting the same code at the same moment could both pass the
--      "open invite" check. The invite row is now locked for the duration of the accept.

-- ---------------------------------------------------------------- 1. membership helper
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
    left join public.buddy_challenges c on c.relationship_id = r.id
    where (r.id = rel or c.id = rel)
      and r.status <> 'ended'
      and (r.user_a = viewer or r.user_b = viewer)
  );
$$;

-- ------------------------------------------------- 2. pairing only through the invite flow
drop policy if exists "create relationships" on public.buddy_relationships;
revoke insert on public.buddy_relationships from authenticated;

-- -------------------------------------- 3. the streak cache is not a client-writable table
create or replace function public.refresh_buddy_streak(p_relationship uuid)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public
as $$
declare
  caller uuid := auth.uid();
  shared_days date[];
  anchor date;
  current_streak integer := 0;
  longest_streak integer := 0;
  last_shared_date date;
begin
  if p_relationship is null then
    raise exception 'relationship_required';
  end if;
  -- Internal calls arrive from the other definer functions with the real caller's claim set,
  -- so a member check is enough to keep outsiders out without breaking the legit paths.
  if caller is not null and not public.is_in_relationship(p_relationship, caller) then
    raise exception 'not_a_member';
  end if;

  with per_day as (
    select p.day,
           count(*) filter (where p.completed) as completed_count,
           count(distinct p.user_id) as member_count
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
    select island, count(*)::int as len, max(day) as last_day from islands group by island
  ),
  anchor_row as (
    select case
             when exists (select 1 from shared where day = current_date) then current_date
             when exists (select 1 from shared where day = current_date - 1) then current_date - 1
             else null::date
           end as day
  ),
  anchor_island as (
    select i.island from islands i, anchor_row a where a.day is not null and i.day = a.day
  )
  select coalesce((select g.len from agg g join anchor_island ai on ai.island = g.island), 0),
         coalesce((select max(len) from agg), 0),
         (select max(day) from shared)
    into current_streak, longest_streak, last_shared_date;

  insert into public.buddy_streaks as s (relationship_id, current_streak, longest_streak, last_shared_date, updated_at)
  values (p_relationship, current_streak, longest_streak, last_shared_date, now())
  on conflict (relationship_id) do update
    set current_streak = excluded.current_streak,
        longest_streak = greatest(s.longest_streak, excluded.longest_streak),
        last_shared_date = excluded.last_shared_date,
        updated_at = now();

  return jsonb_build_object(
    'current', current_streak,
    'longest', longest_streak,
    'lastSharedDate', last_shared_date
  );
end;
$$;

revoke execute on function public.refresh_buddy_streak(uuid) from public, anon, authenticated;
grant execute on function public.refresh_buddy_streak(uuid) to service_role;

-- --------------------------------------------- 4. bounded day and bounded volume on progress
create or replace function public.upsert_my_buddy_progress(p_total_ml integer default null, p_day date default current_date)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  rel public.buddy_relationships;
  chal public.buddy_challenges;
  goal integer;
  total integer;
  pct integer;
  done boolean;
  row_record public.buddy_daily_progress;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  -- A member may only correct today or yesterday. Anything else is history rewriting.
  if p_day is null or p_day > current_date or p_day < current_date - 1 then
    raise exception 'day_out_of_range';
  end if;

  rel := public.buddy_active_relationship(me);
  if rel.id is null then
    return jsonb_build_object('status', 'no_relationship');
  end if;
  chal := public.buddy_active_challenge(rel.id);
  if chal.id is null then
    return jsonb_build_object('status', 'no_challenge');
  end if;

  goal := coalesce((select daily_goal_ml from public.user_settings where user_id = me), 2000);
  if goal is null or goal <= 0 then
    goal := 2000;
  end if;

  if p_total_ml is null then
    select coalesce(sum(amount_ml), 0)::int into total
    from public.hydration_logs
    where user_id = me
      and logged_at >= p_day::timestamptz
      and logged_at < (p_day + 1)::timestamptz;
  else
    -- A day cannot hold more than a person can plausibly drink.
    total := least(greatest(p_total_ml, 0), 20000);
  end if;

  pct := least(100, round(total::numeric / goal * 100))::int;
  done := total >= goal;

  insert into public.buddy_daily_progress as p
    (challenge_id, user_id, day, total_ml, goal_ml, hydration_percentage, completed, completed_at)
  values (chal.id, me, p_day, total, goal, pct, done, case when done then now() else null end)
  on conflict (challenge_id, user_id, day) do update
    set total_ml = excluded.total_ml,
        goal_ml = excluded.goal_ml,
        hydration_percentage = excluded.hydration_percentage,
        completed = excluded.completed,
        completed_at = case when excluded.completed then coalesce(p.completed_at, now()) else null end,
        updated_at = now()
  returning * into row_record;

  perform public.refresh_buddy_streak(rel.id);

  return jsonb_build_object(
    'status', 'ok',
    'day', row_record.day,
    'totalMl', row_record.total_ml,
    'goalMl', row_record.goal_ml,
    'percentage', row_record.hydration_percentage,
    'completed', row_record.completed
  );
end;
$$;

-- ---------------------------------------------------- 5. bounded encouragement message
create or replace function public.send_buddy_encouragement(p_message text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  rel public.buddy_relationships;
  partner uuid;
  existing public.buddy_encouragements;
  message text;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  rel := public.buddy_active_relationship(me);
  if rel.id is null then
    raise exception 'no_relationship';
  end if;
  partner := case when rel.user_a = me then rel.user_b else rel.user_a end;

  select * into existing from public.buddy_encouragements
   where relationship_id = rel.id and from_user = me and day = current_date
   limit 1;

  if existing.id is not null then
    return jsonb_build_object('sent', false, 'alreadyToday', true, 'message', existing.message);
  end if;

  message := left(nullif(trim(coalesce(p_message, '')), ''), 280);

  insert into public.buddy_encouragements (relationship_id, from_user, to_user, day, message)
  values (rel.id, me, partner, current_date, message);

  return jsonb_build_object('sent', true, 'alreadyToday', false, 'message', message);
end;
$$;

-- ----------------------------------------- 6. an invite code can only be used serially
create or replace function public.accept_buddy_invite(p_code text, p_display_name text default null)
returns jsonb
language plpgsql
volatile
security definer
set search_path = public, auth
as $$
declare
  me uuid := auth.uid();
  inv public.buddy_invites;
  rel public.buddy_relationships;
  chal_id uuid;
begin
  if me is null then
    raise exception 'not_authenticated';
  end if;
  if p_code is null or length(trim(p_code)) = 0 then
    raise exception 'code_required';
  end if;

  -- Locking the invite row serialises two accounts racing for the same code.
  select * into inv
  from public.buddy_invites
  where upper(code) = upper(trim(p_code)) and status = 'open' and expires_at > now()
  order by created_at desc
  limit 1
  for update;

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
  returning id into chal_id;

  if p_display_name is not null and length(trim(p_display_name)) > 0 then
    insert into public.user_settings (user_id, display_name)
    values (me, left(trim(p_display_name), 40))
    on conflict (user_id) do update set display_name = excluded.display_name, updated_at = now();
  end if;

  perform public.refresh_buddy_streak(rel.id);

  return jsonb_build_object(
    'relationshipId', rel.id,
    'challengeId', chal_id,
    'buddyName', public.buddy_name(inv.inviter)
  );
end;
$$;

-- ------------------------------------------------------------- 7. no anonymous grants at all
revoke all on public.buddy_invites from anon;
revoke all on public.buddy_relationships from anon;
revoke all on public.buddy_challenges from anon;
revoke all on public.buddy_daily_progress from anon;
revoke all on public.buddy_streaks from anon;
revoke all on public.buddy_encouragements from anon;
revoke all on public.pet_pals from anon;

grant select on public.pet_pals to authenticated;
grant select on public.buddy_relationships to authenticated;
grant select on public.buddy_streaks to authenticated;
grant select on public.buddy_invites to authenticated;
grant select, insert on public.buddy_challenges to authenticated;
grant select, insert, update on public.buddy_daily_progress to authenticated;
grant select, insert on public.buddy_encouragements to authenticated;
