import { supabase } from "@/lib/supabase";

export type UserSettings = {
  id: string;
  user_id: string;
  daily_goal_ml: number;
  created_at: string;
  updated_at: string;
};

export type Streak = {
  id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_logged_date: string | null;
  updated_at: string;
};

function getTodayBounds() {
  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
  return { start: start.toISOString(), end: end.toISOString() };
}

export function todayDateString() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function yesterdayDateString() {
  const d = new Date();
  d.setDate(d.getDate() - 1);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function isStreakBroken(lastLoggedDate: string | null): boolean {
  if (!lastLoggedDate) return false;
  const today = todayDateString();
  const yesterday = yesterdayDateString();
  return lastLoggedDate !== today && lastLoggedDate !== yesterday;
}

export async function fetchTodayTotal(userId: string): Promise<number> {
  const { start, end } = getTodayBounds();
  const { data, error } = await supabase
    .from("hydration_logs")
    .select("amount_ml")
    .eq("user_id", userId)
    .gte("logged_at", start)
    .lt("logged_at", end);

  if (error) throw error;
  return (data ?? []).reduce((sum, row) => sum + (row.amount_ml ?? 0), 0);
}

export async function fetchLatestLogToday(userId: string): Promise<number | null> {
  const { start, end } = getTodayBounds();
  const { data, error } = await supabase
    .from("hydration_logs")
    .select("logged_at")
    .eq("user_id", userId)
    .gte("logged_at", start)
    .lt("logged_at", end)
    .order("logged_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) throw error;
  return data?.logged_at ? new Date(data.logged_at).getTime() : null;
}

export async function fetchUserSettings(userId: string): Promise<UserSettings | null> {
  const { data, error } = await supabase
    .from("user_settings")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function fetchStreak(userId: string): Promise<Streak | null> {
  const { data, error } = await supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertHydrationLog(userId: string, amountMl: number) {
  const { error } = await supabase.from("hydration_logs").insert({
    user_id: userId,
    amount_ml: amountMl,
    logged_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function upsertDailyGoal(userId: string, dailyGoalMl: number) {
  const goal = Math.max(500, Math.min(5000, dailyGoalMl));
  const now = new Date().toISOString();

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: userId,
      daily_goal_ml: goal,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );

  if (error) throw error;
}

export async function updateStreakIfGoalMet(userId: string, todayTotal: number, dailyGoalMl: number) {
  if (todayTotal < dailyGoalMl) return;

  const today = todayDateString();
  const yesterday = yesterdayDateString();
  const now = new Date().toISOString();

  const { data: streak, error: fetchError } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_logged_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  if (streak?.last_logged_date === today) return;

  const currentStreak =
    streak?.last_logged_date === yesterday ? (streak.current_streak ?? 0) + 1 : 1;
  const longestStreak = Math.max(currentStreak, streak?.longest_streak ?? 0);

  const { error } = await supabase.from("streaks").upsert(
    {
      user_id: userId,
      current_streak: currentStreak,
      longest_streak: longestStreak,
      last_logged_date: today,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
