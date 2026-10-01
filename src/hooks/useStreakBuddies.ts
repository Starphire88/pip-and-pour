/**
 * Streak Buddies — view model.
 *
 * Combines the REAL hydration system that already exists (Supabase hydration_logs,
 * user_settings and the streaks table, via the existing useHydration hooks) with the local
 * buddy graph in src/lib/buddies/store.ts.
 *
 * The signed-in member's numbers are never invented: today's total, the goal, the individual
 * streak and the XP all come from real rows. The buddy's numbers are the documented mock.
 */

import { useCallback, useEffect, useMemo, useRef, useSyncExternalStore } from "react";
import { useHydrationHistory, useHydrationStats } from "@/hooks/useHydration";
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

/** One module-level source per session: mirrors how pip-store.ts holds its own singleton. */
const buddySource = createLocalBuddySource();

export function useBuddyStoreState(): BuddyStoreStateShape {
  return useSyncExternalStore(
    (listener) => buddySource.subscribe(listener),
    () => buddySource.getState(),
    () => buddySource.getServerState(),
  );
}

export type StreakBuddiesViewModel = {
  /** False during SSR and the first client render, so the server and client markup agree. */
  ready: boolean;
  dashboard: BuddyDashboard | null;
  buddyPetPalChosen: boolean;
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
  const state = useBuddyStoreState();

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
        provenance: "mock",
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
      provenance: { self: "real", buddy: "mock" },
    };
  }, [ready, state, total, goal, percent, streak, streakBroken, historyQuery.data, today]);

  const chooseBuddyPetPal = useCallback((petPalId: PetPalId) => {
    buddySource.update((current) => setMemberPetPal(current, BUDDY_MEMBER_ID, petPalId));
  }, []);

  const chooseOwnPetPal = useCallback((petPalId: PetPalId) => {
    buddySource.update((current) => setMemberPetPal(current, SELF_MEMBER_ID, petPalId));
  }, []);

  const setBuddyTodayMl = useCallback((totalMl: number) => {
    buddySource.update((current) => setMockBuddyToday(current, totalMl));
  }, []);

  const toggleRace = useCallback((enabled: boolean) => {
    buddySource.update((current) => setRaceEnabled(current, enabled));
  }, []);

  const encourageBuddy = useCallback(() => {
    const date = todayDateString();
    buddySource.update((current) => {
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
  }, []);

  const resetPrototype = useCallback(() => {
    buddySource.reset();
  }, []);

  return {
    ready: ready && dashboard !== null,
    dashboard,
    buddyPetPalChosen: dashboard ? dashboard.buddy.petPalId !== null : false,
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
