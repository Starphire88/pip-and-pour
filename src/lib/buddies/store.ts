/**
 * Streak Buddies — persistence.
 *
 * WHAT IS REAL HERE AND WHAT IS NOT
 *   real   : the storage mechanism itself (localStorage, survives reload).
 *   local  : the whole buddy graph. The relationship, both Pet Pal selections, the shared
 *            streak history for the buddy, encouragements and the race toggle live on this
 *            device only. Two devices would show two different buddy states.
 *   mock   : the buddy member himself. There is no second authenticated account in this
 *            prototype, so Don's hydration is a local number that the prototype controls
 *            can move. Ashley's own hydration is never mocked: it is read from Supabase by
 *            src/hooks/useStreakBuddies.ts.
 *
 * WHY LOCALSTORAGE AND NOT SUPABASE YET
 *   The live tables (hydration_logs, user_settings, streaks) are RLS-scoped to
 *   `auth.uid() = user_id`, so a signed-in user cannot read a buddy's rows by design. A real
 *   shared state needs new tables plus a policy that joins through a buddy_relationships
 *   row. That migration is written and deliberately NOT applied:
 *   supabase/migrations/0005_streak_buddies.sql. The adapter interface below is the seam the
 *   Supabase implementation slots into; no UI changes would be required.
 */

import type {
  BuddyDayRecord,
  BuddyRelationship,
  BuddyStoreStateShape,
  Encouragement,
  PetPalId,
} from "./types";
import { shiftDate, todayDateString } from "./progress";
import { isPetPalId } from "./pet-pals";

export const BUDDY_STORAGE_KEY = "pip.streakBuddies.v1";
export const SELF_MEMBER_ID = "ashley";
export const BUDDY_MEMBER_ID = "don";

/** Ashley's default buddy-side numbers for the prototype. Ashley's own goal stays real. */
export const MOCK_BUDDY_GOAL_ML = 2500;
export const MOCK_BUDDY_SEED_TODAY_ML = 1200;
const MOCK_HISTORY_DAYS = 11;
const MAX_DAY_WALK = 3650;

export interface BuddyDataSource {
  readonly kind: "local" | "supabase";
  getState(): BuddyStoreStateShape;
  getServerState(): BuddyStoreStateShape;
  subscribe(listener: () => void): () => void;
  update(mutator: (state: BuddyStoreStateShape) => BuddyStoreStateShape): void;
  reset(): void;
}

// ------------------------------------------------------------------------ seed / defaults

/** Deterministic mock history: the buddy shows up every day, which is the interesting case
 * for a shared streak. Generated once, then persisted, so it never shifts under the UI. */
function buildMockBuddyHistory(today: string, goalMl: number): BuddyDayRecord[] {
  const records: BuddyDayRecord[] = [];
  for (let i = 1; i <= MOCK_HISTORY_DAYS; i += 1) {
    const date = shiftDate(today, -i);
    const [y, m, d] = date.split("-").map(Number);
    // Slightly over goal, varying, so the mock is not suspiciously uniform.
    const totalMl = goalMl + 120 + ((i * 137) % 420);
    const minutes = (i * 7) % 60;
    const completedAt = new Date(y, m - 1, d, 8, minutes, 0).toISOString();
    records.push({ date, memberId: BUDDY_MEMBER_ID, totalMl, goalMl, completedAt });
  }
  return records;
}

export function createSeedState(now: Date = new Date()): BuddyStoreStateShape {
  const today = todayDateString(now);
  return {
    version: 1,
    seededAt: now.toISOString(),
    relationship: {
      id: "rel-ashley-don",
      memberAId: SELF_MEMBER_ID,
      memberBId: BUDDY_MEMBER_ID,
      status: "active",
      createdAt: now.toISOString(),
    },
    profiles: {
      [SELF_MEMBER_ID]: {
        memberId: SELF_MEMBER_ID,
        name: "Ashley",
        petPalId: "panda",
        hydrationGoalMl: 2000,
      },
      [BUDDY_MEMBER_ID]: {
        memberId: BUDDY_MEMBER_ID,
        name: "Don",
        // Deliberately null: Don chooses Elephant or Dolphin, nothing is pre-picked for him.
        petPalId: null,
        hydrationGoalMl: MOCK_BUDDY_GOAL_ML,
      },
    },
    mockBuddy: {
      memberId: BUDDY_MEMBER_ID,
      todayMl: MOCK_BUDDY_SEED_TODAY_ML,
      completedAt: null,
      history: buildMockBuddyHistory(today, MOCK_BUDDY_GOAL_ML),
    },
    raceEnabled: false,
    encouragements: [],
  };
}

