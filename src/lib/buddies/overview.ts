/**
 * Streak Buddies — server overview mapping.
 *
 * The live RPC public.my_buddy_overview() returns one JSON document for the whole page.
 * This module is the only place that knows the shape of that document, and it maps it into
 * the same BuddyStoreStateShape the local prototype store produces, so the dashboard, the
 * streak maths and the UI all stay unchanged between demo mode and live mode.
 *
 * Field names mirror supabase/migrations/0006_streak_buddies_live.sql.
 */

import { isPetPalId } from "./pet-pals";
import type { BuddyDayRecord, BuddyStoreStateShape, Encouragement, PetPalId } from "./types";
import { BUDDY_MEMBER_ID, SELF_MEMBER_ID } from "./store";

export type ServerMember = {
  id: string;
  name: string;
  goalMl: number;
  petPalId: string | null;
};

export type ServerProgressRow = {
  userId: string;
  /** YYYY-MM-DD */
  day: string;
  totalMl: number;
  goalMl: number;
  percentage: number;
  completed: boolean;
  completedAt: string | null;
};

export type ServerOverview = {
  relationship: { id: string; status: string; createdAt: string } | null;
  self: ServerMember;
  buddy?: ServerMember | null;
  challenge?: { id: string; type: string; startDate: string } | null;
  progress?: ServerProgressRow[] | null;
  streak: { current: number; longest: number; lastSharedDate: string | null };
  todaySelfMl?: number | null;
  todayBuddyMl?: number | null;
  encouragements: {
    sentByMe: boolean;
    sentByBuddy: boolean;
    myMessage: string | null;
    buddyMessage: string | null;
  };
  invite: { code: string; expiresAt: string } | null;
};

/** The server speaks plain strings; the UI only accepts a known Pet Pal id. */
export function asPetPalId(value: string | null | undefined): PetPalId | null {
  if (!value) return null;
  return isPetPalId(value) ? value : null;
}

export function isLinked(overview: ServerOverview | null | undefined): boolean {
  return Boolean(overview?.relationship && overview.buddy);
}

/**
 * Builds the store shape the dashboard already understands from a live overview.
 * Returns null when the two accounts are not linked yet: the caller then keeps the
 * local demo buddy rather than showing an empty page.
 */
export function mapOverviewToStoreState(
  overview: ServerOverview,
  now: Date = new Date(),
): BuddyStoreStateShape | null {
  if (!isLinked(overview) || !overview.buddy) return null;

  const buddyId = overview.buddy.id;
  const rows = overview.progress ?? [];
  const buddyRows = rows.filter((row) => row.userId === buddyId);
  const todayKey = todayDateFrom(now);

  // The dashboard appends today itself from mockBuddy.todayMl, so history carries the
  // earlier days only.
  const todayBuddyRow = buddyRows.find((row) => row.day === todayKey);
  const buddyHistory: BuddyDayRecord[] = buddyRows
    .filter((row) => row.day !== todayKey)
    .map((row) => ({
      date: row.day,
      memberId: BUDDY_MEMBER_ID,
      totalMl: row.totalMl,
      goalMl: row.goalMl,
      completedAt: row.completedAt,
    }));

  return {
    version: 1,
    seededAt: overview.relationship?.createdAt ?? now.toISOString(),
    relationship: {
      id: overview.relationship!.id,
      memberAId: SELF_MEMBER_ID,
      memberBId: BUDDY_MEMBER_ID,
      status: "active",
      createdAt: overview.relationship!.createdAt,
    },
    profiles: {
      [SELF_MEMBER_ID]: {
        memberId: SELF_MEMBER_ID,
        name: overview.self.name,
        petPalId: asPetPalId(overview.self.petPalId),
        hydrationGoalMl: overview.self.goalMl,
      },
      [BUDDY_MEMBER_ID]: {
        memberId: BUDDY_MEMBER_ID,
        name: overview.buddy.name,
        petPalId: asPetPalId(overview.buddy.petPalId),
        hydrationGoalMl: overview.buddy.goalMl,
      },
    },
    mockBuddy: {
      memberId: BUDDY_MEMBER_ID,
      todayMl: todayBuddyRow?.totalMl ?? overview.todayBuddyMl ?? 0,
      completedAt: todayBuddyRow?.completedAt ?? null,
      history: buddyHistory,
    },
    raceEnabled: overview.challenge?.type === "goal_race",
    encouragements: todayEncouragements(overview, todayKey),
  };
}

function todayDateFrom(now: Date): string {
  const month = `${now.getMonth() + 1}`.padStart(2, "0");
  const day = `${now.getDate()}`.padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

/** At most two entries exist: one nudge in each direction, one per day. */
export function todayEncouragements(overview: ServerOverview, day: string): Encouragement[] {
  const entries: Encouragement[] = [];
  const at = new Date().toISOString();
  if (overview.encouragements?.sentByMe) {
    entries.push({
      id: `enc-${day}-self`,
      fromMemberId: SELF_MEMBER_ID,
      toMemberId: BUDDY_MEMBER_ID,
      date: day,
      at,
      message: overview.encouragements.myMessage ?? "",
    });
  }
  if (overview.encouragements?.sentByBuddy) {
    entries.push({
      id: `enc-${day}-buddy`,
      fromMemberId: BUDDY_MEMBER_ID,
      toMemberId: SELF_MEMBER_ID,
      date: day,
      at,
      message: overview.encouragements.buddyMessage ?? "",
    });
  }
  return entries;
}
