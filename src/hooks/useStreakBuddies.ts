/**
 * Streak Buddies — view model.
 *
 * Combines the REAL hydration system that already exists (Supabase hydration_logs,
 * user_settings and the streaks table, via the existing useHydration hooks) with the buddy
 * graph.
 *
 * Two modes:
 *   demo (default) : one real member plus the documented local prototype buddy, used until
 *                    two accounts are paired.
 *   live           : two real Supabase accounts paired through public.buddy_relationships.
 *                    Both members' numbers are real; nothing is simulated.
 *
 * The signed-in member's numbers are never invented: today's total, the goal, the individual
 * streak and the XP all come from real rows. In live mode the buddy's numbers do too.
 */

import { useCallback, useEffect, useMemo, useRef, useState, useSyncExternalStore } from "react";
import { useHydrationHistory, useHydrationStats } from "@/hooks/useHydration";
import {
  useBuddyLink,
  useBuddyProgressSync,
  mapLinkError,
  prettifyName,
} from "@/hooks/useBuddyLink";
import { isLinked } from "@/lib/buddies/overview";
import { getLiveBuddySource } from "@/lib/buddies/live-source";
import {
  addEncouragement,
  BUDDY_MEMBER_ID,
  createLocalBuddySource,
  encouragementsOn,
  pickEncouragementLine,
  SELF_MEMBER_ID,
  setMemberPetPal,
  setMockBuddyToday,
  setRaceEnabled,
} from "@/lib/buddies/store";
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
  streakRescue,
  teamProgress,
  todayDateString,
  xpFromProgress,
} from "@/lib/buddies/progress";
import type {
  BuddyDayRecord,
  BuddyDashboard,
  BuddyStoreStateShape,
  PetPalId,
} from "@/lib/buddies/types";

/**
 * Two sources per session, mirroring how pip-store.ts holds its own singleton:
 *   demoSource : the local prototype buddy (localStorage), used until two accounts are linked
 *   liveSource : the real buddy, hydrated from public.my_buddy_overview()
 */
const demoSource = createLocalBuddySource();
const liveSource = getLiveBuddySource();

export function useBuddyStoreState(useLive: boolean): BuddyStoreStateShape {
  const source = useLive ? liveSource : demoSource;
  return useSyncExternalStore(
    useCallback((listener) => source.subscribe(listener), [source]),
    useCallback(() => source.getState(), [source]),
    useCallback(() => source.getServerState(), [source]),
  );
}

export type StreakBuddiesLinkViewModel = {
  /** True once two real accounts are paired and the buddy's numbers come from Supabase. */
  live: boolean;
  /** True while the first overview request is in flight. */
  loading: boolean;
  /** True when the page can offer either a join code form or a waiting-for-Don state. */
  error: string | null;
  /** The open invite code this account is offering, if any. */
  invite: { code: string; expiresAt: string } | null;
  /** Prefill for the "your name" field, taken from what the server already knows. */
  suggestedName: string;
  relationshipId: string | null;
  inviteError: string | null;
  acceptError: string | null;
  leaveError: string | null;
  pending: { invite: boolean; accept: boolean; leave: boolean };
  createInvite: (displayName?: string) => void;
  acceptInvite: (code: string, displayName?: string) => void;
  leave: () => void;
};

export type StreakBuddiesViewModel = {
  /** False during SSR and the first client render, so the server and client markup agree. */
  ready: boolean;
  dashboard: BuddyDashboard | null;
  buddyPetPalChosen: boolean;
  /** Pairing state and the actions that change it. Demo mode never talks to the server. */
  link: StreakBuddiesLinkViewModel;
  actions: {
    chooseBuddyPetPal: (petPalId: PetPalId) => void;
    chooseOwnPetPal: (petPalId: PetPalId) => void;
    setBuddyTodayMl: (totalMl: number) => void;
    toggleRace: (enabled: boolean) => void;
    encourageBuddy: () => void;
    resetPrototype: () => void;
  };
};

