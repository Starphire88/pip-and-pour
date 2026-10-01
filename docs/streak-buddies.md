# Streak Buddies

Shared hydration accountability for Pip & Pour. Two people keep their own goals, their own
streaks and their own levels, and share one metric: whether they both showed up today.

The loop this prototype exists to test:

    Drink → Progress → Show up → Encourage buddy → Complete together → Extend Buddy Streak → Repeat

Competition is an optional layer on top. The relationship is the product.

---

## 1. The existing Pip architecture (as found, not as assumed)

TanStack Start (React 19) on Vite with the Nitro `vercel` preset, Tailwind v4, shadcn-style
Radix primitives in `src/components/ui`, TanStack Query for server state, Supabase for auth and
data. File-based routes in `src/routes` with a generated `src/routeTree.gen.ts`.

| Concern | Where it lives | Reused by Streak Buddies |
| --- | --- | --- |
| Hydration rows | `src/lib/hydration/api.ts` (`hydration_logs`: `amount_ml`, `logged_at`, `drink_type`) | Yes, read only |
| Daily goal | `user_settings.daily_goal_ml` via `useUserSettings` | Yes, as the member's own goal |
| Today's total | `useHydrationStats().total`, `getTodayTotal` | Yes |
| Individual streak | `streaks` table (`current_streak`, `longest_streak`, `last_logged_date`) synced by `syncStreakWithTodayTotal` | Yes, displayed as-is |
| Shell and nav | `src/components/MobileShell.tsx` (3 tabs) | Extended to 4 tabs |
| Auth gate | `src/components/RequireAuth.tsx` | Yes |
| Celebration | `src/components/Confetti.tsx` | Yes, on a shared completion |
| Design tokens | `#1A1A1A` ink, `#E8E8E8` borders, `#F9F9F9` fills, `#A8D5E2` accent, Nunito headings, Inter body | Yes |

Two things did **not** exist and had to be introduced: an XP/level system, and Pet Pals. Pip
himself (the panda) was the only character.

There were two working copies on disk. The deployed source is `~/pip-and-pour` (linked to Vercel
project `pip-and-pour`, on `main`, clean). `~/Projects/pip-and-pour` is the stale tree.

## 2. Files added

```
src/lib/buddies/types.ts        domain types, shaped to mirror the future SQL columns
src/lib/buddies/pet-pals.ts     Pet Pal registry (panda, elephant, dolphin)
src/lib/buddies/progress.ts     all maths: percent, streaks, team progress, XP, race, rescue
src/lib/buddies/store.ts        local persistence + the BuddyDataSource adapter seam
src/hooks/useStreakBuddies.ts   view model: real Supabase data + buddy state, combined
src/components/buddies/SegmentedBar.tsx
src/components/buddies/PetPalCard.tsx
src/components/buddies/MemberProgressCard.tsx
src/routes/buddies.tsx          the Streak Buddies dashboard
src/lib/buddies/__tests__/*.test.ts   62 tests
supabase/migrations/0005_streak_buddies.sql   written, NOT applied
scripts/typecheck.sh, vitest.config.ts
```

Changed: `src/components/MobileShell.tsx` (Buddies tab, 3 → 4 columns), `package.json` (vitest,
`test` and `typecheck` scripts), `src/routeTree.gen.ts` (generated).

## 3. How it works

**Individual progress.** Ashley's numbers are her real Supabase rows. Her percentage is always
`total / her own goal`. Don's goal is 2,500 ml against Ashley's 2,000 ml on purpose, so the UI
never equates a bigger volume with a better day.

**Buddy Streak.** Consecutive days where *both* members completed their *own* goal. Separate
counter, separate rules. It anchors at today when today is complete, otherwise at yesterday, so
a shared streak is not destroyed at 00:01 while the day is still running. A miss by either
person resets only this number.

**Team Progress.** The mean of the two percentages. 80% and 60% is 70%. Raw millilitres are never
averaged or compared.

**Friendly Challenge (optional, off by default).** A Goal Race: who reaches 100% of their own goal
first. Percentages, not litres. Second place loses nothing: the Buddy Streak still counts and
the Team Progress is still shown.

**Streak Rescue.** When Don is below 100%, "Encourage Don" unlocks. One nudge per person per day,
then the button reports it has been sent. No notifications, no messaging.

**Pet Pals.** Identity and emotional feedback: Hydrating → Almost there → Goal complete → Buddy
complete. Adding a Pet Pal is one entry in `pet-pals.ts`.

**Level and XP.** Derived, never stored: 50 XP per completed day plus 10 XP per logged drink, run
through the threshold table in `progress.ts`. Because it is recomputed from the rows, there is no
counter to drift. Don's side uses completion days only, because his mock data has no drink-level
detail.

## 4. Real, local, mocked, future

| Piece | Status |
| --- | --- |
| Ashley's hydration, goal, individual streak | **Real** Supabase data via existing hooks |
| Ashley's XP/level, percentage, completion time | **Real**, derived from her `hydration_logs` rows |
| Buddy Streak, Team Progress, coverage percentages, race outcome, rescue state | **Real logic** (`progress.ts`), pure and tested |
| Relationship Ashley ↔ Don | **Local**, seeded on first load |
| Don's intake, goal, Pet Pal, history, XP | **Mocked**, 11 seeded completed days for the background |
| Pet Pal choice (both members) | **Local** (`localStorage`), survives reload |
| Encouragements | **Local**, mock effect only |
| Race toggle, prototype controls | **Local**, test scaffolding |

Storage key `pip.streakBuddies.v1`. Blobs are version-checked, validated on read, and re-seeded
rather than thrown away when corrupt.

## 5. Supabase path

`supabase/migrations/0005_streak_buddies.sql` is written and deliberately not applied. It adds
`pet_pals`, `buddy_relationships`, `buddy_challenges`, `buddy_daily_progress`, `buddy_streaks`,
`buddy_encouragements`, a `pet_pal_id` column on `user_settings`, and two `security definer`
helpers (`is_buddy_of`, `is_in_relationship`).

Those helpers exist for one reason: every current table is scoped `auth.uid() = user_id`, so a
buddy cannot read a buddy's rows. A shared dashboard needs exactly one cross-user read, and it
has to be written as a policy-safe function rather than a permissive select.

Swapping local storage for Supabase means implementing one interface, `BuddyDataSource`
(`getState`, `subscribe`, `update`, `reset`), in `src/lib/buddies/store.ts`. The UI never touches
storage directly.

## 6. Running it

```
bun run test        # 62 tests
bun run typecheck   # tsc --noEmit
bun run dev         # local dev server
bun run build       # production build into .vercel/output
```

## 7. Deliberately not built

Multiple buddies, buddy groups, private or weekly competitions, Pet Pal animation and reactions,
rescue notifications, buddy XP, team levels, seasonal challenges, invitations, realtime sync, push
notifications, buddy achievements, shared rewards, public leaderboards, feeds and messaging. The
MVP tests one hypothesis: does shared accountability make Pip more engaging than solo tracking?
