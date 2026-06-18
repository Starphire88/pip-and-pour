import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  fetchLatestLogToday,
  fetchStreak,
  fetchTodayTotal,
  fetchUserSettings,
  insertHydrationLog,
  isStreakBroken,
  updateStreakIfGoalMet,
  upsertDailyGoal,
} from "@/lib/hydration/api";
import { hydrationKeys } from "@/lib/hydration/query-keys";

const DEFAULT_GOAL = 2000;

function useUserId() {
  const { user } = useAuth();
  return user?.id ?? null;
}

export function useTodayTotal() {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKeys.todayTotal(userId ?? ""),
    queryFn: () => fetchTodayTotal(userId!),
    enabled: !!userId,
  });
}

export function useLatestLogToday() {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKeys.latestLogToday(userId ?? ""),
    queryFn: () => fetchLatestLogToday(userId!),
    enabled: !!userId,
  });
}

export function useUserSettings() {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKeys.settings(userId ?? ""),
    queryFn: () => fetchUserSettings(userId!),
    enabled: !!userId,
  });
}

export function useStreak() {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKeys.streak(userId ?? ""),
    queryFn: () => fetchStreak(userId!),
    enabled: !!userId,
  });
}

export function useHydrationStats() {
  const totalQuery = useTodayTotal();
  const settingsQuery = useUserSettings();
  const streakQuery = useStreak();

  const total = totalQuery.data ?? 0;
  const goal = settingsQuery.data?.daily_goal_ml ?? DEFAULT_GOAL;
  const percent = goal > 0 ? Math.min(100, Math.round((total / goal) * 100)) : 0;
  const streak = streakQuery.data?.current_streak ?? 0;
  const streakBroken = isStreakBroken(streakQuery.data?.last_logged_date ?? null);
  const onboarded = settingsQuery.data != null;
  const isLoading = totalQuery.isLoading || settingsQuery.isLoading || streakQuery.isLoading;

  return {
    total,
    goal,
    percent,
    streak,
    streakBroken,
    onboarded,
    isLoading,
  };
}

export function useAddHydrationLog() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (amountMl: number) => {
      if (!userId) throw new Error("Not authenticated");
      return insertHydrationLog(userId, amountMl);
    },
    onSuccess: async () => {
      if (!userId) return;

      await queryClient.invalidateQueries({ queryKey: hydrationKeys.todayTotal(userId) });
      await queryClient.invalidateQueries({ queryKey: hydrationKeys.latestLogToday(userId) });

      const todayTotal = await fetchTodayTotal(userId);
      const settings = await fetchUserSettings(userId);
      const goal = settings?.daily_goal_ml ?? DEFAULT_GOAL;

      if (todayTotal >= goal) {
        await updateStreakIfGoalMet(userId, todayTotal, goal);
        await queryClient.invalidateQueries({ queryKey: hydrationKeys.streak(userId) });
      }
    },
  });
}

export function useUpsertDailyGoal() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (dailyGoalMl: number) => {
      if (!userId) throw new Error("Not authenticated");
      return upsertDailyGoal(userId, dailyGoalMl);
    },
    onSuccess: async () => {
      if (!userId) return;
      await queryClient.invalidateQueries({ queryKey: hydrationKeys.settings(userId) });
    },
  });
}
