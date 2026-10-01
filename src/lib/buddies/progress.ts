/**
 * Streak Buddies — calculation layer.
 *
 * Every function here is pure and takes its inputs explicitly (including "today"), so the
 * whole interaction model can be tested without a browser, a database or a clock. The UI and
 * the store do no maths of their own.
 *
 * Rules that matter and are easy to get wrong:
 *   - Percentages are always measured against the member's OWN goal. Raw millilitres are
 *     never compared between members.
 *   - Individual streaks and the Buddy Streak are separate counters with separate rules.
 *   - The Buddy Streak anchors at today when today is complete, otherwise at yesterday, so a
 *     shared streak is not destroyed at 00:01 while the day is still in progress.
 */

import type { BuddyDayRecord, GoalRaceResult, PetPalStatus } from "./types";

export function todayDateString(now: Date = new Date()): string {
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}-${String(
    now.getDate(),
  ).padStart(2, "0")}`;
}

/** Local-time date string for a timestamp, matching todayDateString's convention. */
export function dateStringOf(value: string | number | Date): string {
  return todayDateString(new Date(value));
}

/** Calendar arithmetic on YYYY-MM-DD strings, done in UTC to dodge DST edges. */
export function shiftDate(date: string, days: number): string {
  const [y, m, d] = date.split("-").map(Number);
  const dt = new Date(Date.UTC(y, (m ?? 1) - 1, d ?? 1));
  dt.setUTCDate(dt.getUTCDate() + days);
  return `${dt.getUTCFullYear()}-${String(dt.getUTCMonth() + 1).padStart(2, "0")}-${String(
    dt.getUTCDate(),
  ).padStart(2, "0")}`;
}

// ------------------------------------------------------------------ individual progress

export function percentComplete(totalMl: number, goalMl: number): number {
  if (!Number.isFinite(totalMl) || !Number.isFinite(goalMl) || goalMl <= 0) return 0;
  if (totalMl <= 0) return 0;
  // Capped for display: 140% of goal is a great day, not a 140% progress bar.
  return Math.min(100, Math.round((totalMl / goalMl) * 100));
}

export function hasCompletedGoal(totalMl: number, goalMl: number): boolean {
  return Number.isFinite(totalMl) && Number.isFinite(goalMl) && goalMl > 0 && totalMl >= goalMl;
}

// ------------------------------------------------------------------------- team progress

/**
 * Team Progress = mean of each member's percentage of their OWN goal. A member with a 2,500ml
 * goal is not advantaged or punished relative to a member with a 2,000ml goal: only the
 * fraction of their own target counts.
 */
export function teamProgress(percentA: number, percentB: number): number {
  const a = clampPercent(percentA);
  const b = clampPercent(percentB);
  return Math.round((a + b) / 2);
}

export function teamProgressFromMembers(
  members: ReadonlyArray<{ totalMl: number; goalMl: number }>,
): number {
  if (members.length === 0) return 0;
  const total = members.reduce((sum, m) => sum + percentComplete(m.totalMl, m.goalMl), 0);
  return Math.round(total / members.length);
}

function clampPercent(value: number): number {
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(100, Math.round(value)));
}

// -------------------------------------------------------------------------------- streaks

export type DayCompletion = { date: string; completed: boolean };

/**
 * Consecutive completed days ending at today (or at yesterday if today is not complete yet).
 * Mirrors the rule the existing Supabase streak sync uses in src/lib/hydration/api.ts: the
 * streak survives until the end of the current day.
 */
export function streakFromDayCompletions(
  days: ReadonlyArray<DayCompletion>,
  today: string,
): number {
  const map = new Map<string, boolean>();
  for (const day of days) map.set(day.date, day.completed);

  let cursor = today;
  if (!map.get(cursor)) cursor = shiftDate(cursor, -1);

  let count = 0;
  // Guard against a pathological map causing an unbounded walk.
  for (let i = 0; i < 3650; i += 1) {
    if (!map.get(cursor)) break;
    count += 1;
    cursor = shiftDate(cursor, -1);
  }
  return count;
}

export function individualStreakFromRecords(
  records: ReadonlyArray<BuddyDayRecord>,
  memberId: string,
  today: string,
): number {
  const days = records
    .filter((r) => r.memberId === memberId)
    .map((r) => ({ date: r.date, completed: hasCompletedGoal(r.totalMl, r.goalMl) }));
  return streakFromDayCompletions(days, today);
}

/**
 * The shared metric: consecutive days where BOTH members completed their OWN goals.
 * One member missing a day resets this to zero and does NOT touch either individual streak.
 */
export function buddyStreakFromRecords(
  records: ReadonlyArray<BuddyDayRecord>,
  memberAId: string,
  memberBId: string,
  today: string,
): number {
  const completedByDate = new Map<string, { a: boolean; b: boolean }>();
  for (const record of records) {
    if (record.memberId !== memberAId && record.memberId !== memberBId) continue;
    const entry = completedByDate.get(record.date) ?? { a: false, b: false };
    const done = hasCompletedGoal(record.totalMl, record.goalMl);
    if (record.memberId === memberAId) entry.a = entry.a || done;
    else entry.b = entry.b || done;
    completedByDate.set(record.date, entry);
  }

  const days: DayCompletion[] = [...completedByDate.entries()].map(([date, flags]) => ({
    date,
    completed: flags.a && flags.b,
  }));
  return streakFromDayCompletions(days, today);
}

/** Longest run of days where both members completed, over the records available. */
export function longestBuddyStreak(
  records: ReadonlyArray<BuddyDayRecord>,
  memberAId: string,
  memberBId: string,
): number {
  const completedDates = new Set<string>();
  const byDate = new Map<string, { a: boolean; b: boolean }>();
  for (const record of records) {
    const entry = byDate.get(record.date) ?? { a: false, b: false };
    const done = hasCompletedGoal(record.totalMl, record.goalMl);
    if (record.memberId === memberAId) entry.a = entry.a || done;
    else if (record.memberId === memberBId) entry.b = entry.b || done;
    byDate.set(record.date, entry);
  }
  for (const [date, flags] of byDate.entries()) if (flags.a && flags.b) completedDates.add(date);

  const sorted = [...completedDates].sort();
  let longest = 0;
  let run = 0;
  let previous: string | null = null;
  for (const date of sorted) {
    run = previous && shiftDate(previous, 1) === date ? run + 1 : 1;
    longest = Math.max(longest, run);
    previous = date;
  }
  return longest;
}

// -------------------------------------------------------------------------------- XP/level

/**
 * Level thresholds. Derived, never stored: XP is recomputed from hydration rows on every
 * load, so there is no counter to drift out of sync with the data.
 */
export const LEVEL_THRESHOLDS: readonly number[] = [
  0, 120, 300, 550, 850, 1200, 1600, 2050, 2550, 3100,
];
const LEVEL_TAIL_STEP = 600;

/** 50 XP for showing up and completing a day, 10 XP per logged drink. */
export const XP_PER_COMPLETED_DAY = 50;
export const XP_PER_DRINK = 10;

export type LevelInfo = {
  xp: number;
  level: number;
  levelStartXp: number;
  nextLevelXp: number | null;
  percentToNextLevel: number;
};

export function levelForXp(xp: number): LevelInfo {
  const safeXp = Number.isFinite(xp) ? Math.max(0, Math.floor(xp)) : 0;
  const last = LEVEL_THRESHOLDS[LEVEL_THRESHOLDS.length - 1];

  let level = 1;
  if (safeXp >= last) {
    level = LEVEL_THRESHOLDS.length + Math.floor((safeXp - last) / LEVEL_TAIL_STEP);
  } else {
    for (let i = 0; i < LEVEL_THRESHOLDS.length; i += 1) {
      if (safeXp >= LEVEL_THRESHOLDS[i]) level = i + 1;
    }
  }

  const levelStartXp =
    level <= LEVEL_THRESHOLDS.length
      ? LEVEL_THRESHOLDS[level - 1]
      : last + (level - LEVEL_THRESHOLDS.length) * LEVEL_TAIL_STEP;
  const nextLevelXp =
    level < LEVEL_THRESHOLDS.length ? LEVEL_THRESHOLDS[level] : levelStartXp + LEVEL_TAIL_STEP;

  const span = nextLevelXp - levelStartXp;
  const percentToNextLevel =
    span > 0 ? Math.min(100, Math.round(((safeXp - levelStartXp) / span) * 100)) : 0;

  return { xp: safeXp, level, levelStartXp, nextLevelXp, percentToNextLevel };
}

export function xpFromProgress(input: { completedDays: number; loggedDrinks: number }): number {
  const days = Number.isFinite(input.completedDays)
    ? Math.max(0, Math.floor(input.completedDays))
    : 0;
  const drinks = Number.isFinite(input.loggedDrinks)
    ? Math.max(0, Math.floor(input.loggedDrinks))
    : 0;
  return days * XP_PER_COMPLETED_DAY + drinks * XP_PER_DRINK;
}

/** Groups raw hydration rows into per-day records, with the moment the goal was crossed. */
export function dayRecordsFromLogs(
  logs: ReadonlyArray<{ logged_at: string; amount_ml: number }>,
  goalMl: number,
  memberId: string,
): BuddyDayRecord[] {
  const byDate = new Map<string, Array<{ at: number; amount: number }>>();
  for (const log of logs) {
    const date = dateStringOf(log.logged_at);
    const bucket = byDate.get(date) ?? [];
    bucket.push({ at: new Date(log.logged_at).getTime(), amount: log.amount_ml ?? 0 });
    byDate.set(date, bucket);
  }

  const records: BuddyDayRecord[] = [];
  for (const [date, entries] of byDate.entries()) {
    const ordered = [...entries].sort((x, y) => x.at - y.at);
    let running = 0;
    let completedAt: string | null = null;
    for (const entry of ordered) {
      running += entry.amount;
      if (completedAt === null && hasCompletedGoal(running, goalMl)) {
        completedAt = new Date(entry.at).toISOString();
      }
    }
    records.push({
      date,
      memberId,
      totalMl: ordered.reduce((sum, e) => sum + e.amount, 0),
      goalMl,
      completedAt,
    });
  }
  return records.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));
}

// ------------------------------------------------------------------------- pet pal status

export function petPalStatus(input: {
  selfPercent: number;
  buddyPercent: number;
  relationshipComplete: boolean;
}): PetPalStatus {
  if (input.relationshipComplete) return "buddy_complete";
  if (clampPercent(input.selfPercent) >= 100) return "goal_complete";
  if (clampPercent(input.selfPercent) >= 75) return "almost_there";
  return "hydrating";
}

export const PET_PAL_STATUS_LABEL: Record<PetPalStatus, string> = {
  hydrating: "Hydrating",
  almost_there: "Almost there",
  goal_complete: "Goal complete",
  buddy_complete: "Buddy complete",
};

// -------------------------------------------------------------------------- friendly race

/**
 * Optional competitive layer. Compares percentages of each member's OWN goal, never raw
 * litres, and applies no penalty to whoever finishes second: the Buddy Streak still counts.
 */
export function goalRaceOutcome(input: {
  enabled: boolean;
  memberA: { id: string; name: string; percent: number; completedAt: string | null };
  memberB: { id: string; name: string; percent: number; completedAt: string | null };
}): GoalRaceResult {
  const { enabled, memberA, memberB } = input;
  if (!enabled) {
    return { enabled: false, status: "off", winnerId: null, leaderId: null, summary: "" };
  }

  const aDone = clampPercent(memberA.percent) >= 100;
  const bDone = clampPercent(memberB.percent) >= 100;
  const aAt = aDone ? memberA.completedAt : null;
  const bAt = bDone ? memberB.completedAt : null;

  const leaderId = leaderOf(memberA, memberB);

  if (aDone && bDone) {
    let winnerId: string | null = null;
    if (aAt && bAt)
      winnerId = new Date(aAt).getTime() <= new Date(bAt).getTime() ? memberA.id : memberB.id;
    else if (aAt) winnerId = memberA.id;
    else if (bAt) winnerId = memberB.id;

    const winnerName =
      winnerId === memberA.id ? memberA.name : winnerId === memberB.id ? memberB.name : null;

    return {
      enabled: true,
      status: "complete",
      winnerId,
      leaderId,
      summary: winnerName
        ? `${winnerName} got there first. Both goals are done, so the Buddy Streak still counts.`
        : "Both goals are done. The Buddy Streak counts.",
    };
  }

  if (aDone || bDone) {
    const finisherName = aDone ? memberA.name : memberB.name;
    return {
      enabled: true,
      status: "waiting",
      winnerId: null,
      leaderId: finisherName ? (aDone ? memberA.id : memberB.id) : leaderId,
      summary: `${finisherName} has finished their own goal. The race is not decided until the other person finishes, and nobody loses XP either way.`,
    };
  }

  const leaderName =
    leaderId === memberA.id ? memberA.name : leaderId === memberB.id ? memberB.name : null;
  return {
    enabled: true,
    status: "in_progress",
    winnerId: null,
    leaderId,
    summary: leaderName
      ? `${leaderName} is currently ahead, measured against their own goal. Early days.`
      : "Dead level. Both of you are exactly as under-hydrated as each other.",
  };
}

function leaderOf(
  a: { id: string; percent: number },
  b: { id: string; percent: number },
): string | null {
  const pa = clampPercent(a.percent);
  const pb = clampPercent(b.percent);
  if (pa === pb) return null;
  return pa > pb ? a.id : b.id;
}

// ------------------------------------------------------------------------- streak rescue

export function streakRescue(input: {
  buddyName: string;
  buddyPercent: number;
  buddyCompleted: boolean;
  alreadyEncouraged: boolean;
}): { needed: boolean; headline: string; message: string; alreadyEncouragedToday: boolean } {
  const percent = clampPercent(input.buddyPercent);
  const needed = !input.buddyCompleted;

  return {
    needed,
    alreadyEncouragedToday: input.alreadyEncouraged,
    headline: needed
      ? `${input.buddyName} is at ${percent}% today.`
      : `${input.buddyName} is done for today.`,
    message: needed
      ? input.alreadyEncouraged
        ? "Nudge already sent today. Pip will not let you spam them. Encouragement retains its value through scarcity."
        : "A nudge costs nothing and it is the entire point of having a buddy."
      : "Nothing to rescue. Go and drink something yourself, you have been staring at this screen.",
  };
}
