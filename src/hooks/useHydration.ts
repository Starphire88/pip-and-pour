import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import {
  deleteHydrationLog,
  fetchLatestLogToday,
  fetchStreak,
  fetchTodayTotal,
  fetchUserSettings,
  getHydrationHistory,
  getPipLine,
  insertHydrationLog,
  isStreakBroken,
  syncStreakWithTodayTotal,
  upsertDailyGoal,
} from "@/lib/hydration/api";
import { hydrationKeys } from "@/lib/hydration/query-keys";
const DEFAULT_GOAL = 2000;

async function syncAfterLogChange(userId: string, queryClient: QueryClient) {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: hydrationKeys.todayTotal(userId) }),
    queryClient.invalidateQueries({ queryKey: hydrationKeys.latestLogToday(userId) }),
    queryClient.invalidateQueries({ queryKey: hydrationKeys.history(userId) }),
  ]);

  const todayTotal = await fetchTodayTotal(userId);
  const settings = await fetchUserSettings(userId);
  const goal = settings?.daily_goal_ml ?? DEFAULT_GOAL;

  // The drink is already saved at this point. If the streak bookkeeping fails, the
  // mutation must still count as a success, otherwise the user sees "failed" for a
  // drink that was written and logs it a second time.
  try {
    await syncStreakWithTodayTotal(userId, todayTotal, goal);
  } catch (error) {
    console.error("hydration: streak sync failed", error);
  } finally {
    await queryClient.invalidateQueries({ queryKey: hydrationKeys.streak(userId) });
  }
}

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

export function useHydrationHistory() {
  const userId = useUserId();
  return useQuery({
    queryKey: hydrationKeys.history(userId ?? ""),
    queryFn: () => getHydrationHistory(userId!),
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
      await syncAfterLogChange(userId, queryClient);
    },
  });
}

export function useDeleteHydrationLog() {
  const userId = useUserId();
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (logId: string) => deleteHydrationLog(logId),
    onSuccess: async () => {
      if (!userId) return;
      await syncAfterLogChange(userId, queryClient);
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
    onSuccess: (settings) => {
      if (!userId) return;
      queryClient.setQueryData(hydrationKeys.settings(userId), settings);
    },
  });
}
/** Pip's line only changes meaningfully every few percent, and every request costs money. */
const PIP_LINE_PERCENT_BUCKET = 10;

export function usePipLine(percentMet: number, streakDays: number, mood: string) {
  // Quantising the percentage means a call per 10% band rather than a call per logged
  // drink, and the cached line is reused when the user navigates back to the home screen.
  const bucket = Math.max(
    0,
    Math.floor(percentMet / PIP_LINE_PERCENT_BUCKET) * PIP_LINE_PERCENT_BUCKET,
  );

  return useQuery({
    queryKey: ["pipLine", bucket, streakDays, mood],
    queryFn: () => getPipLine(bucket, streakDays, mood),
    staleTime: 10 * 60 * 1000,
    refetchOnWindowFocus: false,
    // 403 (no Pip account yet) and 401 are terminal; only retry a server-side wobble once.
    retry: (attempt, error) => {
      const status = (error as { context?: { status?: number } } | null)?.context?.status ?? 0;
      if (status >= 400 && status < 500) return false;
      return attempt < 1;
    },
  });
}