/**
 * Keeps the mocked buddy's rolling window ending at yesterday. Only touches the mock: real
 * members' data is never regenerated. Documented as mock behaviour in the dashboard footer.
 */
export function ensureMockHistoryFresh(
  state: BuddyStoreStateShape,
  now: Date = new Date(),
): BuddyStoreStateShape {
  const today = todayDateString(now);
  const yesterday = shiftDate(today, -1);
  const history = state.mockBuddy.history;
  const goalMl = state.mockBuddy.history[0]?.goalMl ?? MOCK_BUDDY_GOAL_ML;
  const freshest = history.reduce<string | null>(
    (max, record) => (max === null || record.date > max ? record.date : max),
    null,
  );

  if (freshest === yesterday) return state;
  // A gap means the device went unused. Rather than invent completed days inside the gap,
  // the whole window is re-anchored so the mock stays coherent and the gap is visible as a
  // shorter streak rather than a longer one.
  return {
    ...state,
    mockBuddy: { ...state.mockBuddy, history: buildMockBuddyHistory(today, goalMl) },
  };
}

// ------------------------------------------------------------------------- local adapter

function isBrowser(): boolean {
  return typeof window !== "undefined" && typeof window.localStorage !== "undefined";
}

/** Reads and repairs persisted state. Any parse failure falls back to a fresh seed rather
 * than throwing: a corrupted blob must not brick the dashboard. */
export function parseStoredState(raw: string, now: Date = new Date()): BuddyStoreStateShape | null {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    return null;
  }
  if (!parsed || typeof parsed !== "object") return null;

  const candidate = parsed as Partial<BuddyStoreStateShape>;
  if (candidate.version !== 1) return null;
  if (!candidate.relationship || !candidate.profiles || !candidate.mockBuddy) return null;
  if (!Array.isArray(candidate.mockBuddy.history)) return null;
  if (![SELF_MEMBER_ID, BUDDY_MEMBER_ID].every((id) => candidate.profiles![id])) return null;

  const seed = createSeedState(now);
  return ensureMockHistoryFresh(
    {
      ...seed,
      ...candidate,
      profiles: {
        [SELF_MEMBER_ID]: {
          ...seed.profiles[SELF_MEMBER_ID],
          ...candidate.profiles![SELF_MEMBER_ID],
        },
        [BUDDY_MEMBER_ID]: {
          ...seed.profiles[BUDDY_MEMBER_ID],
          ...candidate.profiles![BUDDY_MEMBER_ID],
        },
      },
      mockBuddy: { ...seed.mockBuddy, ...candidate.mockBuddy },
      encouragements: Array.isArray(candidate.encouragements) ? candidate.encouragements : [],
      raceEnabled: candidate.raceEnabled === true,
    },
    now,
  );
}

