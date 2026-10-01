import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  BUDDY_MEMBER_ID,
  BUDDY_STORAGE_KEY,
  createLocalBuddySource,
  createSeedState,
  encouragementsOn,
  ENCOURAGEMENT_LINES,
  ensureMockHistoryFresh,
  parseStoredState,
  pickEncouragementLine,
  SELF_MEMBER_ID,
  setMemberPetPal,
  setMockBuddyGoal,
  setMockBuddyToday,
  setRaceEnabled,
  addEncouragement,
} from "@/lib/buddies/store";
import { hasCompletedGoal, shiftDate, todayDateString } from "@/lib/buddies/progress";

/** Minimal localStorage stand-in so the node test environment can exercise persistence. */
class MemoryStorage {
  private map = new Map<string, string>();
  get length() {
    return this.map.size;
  }
  clear() {
    this.map.clear();
  }
  getItem(key: string) {
    return this.map.has(key) ? (this.map.get(key) as string) : null;
  }
  setItem(key: string, value: string) {
    this.map.set(key, String(value));
  }
  removeItem(key: string) {
    this.map.delete(key);
  }
  key(index: number) {
    return [...this.map.keys()][index] ?? null;
  }
}

let storage: MemoryStorage;

beforeEach(() => {
  storage = new MemoryStorage();
  (globalThis as unknown as { window: unknown }).window = { localStorage: storage };
});

afterEach(() => {
  delete (globalThis as unknown as { window?: unknown }).window;
});

const seeded = new Date(2026, 9, 1, 9, 0, 0);

describe("buddy relationship creation", () => {
  it("seeds the Ashley ↔ Don relationship on first load", () => {
    const state = createSeedState(seeded);
    expect(state.relationship.memberAId).toBe(SELF_MEMBER_ID);
    expect(state.relationship.memberBId).toBe(BUDDY_MEMBER_ID);
    expect(state.relationship.status).toBe("active");
    expect(state.profiles[SELF_MEMBER_ID].name).toBe("Ashley");
    expect(state.profiles[BUDDY_MEMBER_ID].name).toBe("Don");
  });

  it("leaves Don's Pet Pal unchosen rather than hard-coding an animal", () => {
    expect(createSeedState(seeded).profiles[BUDDY_MEMBER_ID].petPalId).toBeNull();
  });

  it("keeps the two goals separate", () => {
    const state = createSeedState(seeded);
    expect(state.profiles[SELF_MEMBER_ID].hydrationGoalMl).toBe(2000);
    expect(state.profiles[BUDDY_MEMBER_ID].hydrationGoalMl).toBe(2500);
  });

  it("seeds a mock history of completed days for the buddy", () => {
    const state = createSeedState(seeded);
    expect(state.mockBuddy.history).toHaveLength(11);
    expect(
      state.mockBuddy.history.every(
        (r) => r.memberId === BUDDY_MEMBER_ID && hasCompletedGoal(r.totalMl, r.goalMl),
      ),
    ).toBe(true);
    expect(state.mockBuddy.history.some((r) => r.date === "2026-09-30")).toBe(true);
  });
});

describe("pet pal selection", () => {
  it("stores the chosen animal and reports no change for a repeat choice", () => {
    const base = createSeedState(seeded);
    const withDolphin = setMemberPetPal(base, BUDDY_MEMBER_ID, "dolphin");
    expect(withDolphin.profiles[BUDDY_MEMBER_ID].petPalId).toBe("dolphin");
    expect(setMemberPetPal(withDolphin, BUDDY_MEMBER_ID, "dolphin")).toBe(withDolphin);
    expect(withDolphin.profiles[SELF_MEMBER_ID].petPalId).toBe("panda");
  });

  it("can be switched to the elephant and back", () => {
    const base = createSeedState(seeded);
    const elephant = setMemberPetPal(base, BUDDY_MEMBER_ID, "elephant");
    expect(elephant.profiles[BUDDY_MEMBER_ID].petPalId).toBe("elephant");
    const dolphin = setMemberPetPal(elephant, BUDDY_MEMBER_ID, "dolphin");
    expect(dolphin.profiles[BUDDY_MEMBER_ID].petPalId).toBe("dolphin");
  });

  it("ignores unknown members and unknown pets", () => {
    const base = createSeedState(seeded);
    expect(setMemberPetPal(base, "nobody", "dolphin")).toBe(base);
    expect(setMemberPetPal(base, BUDDY_MEMBER_ID, "unicorn" as never)).toBe(base);
  });
});

