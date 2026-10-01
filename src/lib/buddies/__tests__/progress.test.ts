import { describe, expect, it } from "vitest";
import {
  buddyStreakFromRecords,
  dateStringOf,
  dayRecordsFromLogs,
  goalRaceOutcome,
  hasCompletedGoal,
  individualStreakFromRecords,
  levelForXp,
  longestBuddyStreak,
  percentComplete,
  petPalStatus,
  shiftDate,
  streakFromDayCompletions,
  streakRescue,
  teamProgress,
  teamProgressFromMembers,
  todayDateString,
  xpFromProgress,
} from "@/lib/buddies/progress";
import type { BuddyDayRecord } from "@/lib/buddies/types";

const ASHLEY = "ashley";
const DON = "don";
const TODAY = "2026-10-01";

function record(
  date: string,
  memberId: string,
  totalMl: number,
  goalMl: number,
  completedAt: string | null = null,
): BuddyDayRecord {
  return { date, memberId, totalMl, goalMl, completedAt };
}

// ------------------------------------------------------------------ individual progress

describe("percentComplete", () => {
  it("measures the member against their own goal", () => {
    expect(percentComplete(750, 2000)).toBe(38);
    expect(percentComplete(1200, 2500)).toBe(48);
    expect(percentComplete(2000, 2000)).toBe(100);
  });

  it("caps over-achievement at 100 so the bar never overflows", () => {
    expect(percentComplete(4000, 2000)).toBe(100);
  });

  it("returns 0 for missing or nonsensical input", () => {
    expect(percentComplete(0, 2000)).toBe(0);
    expect(percentComplete(-100, 2000)).toBe(0);
    expect(percentComplete(500, 0)).toBe(0);
    expect(percentComplete(Number.NaN, 2000)).toBe(0);
  });
});

describe("hasCompletedGoal", () => {
  it("requires reaching the goal, and never treats a 0 goal as complete", () => {
    expect(hasCompletedGoal(1999, 2000)).toBe(false);
    expect(hasCompletedGoal(2000, 2000)).toBe(true);
    expect(hasCompletedGoal(2500, 2000)).toBe(true);
    expect(hasCompletedGoal(0, 0)).toBe(false);
  });
});

// -------------------------------------------------------------------------- team progress

describe("teamProgress", () => {
  it("averages the two percentages from the brief: 80% and 60% is 70%", () => {
    expect(teamProgress(80, 60)).toBe(70);
  });

  it("clamps each side before averaging", () => {
    expect(teamProgress(150, 50)).toBe(75);
    expect(teamProgress(0, 0)).toBe(0);
    expect(teamProgress(100, 100)).toBe(100);
  });

  it("does not reward the larger hydration target", () => {
    // 1000 of 1000 beats 1200 of 2500 as a fraction, even though 1200ml is more water.
    const small = teamProgressFromMembers([{ totalMl: 1000, goalMl: 1000 }]);
    const large = teamProgressFromMembers([{ totalMl: 1200, goalMl: 2500 }]);
    expect(small).toBe(100);
    expect(large).toBe(48);
    expect(
      teamProgressFromMembers([
        { totalMl: 1000, goalMl: 1000 },
        { totalMl: 1200, goalMl: 2500 },
      ]),
    ).toBe(74);
  });
});

// -------------------------------------------------------------------------------- streaks

describe("date helpers", () => {
  it("shifts across month and year boundaries", () => {
    expect(shiftDate("2026-10-01", -1)).toBe("2026-09-30");
    expect(shiftDate("2026-01-01", -1)).toBe("2025-12-31");
    expect(shiftDate("2024-02-28", 1)).toBe("2024-02-29");
    expect(shiftDate("2026-02-28", 1)).toBe("2026-03-01");
  });

  it("formats local dates consistently", () => {
    expect(todayDateString(new Date(2026, 9, 1, 23, 30))).toBe("2026-10-01");
    expect(dateStringOf("2026-10-01T12:00:00.000Z")).toMatch(/^2026-10-0[12]$/);
  });
});

