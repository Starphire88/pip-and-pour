/**
 * Streak Buddies — domain model.
 *
 * These types are written so the local store in ./store.ts can be swapped for a Supabase
 * adapter without touching the UI. Field names mirror the columns declared in
 * supabase/migrations/0005_streak_buddies.sql (written, not applied) so a future adapter is
 * a rename-free mapping.
 *
 * Deliberately NOT modelled: friendships, groups, notifications, achievement economies.
 * See docs/streak-buddies.md for the guardrail.
 */

/** Pet Pal is a reusable entity, never a hard-coded UI branch. Add an entry to the registry
 * in ./pet-pals.ts and the pickers, cards and status logic all pick it up. */
export type PetPalId = "panda" | "elephant" | "dolphin";

export type PetPal = {
  id: PetPalId;
  /** Display name, e.g. "Ellie the Elephant". */
  name: string;
  /** Short name used inside sentences, e.g. "Ellie". */
  shortName: string;
  emoji: string;
  /** Spec personality traits, shown on the card. */
  personality: readonly string[];
  /** One dry line of identity copy, in Pip's voice. */
  blurb: string;
  /** Accent from the existing theme tokens in src/styles.css. */
  accent: string;
};

/** How a member's hydration data gets here. `real` = Supabase rows, `mock` = local prototype. */
export type DataProvenance = "real" | "mock";

export type BuddyMember = {
  id: string;
  name: string;
  /** Each member keeps their own goal. Never compare raw volume between members. */
  hydrationGoalMl: number;
  petPalId: PetPalId | null;
  provenance: DataProvenance;
};

/** One member's hydration for one calendar day (YYYY-MM-DD, local time, matching todayDateString). */
export type BuddyDayRecord = {
  date: string;
  memberId: string;
  totalMl: number;
  goalMl: number;
  /** Set when the member first reached their own goal that day. Drives the optional Goal Race. */
  completedAt: string | null;
};

export type BuddyRelationship = {
  id: string;
  /** Two named slots rather than an array: the MVP is strictly two people. */
  memberAId: string;
  memberBId: string;
  status: "active" | "paused";
  createdAt: string;
};

/** Cooperative by default. `race` is the optional competitive layer and is off unless asked for. */
export type BuddyChallengeType = "cooperative" | "goal_race";

export type BuddyChallenge = {
  id: string;
  relationshipId: string;
  type: BuddyChallengeType;
  startDate: string;
  endDate: string | null;
  status: "active" | "complete";
};

/**
 * The shared streak. Increases only on a day where BOTH members met their OWN goal.
 * Independent of either member's individual streak, which the existing /streak screen owns.
 */
export type BuddyStreak = {
  relationshipId: string;
  currentStreak: number;
  longestStreak: number;
  lastCompletedDate: string | null;
};

/** Mock-only for the MVP: no messaging infrastructure is built. */
export type Encouragement = {
  id: string;
  fromMemberId: string;
  toMemberId: string;
  date: string;
  at: string;
  message: string;
};

export type GoalRaceResult = {
  enabled: boolean;
  status: "off" | "in_progress" | "waiting" | "complete";
  /** Set only when both members are done or one is done and the other cannot catch up. */
  winnerId: string | null;
  /** Who is ahead right now, by percentage of their own goal. Informational only. */
  leaderId: string | null;
  /** Pip-voiced one-liner. Never framed as a loss for the other member. */
  summary: string;
};

/** Per-member display state for the Pet Pal cards. */
export type PetPalStatus = "hydrating" | "almost_there" | "goal_complete" | "buddy_complete";

// ----------------------------------------------------------------- persisted store shapes

/** What the store keeps about a member. Names and goals mirror the future Supabase tables. */
export type BuddyMemberProfile = {
  memberId: string;
  name: string;
  petPalId: PetPalId | null;
  hydrationGoalMl: number;
};

/**
 * The mocked buddy. Day-granular only: there are no individual drink rows for him, which is
 * why his XP is computed from completed days alone (see progress.ts, xpFromProgress).
 */
export type MockBuddyState = {
  memberId: string;
  todayMl: number;
  completedAt: string | null;
  history: BuddyDayRecord[];
};

/**
 * The whole persisted blob. `version` is bumped when the shape changes; store.ts discards
 * anything it cannot parse and re-seeds rather than throwing.
 */
export type BuddyStoreStateShape = {
  version: 1;
  seededAt: string;
  relationship: BuddyRelationship;
  profiles: Record<string, BuddyMemberProfile>;
  mockBuddy: MockBuddyState;
  raceEnabled: boolean;
  encouragements: Encouragement[];
};

export type BuddyDashboard = {
  relationship: BuddyRelationship;
  /** The signed-in member (Ashley). */
  self: BuddyMember & {
    totalMl: number;
    percent: number;
    completedToday: boolean;
    individualStreak: number;
    xp: number;
    level: number;
    levelPercent: number;
    petPalStatus: PetPalStatus;
  };
  /** The other member (Don). */
  buddy: BuddyMember & {
    totalMl: number;
    percent: number;
    completedToday: boolean;
    individualStreak: number;
    xp: number;
    level: number;
    levelPercent: number;
    petPalStatus: PetPalStatus;
  };
  /** Mean of both members' percentages of their OWN goals. */
  teamProgress: number;
  todayCount: number;
  buddyStreak: BuddyStreak;
  race: GoalRaceResult;
  rescue: {
    needed: boolean;
    headline: string;
    message: string;
    alreadyEncouragedToday: boolean;
  };
  challenge: BuddyChallenge;
  provenance: { self: DataProvenance; buddy: DataProvenance };
};