describe("pet pal persistence (Test D)", () => {
  it("survives a reload with Don on the dolphin", () => {
    const first = createLocalBuddySource(seeded);
    first.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "dolphin"));

    // Simulate leaving and reloading the screen: a brand new source instance.
    const second = createLocalBuddySource(seeded);
    expect(second.getState().profiles[BUDDY_MEMBER_ID].petPalId).toBe("dolphin");

    second.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "elephant"));
    const third = createLocalBuddySource(seeded);
    expect(third.getState().profiles[BUDDY_MEMBER_ID].petPalId).toBe("elephant");
  });

  it("writes to the documented storage key", () => {
    const source = createLocalBuddySource(seeded);
    source.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "dolphin"));
    expect(storage.getItem(BUDDY_STORAGE_KEY)).toContain("dolphin");
  });

  it("notifies subscribers on change", () => {
    const source = createLocalBuddySource(seeded);
    let calls = 0;
    const unsubscribe = source.subscribe(() => {
      calls += 1;
    });
    source.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "dolphin"));
    expect(calls).toBe(1);
    unsubscribe();
    source.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "elephant"));
    expect(calls).toBe(1);
  });

  it("re-seeds rather than throwing when the stored blob is corrupt", () => {
    storage.setItem(BUDDY_STORAGE_KEY, "{not json at all");
    expect(parseStoredState("{not json at all", seeded)).toBeNull();
    const source = createLocalBuddySource(seeded);
    expect(source.getState().version).toBe(1);
    expect(source.getState().profiles[BUDDY_MEMBER_ID].petPalId).toBeNull();
  });

  it("rejects a blob from an unknown version or a missing member", () => {
    const good = createSeedState(seeded);
    expect(parseStoredState(JSON.stringify({ ...good, version: 99 }), seeded)).toBeNull();
    expect(
      parseStoredState(
        JSON.stringify({ ...good, profiles: { ashley: good.profiles.ashley } }),
        seeded,
      ),
    ).toBeNull();
  });

  it("round-trips a valid blob", () => {
    const good = setMemberPetPal(createSeedState(seeded), BUDDY_MEMBER_ID, "dolphin");
    const restored = parseStoredState(JSON.stringify(good), seeded);
    expect(restored?.profiles[BUDDY_MEMBER_ID].petPalId).toBe("dolphin");
    expect(restored?.relationship.id).toBe(good.relationship.id);
  });
});

describe("mock buddy intake", () => {
  it("records the completion moment only once the goal is reached", () => {
    const base = createSeedState(seeded);
    const behind = setMockBuddyToday(base, 1500, "2026-10-01T12:00:00.000Z");
    expect(behind.mockBuddy.todayMl).toBe(1500);
    expect(behind.mockBuddy.completedAt).toBeNull();

    const done = setMockBuddyToday(base, 2500, "2026-10-01T18:00:00.000Z");
    expect(done.mockBuddy.completedAt).toBe("2026-10-01T18:00:00.000Z");
  });

  it("clears the completion moment when the buddy drops back below goal", () => {
    const done = setMockBuddyToday(createSeedState(seeded), 2500, "2026-10-01T18:00:00.000Z");
    const behind = setMockBuddyToday(done, 600);
    expect(behind.mockBuddy.completedAt).toBeNull();
  });

  it("normalises rubbish input to zero", () => {
    const state = setMockBuddyToday(createSeedState(seeded), Number.NaN);
    expect(state.mockBuddy.todayMl).toBe(0);
    expect(setMockBuddyToday(createSeedState(seeded), -500).mockBuddy.todayMl).toBe(0);
  });

  it("rebuilds the mock history when the buddy goal changes", () => {
    const state = setMockBuddyGoal(createSeedState(seeded), 1800);
    expect(state.profiles[BUDDY_MEMBER_ID].hydrationGoalMl).toBe(1800);
    expect(state.mockBuddy.history.every((r) => r.goalMl === 1800)).toBe(true);
  });
});

describe("mock history freshness", () => {
  it("re-anchors a stale window to yesterday without inventing gap days as complete", () => {
    const state = createSeedState(new Date(2026, 8, 20, 9, 0, 0));
    const refreshed = ensureMockHistoryFresh(state, seeded);
    const dates = refreshed.mockBuddy.history.map((r) => r.date).sort();
    expect(dates).toHaveLength(11);
    expect(dates[dates.length - 1]).toBe("2026-09-30");
    // The gap between 2026-09-11 and 2026-09-19 is simply absent, so the streak is shorter.
    expect(dates[0]).toBe("2026-09-20");
  });

  it("leaves an already-current window untouched", () => {
    const state = createSeedState(seeded);
    expect(ensureMockHistoryFresh(state, seeded)).toBe(state);
  });
});

describe("encouragement state", () => {
  it("records a nudge and finds it for the day and direction it was sent", () => {
    const base = createSeedState(seeded);
    const date = todayDateString(seeded);
    const state = addEncouragement(base, {
      fromMemberId: SELF_MEMBER_ID,
      toMemberId: BUDDY_MEMBER_ID,
      date,
      at: seeded.toISOString(),
      message: pickEncouragementLine(date),
    });
    expect(encouragementsOn(state, SELF_MEMBER_ID, BUDDY_MEMBER_ID, date)).toHaveLength(1);
    expect(encouragementsOn(state, BUDDY_MEMBER_ID, SELF_MEMBER_ID, date)).toHaveLength(0);
    expect(
      encouragementsOn(state, SELF_MEMBER_ID, BUDDY_MEMBER_ID, shiftDate(date, -1)),
    ).toHaveLength(0);
  });

  it("picks the same canned line for the same day and one from the list", () => {
    const first = pickEncouragementLine("2026-10-01");
    expect(first).toBe(pickEncouragementLine("2026-10-01"));
    expect(ENCOURAGEMENT_LINES).toContain(first as (typeof ENCOURAGEMENT_LINES)[number]);
  });
});

describe("race toggle and reset", () => {
  it("switches the optional challenge on and off", () => {
    const base = createSeedState(seeded);
    const on = setRaceEnabled(base, true);
    expect(on.raceEnabled).toBe(true);
    expect(setRaceEnabled(on, true)).toBe(on);
    expect(setRaceEnabled(on, false).raceEnabled).toBe(false);
  });

  it("reset clears local buddy state back to the seed", () => {
    const source = createLocalBuddySource(seeded);
    source.update((state) => setMemberPetPal(state, BUDDY_MEMBER_ID, "dolphin"));
    source.update((state) => setRaceEnabled(state, true));
    source.reset();
    const after = source.getState();
    expect(after.profiles[BUDDY_MEMBER_ID].petPalId).toBeNull();
    expect(after.raceEnabled).toBe(false);
    expect(after.encouragements).toHaveLength(0);
  });
});