describe("streakFromDayCompletions", () => {
  it("counts back from today when today is complete", () => {
    const days = [
      { date: "2026-09-28", completed: true },
      { date: "2026-09-29", completed: true },
      { date: "2026-09-30", completed: true },
      { date: "2026-10-01", completed: true },
    ];
    expect(streakFromDayCompletions(days, TODAY)).toBe(4);
  });

  it("keeps a streak alive while today is still in progress", () => {
    const days = [
      { date: "2026-09-29", completed: true },
      { date: "2026-09-30", completed: true },
      { date: "2026-10-01", completed: false },
    ];
    expect(streakFromDayCompletions(days, TODAY)).toBe(2);
  });

  it("breaks on the first missing day", () => {
    const days = [
      { date: "2026-09-27", completed: true },
      { date: "2026-09-28", completed: false },
      { date: "2026-09-29", completed: true },
      { date: "2026-09-30", completed: true },
    ];
    expect(streakFromDayCompletions(days, TODAY)).toBe(2);
  });

  it("returns 0 when nothing is complete", () => {
    expect(streakFromDayCompletions([{ date: "2026-09-30", completed: false }], TODAY)).toBe(0);
    expect(streakFromDayCompletions([], TODAY)).toBe(0);
  });
});

describe("individualStreakFromRecords", () => {
  it("only counts the named member's own days", () => {
    const records = [
      record("2026-09-29", ASHLEY, 2000, 2000),
      record("2026-09-30", ASHLEY, 2100, 2000),
      // Don misses on the 30th, which must not touch Ashley's streak.
      record("2026-09-29", DON, 2500, 2500),
      record("2026-09-30", DON, 900, 2500),
    ];
    expect(individualStreakFromRecords(records, ASHLEY, TODAY)).toBe(2);
    // Don's most recent recorded day was a miss, so his own streak is already broken.
    expect(individualStreakFromRecords(records, DON, TODAY)).toBe(0);
  });
});

describe("buddyStreakFromRecords", () => {
  it("counts consecutive days when BOTH members hit their own goals", () => {
    const records = [
      record("2026-09-29", ASHLEY, 2000, 2000),
      record("2026-09-29", DON, 2500, 2500),
      record("2026-09-30", ASHLEY, 2400, 2000),
      record("2026-09-30", DON, 2600, 2500),
      record("2026-10-01", ASHLEY, 2000, 2000),
      record("2026-10-01", DON, 2500, 2500),
    ];
    expect(buddyStreakFromRecords(records, ASHLEY, DON, TODAY)).toBe(3);
  });

  it("resets when one member misses, while individual streaks stay independent", () => {
    const records = [
      record("2026-09-28", ASHLEY, 2000, 2000),
      record("2026-09-28", DON, 2500, 2500),
      record("2026-09-29", ASHLEY, 2000, 2000),
      record("2026-09-29", DON, 800, 2500), // Don misses
      record("2026-09-30", ASHLEY, 2000, 2000),
      record("2026-09-30", DON, 2500, 2500),
      record("2026-10-01", ASHLEY, 2000, 2000),
      record("2026-10-01", DON, 2500, 2500),
    ];
    expect(buddyStreakFromRecords(records, ASHLEY, DON, TODAY)).toBe(2);
    // Ashley did not miss a day, so her own streak is longer than the shared one.
    expect(individualStreakFromRecords(records, ASHLEY, TODAY)).toBe(4);
    expect(individualStreakFromRecords(records, DON, TODAY)).toBe(2);
  });

  it("does not count today until BOTH are complete (Test B: Ashley 100%, Don 60%)", () => {
    const records = [
      record("2026-09-29", ASHLEY, 2000, 2000),
      record("2026-09-29", DON, 2500, 2500),
      record("2026-09-30", ASHLEY, 2000, 2000),
      record("2026-09-30", DON, 2500, 2500),
      record("2026-10-01", ASHLEY, 2000, 2000), // complete
      record("2026-10-01", DON, 1500, 2500), // 60%, not complete
    ];
    expect(buddyStreakFromRecords(records, ASHLEY, DON, TODAY)).toBe(2);
  });

  it("uses a different goal per member rather than comparing volumes", () => {
    const records = [
      // Don drinks more water but misses his own target; Ashley hits hers.
      record("2026-10-01", DON, 2000, 2500),
      record("2026-10-01", ASHLEY, 1500, 1500),
    ];
    expect(buddyStreakFromRecords(records, ASHLEY, DON, TODAY)).toBe(0);
  });
});