export function createLocalBuddySource(now: Date = new Date()): BuddyDataSource {
  const serverState = createSeedState(now);
  let state: BuddyStoreStateShape = serverState;
  const listeners = new Set<() => void>();
  let hydrated = false;

  function persist() {
    if (!isBrowser()) return;
    try {
      window.localStorage.setItem(BUDDY_STORAGE_KEY, JSON.stringify(state));
    } catch (error) {
      // Private mode or a full quota. The dashboard still works for this session.
      console.warn("streak-buddies: could not persist local state", error);
    }
  }

  function hydrate() {
    if (hydrated || !isBrowser()) return;
    hydrated = true;
    const raw = window.localStorage.getItem(BUDDY_STORAGE_KEY);
    if (!raw) {
      persist();
      return;
    }
    const restored = parseStoredState(raw);
    if (restored) state = restored;
    else persist();
  }

  return {
    kind: "local",
    getState() {
      hydrate();
      return state;
    },
    getServerState() {
      return serverState;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    update(mutator) {
      hydrate();
      const next = mutator(state);
      if (next === state) return;
      state = next;
      persist();
      listeners.forEach((l) => l());
    },
    reset() {
      state = createSeedState();
      persist();
      listeners.forEach((l) => l());
    },
  };
}

// ---------------------------------------------------------------------------- mutation API

export function setMemberPetPal(
  state: BuddyStoreStateShape,
  memberId: string,
  petPalId: PetPalId,
): BuddyStoreStateShape {
  const profile = state.profiles[memberId];
  if (!profile || !isPetPalId(petPalId)) return state;
  if (profile.petPalId === petPalId) return state;
  return {
    ...state,
    profiles: { ...state.profiles, [memberId]: { ...profile, petPalId } },
  };
}

/** Prototype control: moves the mocked buddy's intake and records the crossing time. */
export function setMockBuddyToday(
  state: BuddyStoreStateShape,
  totalMl: number,
  at: string = new Date().toISOString(),
): BuddyStoreStateShape {
  const amount = Number.isFinite(totalMl) ? Math.max(0, Math.round(totalMl)) : 0;
  const goalMl = state.profiles[BUDDY_MEMBER_ID]?.hydrationGoalMl ?? MOCK_BUDDY_GOAL_ML;
  const completedAt = amount >= goalMl ? (state.mockBuddy.completedAt ?? at) : null;
  return { ...state, mockBuddy: { ...state.mockBuddy, todayMl: amount, completedAt } };
}

export function setMockBuddyGoal(
  state: BuddyStoreStateShape,
  goalMl: number,
): BuddyStoreStateShape {
  const goal = Number.isFinite(goalMl)
    ? Math.max(500, Math.min(5000, Math.round(goalMl)))
    : MOCK_BUDDY_GOAL_ML;
  const profile = state.profiles[BUDDY_MEMBER_ID];
  if (!profile) return state;
  return {
    ...state,
    profiles: { ...state.profiles, [BUDDY_MEMBER_ID]: { ...profile, hydrationGoalMl: goal } },
    mockBuddy: { ...state.mockBuddy, history: buildMockBuddyHistory(todayDateString(), goal) },
  };
}

export function setRaceEnabled(
  state: BuddyStoreStateShape,
  enabled: boolean,
): BuddyStoreStateShape {
  if (state.raceEnabled === enabled) return state;
  return { ...state, raceEnabled: enabled };
}

export function addEncouragement(
  state: BuddyStoreStateShape,
  encouragement: Omit<Encouragement, "id">,
): BuddyStoreStateShape {
  const record: Encouragement = { ...encouragement, id: `enc-${encouragement.date}-${Date.now()}` };
  return { ...state, encouragements: [...state.encouragements, record] };
}

export function encouragementsOn(
  state: BuddyStoreStateShape,
  fromMemberId: string,
  toMemberId: string,
  date: string,
): Encouragement[] {
  return state.encouragements.filter(
    (e) => e.fromMemberId === fromMemberId && e.toMemberId === toMemberId && e.date === date,
  );
}

export const ENCOURAGEMENT_LINES = [
  "Pip says: drink something. Not because I care. Because the streak does.",
  "A nudge from your buddy. Hydration is a group project now.",
  "Buddy here. Your water bottle is looking at you with quiet disappointment.",
  "Splash. That was your buddy, throwing encouragement at your head.",
] as const;

/** Deterministic pick so the same day always shows the same line. */
export function pickEncouragementLine(seed: string): string {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash * 31 + seed.charCodeAt(i)) % 100000;
  return ENCOURAGEMENT_LINES[hash % ENCOURAGEMENT_LINES.length];
}

export { MAX_DAY_WALK };
