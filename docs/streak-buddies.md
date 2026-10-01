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

## 8. Verification (1 October 2026)

Local gate, all green: `bun run test` 62/62, `tsc --noEmit` clean, eslint clean, `bun run build`
exit 0. Deployed check ran against the live site `https://pip-and-pour.vercel.app` using Ashley's
real signed-in session, driven headlessly with Playwright over CDP (profile
`~/.hermes/browser-profiles/chrome-ashley`, port 9334). Evidence screenshots in
`~/.hermes/cache/pip-qa/evidence/`.

| Test | What was done | Observed |
| --- | --- | --- |
| D. Pet Pal persistence | Don set to Dolphin, page reloaded | Dolphin persisted. Set to Elephant, reloaded: Elephant persisted. Set back to Dolphin, reloaded: Dolphin persisted, badge reads `chosen` |
| A. Cooperative goal | Don moved to 100%, Ashley logged to 100% | Today 2/2, Team Progress 100%, Buddy Streak 0 → 1 day, Ashley's own streak 0 → 1d, Don's own 11 → 12d, both Pet Pals `Buddy complete`, result card "You both showed up today. Team Goal: 100%." |
| B. One falls behind | Don moved to 60% | Today 1/2, Team Progress 80%, Buddy Streak reset to 0 while Ashley's own streak stayed 1d and Don's stayed 11d, `Encourage Don` unlocked, one nudge recorded, button then reported it had been sent |
| C. Friendly race | Race toggled on with Ashley at 100% and Don at 60%, then Don finished | In progress: "Ashley has finished their own goal. The race is not decided until the other person finishes, and nobody loses XP either way." Complete: "Ashley got there first. Both goals are done, so the Buddy Streak still counts." Buddy Streak 1, Team Progress 100% |

Other checks: zero console errors and zero page errors across `/buddies`, `/`, `/streak` and
`/log` (only pre-existing Vite preload warnings). No horizontal overflow at 390 px or 360 px, no
offending elements. Test data hygiene: the single 2,000 ml log used to reach Ashley's goal was
deleted afterwards, and her home screen returned to 0 / 2,000 ml, streak 0d, XP 910, history back
to its original 71 rows. Don's prototype state was reset to the seeded baseline (1,200 / 2,500 =
48%), his Pet Pal was left as Dolphin, and the race toggle was left off.

## 9. Known issues and technical debt

1. Don's seeded history has no counterpart on Ashley's real side, so the Buddy Streak reads 0 until
   today is completed by both. The shared 12-day run in the brief cannot be displayed yet. Either
   seed a matched pair or wait for real days to accumulate.
2. The race outcome sentence renders twice when the race is enabled and the day is complete, once
   in the Goal Race block and once in the Buddy Challenge Complete card. Cosmetic.
3. One relationship only. The store is keyed by member id and would take a second pair, but the
   hook resolves a single relationship, so multi-buddy needs a route-level selector.
4. Don's side lives in `localStorage` on one device, so "Don" is a simulation, not a second person.
   Two real accounts is the change that makes the hypothesis testable for real.
5. `0005_streak_buddies.sql` is unapplied, so nothing is shared across devices.
6. Pet Pals carry identity and a status word, no animation or reaction.
7. Buddy Streak anchors at today when today is complete, otherwise at yesterday, so it survives the
   first hours of a new day. Only the local timezone has been exercised.