describe("longestBuddyStreak", () => {
  it("finds the best run across the available history", () => {
    const records = [
      record("2026-09-20", ASHLEY, 2000, 2000),
      record("2026-09-20", DON, 2500, 2500),
      record("2026-09-21", ASHLEY, 2000, 2000),
      record("2026-09-21", DON, 2500, 2500),
      record("2026-09-22", ASHLEY, 2000, 2000),
      record("2026-09-22", DON, 2500, 2500),
      record("2026-09-25", ASHLEY, 2000, 2000),
      record("2026-09-25", DON, 2500, 2500),
    ];
    expect(longestBuddyStreak(records, ASHLEY, DON)).toBe(3);
  });

  it("returns 0 with no shared completed days", () => {
    expect(longestBuddyStreak([record("2026-09-20", ASHLEY, 100, 2000)], ASHLEY, DON)).toBe(0);
  });
});

// ---------------------------------------------------------------------------- xp / level

describe("xpFromProgress and levelForXp", () => {
  it("gives the brief's mock buddy 11 completed days and level 4", () => {
    const xp = xpFromProgress({ completedDays: 11, loggedDrinks: 0 });
    expect(xp).toBe(550);
    expect(levelForXp(xp).level).toBe(4);
  });

  it("rewards logged drinks as well as completed days", () => {
    expect(xpFromProgress({ completedDays: 2, loggedDrinks: 5 })).toBe(150);
    expect(xpFromProgress({ completedDays: 0, loggedDrinks: 0 })).toBe(0);
    expect(xpFromProgress({ completedDays: -3, loggedDrinks: Number.NaN })).toBe(0);
  });

  it("maps thresholds to levels with a sensible progress fraction", () => {
    expect(levelForXp(0).level).toBe(1);
    expect(levelForXp(119).level).toBe(1);
    expect(levelForXp(120).level).toBe(2);
    expect(levelForXp(300).level).toBe(3);
    expect(levelForXp(3100).level).toBe(10);
    expect(levelForXp(3300).percentToNextLevel).toBe(33);
    expect(levelForXp(-50).xp).toBe(0);
  });

  it("keeps producing levels past the last threshold", () => {
    expect(levelForXp(3700).level).toBe(11);
    expect(levelForXp(3700).levelStartXp).toBe(3700);
    expect(levelForXp(999999).level).toBeGreaterThan(11);
  });
});

// ------------------------------------------------------------------- records from real rows

describe("dayRecordsFromLogs", () => {
  it("groups rows per day and records when the goal was crossed", () => {
    const logs = [
      { logged_at: "2026-10-01T06:15:00.000Z", amount_ml: 400 },
      { logged_at: "2026-10-01T08:45:00.000Z", amount_ml: 700 },
      { logged_at: "2026-10-01T11:05:00.000Z", amount_ml: 500 },
      { logged_at: "2026-10-01T14:00:00.000Z", amount_ml: 600 },
    ];
    const records = dayRecordsFromLogs(logs, 1500, ASHLEY);
    expect(records).toHaveLength(1);
    expect(records[0].totalMl).toBe(2200);
    expect(records[0].memberId).toBe(ASHLEY);
    expect(records[0].completedAt).toBe(new Date("2026-10-01T11:05:00.000Z").toISOString());
  });

  it("sorts rows before accumulating so the crossing time is the real one", () => {
    const logs = [
      { logged_at: "2026-10-01T18:00:00.000Z", amount_ml: 900 },
      { logged_at: "2026-10-01T07:00:00.000Z", amount_ml: 900 },
    ];
    const records = dayRecordsFromLogs(logs, 1000, DON);
    expect(records[0].completedAt).toBe(new Date("2026-10-01T18:00:00.000Z").toISOString());
  });

  it("leaves completedAt null when the goal was never reached", () => {
    const records = dayRecordsFromLogs(
      [{ logged_at: "2026-10-01T09:00:00.000Z", amount_ml: 300 }],
      2000,
      ASHLEY,
    );
    expect(records[0].completedAt).toBeNull();
    expect(records[0].totalMl).toBe(300);
  });

  it("handles an empty log list", () => {
    expect(dayRecordsFromLogs([], 2000, ASHLEY)).toEqual([]);
  });
});

// ------------------------------------------------------------------------ pet pal status

describe("petPalStatus", () => {
  it("walks hydrating → almost there → goal complete → buddy complete", () => {
    expect(petPalStatus({ selfPercent: 10, buddyPercent: 60, relationshipComplete: false })).toBe(
      "hydrating",
    );
    expect(petPalStatus({ selfPercent: 80, buddyPercent: 60, relationshipComplete: false })).toBe(
      "almost_there",
    );
    expect(petPalStatus({ selfPercent: 100, buddyPercent: 60, relationshipComplete: false })).toBe(
      "goal_complete",
    );
    expect(petPalStatus({ selfPercent: 100, buddyPercent: 100, relationshipComplete: true })).toBe(
      "buddy_complete",
    );
  });

  it("shows the shared completion state over the individual one", () => {
    expect(petPalStatus({ selfPercent: 20, buddyPercent: 100, relationshipComplete: true })).toBe(
      "buddy_complete",
    );
  });
});