export function useStreakBuddies(): StreakBuddiesViewModel {
  const { total, goal, percent, streak, streakBroken } = useHydrationStats();
  const historyQuery = useHydrationHistory();
  const link = useBuddyLink(true);

  // The live mirror only takes over once the server has answered with a real pairing, so
  // the demo numbers are never relabelled as real data mid-flight.
  const [live, setLive] = useState(false);
  useEffect(() => {
    if (!link.overview) {
      setLive(false);
      return;
    }
    setLive(liveSource.hydrate(link.overview));
  }, [link.overview]);

  const state = useBuddyStoreState(live);

  const relationshipId = link.overview?.relationship?.id ?? null;
  useBuddyProgressSync({
    enabled: live,
    relationshipId,
    onSync: (needsBackfill) => {
      if (needsBackfill) link.backfill.mutate();
      link.pushProgress.mutate();
    },
  });

  // The dashboard reads window.localStorage and Date.now(), neither of which exists during
  // SSR. Rendering only after mount keeps the hydration markup identical.
  const mountedRef = useRef(false);
  useEffect(() => {
    mountedRef.current = true;
  }, []);
  const ready = mountedRef.current;

  const now = new Date();
  const today = todayDateString(now);

  const dashboard = useMemo<BuddyDashboard | null>(() => {
    if (!ready) return null;

    const selfProfile = state.profiles[SELF_MEMBER_ID];
    const buddyProfile = state.profiles[BUDDY_MEMBER_ID];
    if (!selfProfile || !buddyProfile) return null;

    // ---------------------------------------------------------------- self (real rows)
    const logs = historyQuery.data ?? [];
    const selfGoal = goal;
    const selfRecords = dayRecordsFromLogs(logs, selfGoal, SELF_MEMBER_ID);
    const selfTodayRecord: BuddyDayRecord = {
      date: today,
      memberId: SELF_MEMBER_ID,
      totalMl: total,
      goalMl: selfGoal,
      completedAt: selfRecords.find((r) => r.date === today)?.completedAt ?? null,
    };
    const selfCompletedDays = selfRecords.filter((r) =>
      hasCompletedGoal(r.totalMl, r.goalMl),
    ).length;
    const selfXpInfo = levelForXp(
      xpFromProgress({ completedDays: selfCompletedDays, loggedDrinks: logs.length }),
    );
    const selfPercent = percent;

    // ------------------------------------------------------------- buddy (mocked local)
    const buddyGoal = buddyProfile.hydrationGoalMl;
    const buddyRecords: BuddyDayRecord[] = [
      ...state.mockBuddy.history,
      {
        date: today,
        memberId: BUDDY_MEMBER_ID,
        totalMl: state.mockBuddy.todayMl,
        goalMl: buddyGoal,
        completedAt: state.mockBuddy.completedAt,
      },
    ];
    const buddyCompletedDays = buddyRecords.filter((r) =>
      hasCompletedGoal(r.totalMl, r.goalMl),
    ).length;
    const buddyXpInfo = levelForXp(
      // Day-granular mock: completed days only, no drink-level rows exist for him.
      xpFromProgress({ completedDays: buddyCompletedDays, loggedDrinks: 0 }),
    );
    const buddyPercent = percentComplete(state.mockBuddy.todayMl, buddyGoal);
    const buddyCompletedToday = hasCompletedGoal(state.mockBuddy.todayMl, buddyGoal);

    // ------------------------------------------------------------------- shared metrics
    const allRecords = [...selfRecords, selfTodayRecord, ...buddyRecords];
    const todayComplete = hasCompletedGoal(total, selfGoal) && buddyCompletedToday;
    const currentBuddyStreak = buddyStreakFromRecords(
      allRecords,
      SELF_MEMBER_ID,
      BUDDY_MEMBER_ID,
      today,
    );
    const longest = longestBuddyStreak(allRecords, SELF_MEMBER_ID, BUDDY_MEMBER_ID);

    const race = goalRaceOutcome({
      enabled: state.raceEnabled,
      memberA: {
        id: SELF_MEMBER_ID,
        name: selfProfile.name,
        percent: selfPercent,
        completedAt: selfTodayRecord.completedAt,
      },
      memberB: {
        id: BUDDY_MEMBER_ID,
        name: buddyProfile.name,
        percent: buddyPercent,
        completedAt: state.mockBuddy.completedAt,
      },
    });

    const encouragedToday =
      encouragementsOn(state, SELF_MEMBER_ID, BUDDY_MEMBER_ID, today).length > 0;
    const rescue = streakRescue({
      buddyName: buddyProfile.name,
      buddyPercent,
      buddyCompleted: buddyCompletedToday,
      alreadyEncouraged: encouragedToday,
    });

    return {
      relationship: state.relationship,
      self: {
        id: selfProfile.memberId,
        name: selfProfile.name,
        hydrationGoalMl: selfGoal,
        petPalId: selfProfile.petPalId,
        provenance: "real",
        totalMl: total,
        percent: selfPercent,
        completedToday: hasCompletedGoal(total, selfGoal),
        // The canonical individual streak is the one the existing Supabase sync maintains.
        individualStreak: streakBroken ? 0 : streak,
        xp: selfXpInfo.xp,
        level: selfXpInfo.level,
        levelPercent: selfXpInfo.percentToNextLevel,
        petPalStatus: petPalStatus({
          selfPercent,
          buddyPercent,
          relationshipComplete: todayComplete,
        }),
      },
      buddy: {
        id: buddyProfile.memberId,
        name: buddyProfile.name,
        hydrationGoalMl: buddyGoal,
        petPalId: buddyProfile.petPalId,
        // Live mode reads his own rows from the shared challenge, demo mode reads the seed.
        provenance: live ? "real" : "mock",
        totalMl: state.mockBuddy.todayMl,
        percent: buddyPercent,
        completedToday: buddyCompletedToday,
        individualStreak: individualStreakFromRecords(buddyRecords, BUDDY_MEMBER_ID, today),
        xp: buddyXpInfo.xp,
        level: buddyXpInfo.level,
        levelPercent: buddyXpInfo.percentToNextLevel,
        petPalStatus: petPalStatus({
          selfPercent: buddyPercent,
          buddyPercent: selfPercent,
          relationshipComplete: todayComplete,
        }),
      },
      teamProgress: teamProgress(selfPercent, buddyPercent),
      todayCount: (hasCompletedGoal(total, selfGoal) ? 1 : 0) + (buddyCompletedToday ? 1 : 0),
      buddyStreak: {
        relationshipId: state.relationship.id,
        currentStreak: currentBuddyStreak,
        longestStreak: Math.max(longest, currentBuddyStreak),
        lastCompletedDate: todayComplete ? today : null,
      },
      race,
      rescue,
      challenge: {
        id: `chal-${state.relationship.id}-cooperative`,
        relationshipId: state.relationship.id,
        type: state.raceEnabled ? "goal_race" : "cooperative",
        startDate: dateStringOf(state.seededAt),
        endDate: null,
        status: todayComplete ? "complete" : "active",
      },
      provenance: { self: "real", buddy: live ? "real" : "mock" },
    };
  }, [ready, state, total, goal, percent, streak, streakBroken, historyQuery.data, today, live]);

  // Deliberately a no-op on a live pairing: a buddy picks his own Pet Pal from his own
  // account, only the local demo lets you drive his side.
  const chooseBuddyPetPal = useCallback(
    (petPalId: PetPalId) => {
      if (live) return;
      demoSource.update((current) => setMemberPetPal(current, BUDDY_MEMBER_ID, petPalId));
    },
    [live],
  );

  const chooseOwnPetPal = useCallback(
    (petPalId: PetPalId) => {
      if (live) {
        liveSource.update((current) => setMemberPetPal(current, SELF_MEMBER_ID, petPalId));
        link.choosePetPal.mutate(petPalId);
        return;
      }
      demoSource.update((current) => setMemberPetPal(current, SELF_MEMBER_ID, petPalId));
    },
    [live, link.choosePetPal],
  );

  // Only the local demo exposes a control for the buddy's intake: on a live pairing his
  // numbers can only come from his own account.
  const setBuddyTodayMl = useCallback(
    (totalMl: number) => {
      if (live) return;
      demoSource.update((current) => setMockBuddyToday(current, totalMl));
    },
    [live],
  );

  const toggleRace = useCallback(
    (enabled: boolean) => {
      if (live) {
        liveSource.update((current) => setRaceEnabled(current, enabled));
        link.setRace.mutate(enabled);
        return;
      }
      demoSource.update((current) => setRaceEnabled(current, enabled));
    },
    [live, link.setRace],
  );

  const encourageBuddy = useCallback(() => {
    const date = todayDateString();
    const send = live ? liveSource : demoSource;
    send.update((current) => {
      if (encouragementsOn(current, SELF_MEMBER_ID, BUDDY_MEMBER_ID, date).length > 0)
        return current;
      return addEncouragement(current, {
        fromMemberId: SELF_MEMBER_ID,
        toMemberId: BUDDY_MEMBER_ID,
        date,
        at: new Date().toISOString(),
        message: pickEncouragementLine(date),
      });
    });
    if (live) link.encourage.mutate(pickEncouragementLine(date));
  }, [live, link.encourage]);

  const resetPrototype = useCallback(() => {
    demoSource.reset();
  }, []);

  const linkActions = useMemo(
    () => ({
      live,
      loading: link.isLoading,
      error: link.overviewError,
      invite: link.overview?.invite ?? null,
      suggestedName: prettifyName(link.overview?.self.name),
      relationshipId: link.overview?.relationship?.id ?? null,
      createInvite: (displayName?: string) => link.createInvite.mutate(displayName),
      acceptInvite: (code: string, displayName?: string) =>
        link.acceptInvite.mutate({ code, displayName }),
      leave: () => link.leave.mutate(),
      inviteError: mapLinkError(link.createInvite.error),
      acceptError: mapLinkError(link.acceptInvite.error),
      pending: {
        invite: link.createInvite.isPending,
        accept: link.acceptInvite.isPending,
        leave: link.leave.isPending,
      },
      leaveError: mapLinkError(link.leave.error),
    }),
    [
      live,
      link.isLoading,
      link.overviewError,
      link.overview?.invite,
      link.overview?.self.name,
      link.overview?.relationship?.id,
      link.createInvite,
      link.acceptInvite,
      link.leave,
    ],
  );

  return {
    ready: ready && dashboard !== null,
    dashboard,
    buddyPetPalChosen: dashboard ? dashboard.buddy.petPalId !== null : false,
    link: linkActions,
    actions: {
      chooseBuddyPetPal,
      chooseOwnPetPal,
      setBuddyTodayMl,
      toggleRace,
      encourageBuddy,
      resetPrototype,
    },
  };
}
