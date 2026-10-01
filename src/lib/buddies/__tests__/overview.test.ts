import { describe, expect, it } from "vitest";
import { BUDDY_MEMBER_ID, SELF_MEMBER_ID } from "@/lib/buddies/store";
import { isLinked, mapOverviewToStoreState, type ServerOverview } from "@/lib/buddies/overview";
import { buddyStreakFromRecords } from "@/lib/buddies/progress";

const ASHLEY = "677b3fc1-0000-0000-0000-000000000000";
const DON = "02665a87-0000-0000-0000-000000000000";
const NOW = new Date("2026-10-01T09:00:00.000Z");

const base: ServerOverview = {
  relationship: { id: "rel-1", status: "active", createdAt: "2026-10-01T06:00:00.000Z" },
  self: { id: ASHLEY, name: "Ashley", goalMl: 2000, petPalId: "panda" },
  buddy: { id: DON, name: "Don", goalMl: 4000, petPalId: "dolphin" },
  challenge: { id: "chal-1", type: "cooperative", startDate: "2026-10-01" },
  progress: [
    {
      userId: ASHLEY,
      day: "2026-09-30",
      totalMl: 2000,
      goalMl: 2000,
      percentage: 100,
      completed: true,
      completedAt: "2026-09-30T18:00:00.000Z",
    },
    {
      userId: DON,
      day: "2026-09-30",
      totalMl: 4000,
      goalMl: 4000,
      percentage: 100,
      completed: true,
      completedAt: "2026-09-30T19:00:00.000Z",
    },
    {
      userId: DON,
      day: "2026-10-01",
      totalMl: 1600,
      goalMl: 4000,
      percentage: 40,
      completed: false,
      completedAt: null,
    },
  ],
  streak: { current: 1, longest: 1, lastSharedDate: "2026-09-30" },
  todaySelfMl: 500,
  encouragements: {
    sentByMe: false,
    sentByBuddy: true,
    myMessage: null,
    buddyMessage: "Drink up",
  },
  invite: null,
};

describe("isLinked", () => {
  it("is false for the unpaired payload the server returns before a pairing exists", () => {
    expect(isLinked(null)).toBe(false);
    expect(isLinked({ ...base, relationship: null, buddy: undefined })).toBe(false);
    expect(isLinked(base)).toBe(true);
  });
});

describe("mapOverviewToStoreState", () => {
  it("returns null when there is no pairing", () => {
    expect(
      mapOverviewToStoreState({ ...base, relationship: null, buddy: undefined }, NOW),
    ).toBeNull();
  });

  it("maps both members against their own goals", () => {
    const state = mapOverviewToStoreState(base, NOW);
    expect(state).not.toBeNull();
    expect(state!.relationship.id).toBe("rel-1");
    expect(state!.relationship.memberAId).toBe(SELF_MEMBER_ID);
    expect(state!.relationship.memberBId).toBe(BUDDY_MEMBER_ID);
    expect(state!.profiles[SELF_MEMBER_ID]!.name).toBe("Ashley");
    expect(state!.profiles[SELF_MEMBER_ID]!.hydrationGoalMl).toBe(2000);
    expect(state!.profiles[BUDDY_MEMBER_ID]!).toMatchObject({
      name: "Don",
      hydrationGoalMl: 4000,
      petPalId: "dolphin",
    });
  });

  it("keeps today out of the history and puts his real today figure in todayMl", () => {
    const state = mapOverviewToStoreState(base, NOW)!;
    expect(state.mockBuddy.todayMl).toBe(1600);
    expect(state.mockBuddy.completedAt).toBeNull();
    expect(state.mockBuddy.history).toHaveLength(1);
    expect(state.mockBuddy.history[0]).toMatchObject({
      memberId: BUDDY_MEMBER_ID,
      date: "2026-09-30",
      totalMl: 4000,
      goalMl: 4000,
    });
  });

  it("names both members' rows so the shared streak can be recomputed", () => {
    const state = mapOverviewToStoreState(base, NOW)!;
    expect(state.mockBuddy.history.every((row) => row.memberId === BUDDY_MEMBER_ID)).toBe(true);
    // Only his own rows exist here, so a shared run cannot be read off one side alone.
    expect(
      buddyStreakFromRecords(
        state.mockBuddy.history,
        SELF_MEMBER_ID,
        BUDDY_MEMBER_ID,
        "2026-10-01",
      ),
    ).toBe(0);
  });

  it("reads the race switch and today's nudge out of the payload", () => {
    const state = mapOverviewToStoreState(base, NOW)!;
    expect(state.raceEnabled).toBe(false);
    expect(state.encouragements).toHaveLength(1);
    expect(state.encouragements[0]).toMatchObject({
      fromMemberId: BUDDY_MEMBER_ID,
      toMemberId: SELF_MEMBER_ID,
      date: "2026-10-01",
      message: "Drink up",
    });

    const racing = mapOverviewToStoreState(
      { ...base, challenge: { id: "chal-1", type: "goal_race", startDate: "2026-10-01" } },
      NOW,
    )!;
    expect(racing.raceEnabled).toBe(true);
  });

  it("never invents a Pet Pal the server did not store", () => {
    const state = mapOverviewToStoreState(
      { ...base, buddy: { ...base.buddy!, petPalId: null } },
      NOW,
    )!;
    expect(state.profiles[BUDDY_MEMBER_ID]!.petPalId).toBeNull();
  });
});