// ------------------------------------------------------------------------- goal race

describe("goalRaceOutcome", () => {
  const base = {
    memberA: { id: ASHLEY, name: "Ashley", percent: 0, completedAt: null as string | null },
    memberB: { id: DON, name: "Don", percent: 0, completedAt: null as string | null },
  };

  it("is inert unless the optional challenge is switched on", () => {
    const result = goalRaceOutcome({ enabled: false, ...base });
    expect(result.status).toBe("off");
    expect(result.winnerId).toBeNull();
    expect(result.summary).toBe("");
  });

  it("names whoever is ahead on percentage, not on litres", () => {
    const result = goalRaceOutcome({
      enabled: true,
      memberA: { id: ASHLEY, name: "Ashley", percent: 92, completedAt: null },
      memberB: { id: DON, name: "Don", percent: 74, completedAt: null },
    });
    expect(result.status).toBe("in_progress");
    expect(result.leaderId).toBe(ASHLEY);
    expect(result.summary).toContain("Ashley");
  });

  it("reports a dead heat without inventing a loser", () => {
    const result = goalRaceOutcome({
      enabled: true,
      memberA: { id: ASHLEY, name: "Ashley", percent: 50, completedAt: null },
      memberB: { id: DON, name: "Don", percent: 50, completedAt: null },
    });
    expect(result.leaderId).toBeNull();
    expect(result.summary).toContain("Dead level");
  });

  it("waits for the second finisher rather than declaring a win early", () => {
    const result = goalRaceOutcome({
      enabled: true,
      memberA: {
        id: ASHLEY,
        name: "Ashley",
        percent: 100,
        completedAt: "2026-10-01T10:00:00.000Z",
      },
      memberB: { id: DON, name: "Don", percent: 40, completedAt: null },
    });
    expect(result.status).toBe("waiting");
    expect(result.winnerId).toBeNull();
  });

  it("awards the race to the earlier completion and keeps the shared streak intact", () => {
    const result = goalRaceOutcome({
      enabled: true,
      memberA: {
        id: ASHLEY,
        name: "Ashley",
        percent: 100,
        completedAt: "2026-10-01T10:00:00.000Z",
      },
      memberB: { id: DON, name: "Don", percent: 100, completedAt: "2026-10-01T19:30:00.000Z" },
    });
    expect(result.status).toBe("complete");
    expect(result.winnerId).toBe(ASHLEY);
    expect(result.summary).toContain("Buddy Streak still counts");
  });

  it("still resolves when completion timestamps are unavailable", () => {
    const result = goalRaceOutcome({
      enabled: true,
      memberA: { id: ASHLEY, name: "Ashley", percent: 100, completedAt: null },
      memberB: { id: DON, name: "Don", percent: 100, completedAt: null },
    });
    expect(result.status).toBe("complete");
    expect(result.winnerId).toBeNull();
    expect(result.summary).toContain("Buddy Streak counts");
  });
});

// ---------------------------------------------------------------------- streak rescue

describe("streakRescue", () => {
  it("offers a nudge when the buddy is behind", () => {
    const rescue = streakRescue({
      buddyName: "Don",
      buddyPercent: 42,
      buddyCompleted: false,
      alreadyEncouraged: false,
    });
    expect(rescue.needed).toBe(true);
    expect(rescue.headline).toBe("Don is at 42% today.");
    expect(rescue.alreadyEncouragedToday).toBe(false);
  });

  it("does not offer a second nudge on the same day", () => {
    const rescue = streakRescue({
      buddyName: "Don",
      buddyPercent: 42,
      buddyCompleted: false,
      alreadyEncouraged: true,
    });
    expect(rescue.needed).toBe(true);
    expect(rescue.alreadyEncouragedToday).toBe(true);
    expect(rescue.message).toContain("already sent");
  });

  it("has nothing to rescue once the buddy is done", () => {
    const rescue = streakRescue({
      buddyName: "Don",
      buddyPercent: 100,
      buddyCompleted: true,
      alreadyEncouraged: false,
    });
    expect(rescue.needed).toBe(false);
    expect(rescue.headline).toContain("done for today");
  });
});
