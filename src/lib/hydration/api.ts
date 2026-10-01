import { supabase } from "@/lib/supabase";

/** A single drink, in whole millilitres. Matches the range the UI offers. */
const MIN_LOG_ML = 1;
const MAX_LOG_ML = 5000;

/** Daily goal bounds. Mirrors the check constraint in supabase/migrations/0001_init.sql. */
const MIN_GOAL_ML = 500;
const MAX_GOAL_ML = 5000;

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

export type HydrationLog = {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
};

export function isValidLogAmount(amountMl: number): boolean {
  return Number.isInteger(amountMl) && amountMl >= MIN_LOG_ML && amountMl <= MAX_LOG_ML;
}

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
  const { data, error } = await supabase
    .from("streaks")
    .select("*")
    .eq("user_id", userId)
    .maybeSingle();

  if (error) throw error;
  return data;
}

export async function insertHydrationLog(userId: string, amountMl: number) {
  // The live database has no check constraint on amount_ml (see migration 0002),
  // so this guard is the only thing stopping a negative or absurd row being written.
  if (!isValidLogAmount(amountMl)) {
    throw new Error(
      `A drink has to be a whole number of millilitres between ${MIN_LOG_ML} and ${MAX_LOG_ML}.`,
    );
  }

  const { error } = await supabase.from("hydration_logs").insert({
    user_id: userId,
    amount_ml: amountMl,
    logged_at: new Date().toISOString(),
  });

  if (error) throw error;
}

export async function getHydrationHistory(userId: string): Promise<HydrationLog[]> {
  const { data, error } = await supabase
    .from("hydration_logs")
    .select("*")
    .eq("user_id", userId)
    .order("logged_at", { ascending: false });

  if (error) throw error;
  return data ?? [];
}

export async function deleteHydrationLog(logId: string) {
  const { error } = await supabase.from("hydration_logs").delete().eq("id", logId);

  if (error) throw error;
}

export async function upsertDailyGoal(userId: string, dailyGoalMl: number): Promise<UserSettings> {
  if (!Number.isFinite(dailyGoalMl)) {
    throw new Error("Your daily goal has to be a number.");
  }

  const goal = Math.max(MIN_GOAL_ML, Math.min(MAX_GOAL_ML, Math.round(dailyGoalMl)));

  const { data, error } = await supabase
    .from("user_settings")
    .upsert(
      { user_id: userId, daily_goal_ml: goal, updated_at: new Date().toISOString() },
      { onConflict: "user_id" },
    )
    .select()
    .single();

  if (error) throw error;
  return data;
}

/**
 * Streak sync is a read-modify-write with no database transaction behind it, so two
 * calls that overlap (a double-tap on "Log a Drink", two tabs, phone and laptop) can
 * both read the same streak and both write the same increment, losing one, or both
 * decide "today has not counted yet" and add two days. Running every sync through a
 * single promise chain makes each one see the previous one's write.
 *
 * This serialises within one tab. It cannot serialise across devices; the durable fix
 * is an atomic Postgres function (see supabase/migrations/0002_schema_reconciliation.sql).
 */
let streakSyncQueue: Promise<void> = Promise.resolve();

export function syncStreakWithTodayTotal(
  userId: string,
  todayTotal: number,
  dailyGoalMl: number,
): Promise<void> {
  const run = streakSyncQueue.then(
    () => syncStreakWithTodayTotalNow(userId, todayTotal, dailyGoalMl),
    () => syncStreakWithTodayTotalNow(userId, todayTotal, dailyGoalMl),
  );
  streakSyncQueue = run.catch(() => undefined);
  return run;
}

async function syncStreakWithTodayTotalNow(
  userId: string,
  todayTotal: number,
  dailyGoalMl: number,
) {
  const today = todayDateString();
  const yesterday = yesterdayDateString();
  const now = new Date().toISOString();
  const goalMet = todayTotal >= dailyGoalMl;

  const { data: streak, error: fetchError } = await supabase
    .from("streaks")
    .select("current_streak, longest_streak, last_logged_date")
    .eq("user_id", userId)
    .maybeSingle();

  if (fetchError) throw fetchError;

  const currentStreak = streak?.current_streak ?? 0;
  const longestStreak = streak?.longest_streak ?? 0;
  const lastLoggedDate = streak?.last_logged_date ?? null;
  const todayCounted = lastLoggedDate === today;

  let nextCurrentStreak = currentStreak;
  let nextLastLoggedDate = lastLoggedDate;

  if (goalMet) {
    if (!todayCounted) {
      nextCurrentStreak = lastLoggedDate === yesterday ? currentStreak + 1 : 1;
      nextLastLoggedDate = today;
    }
  } else if (todayCounted) {
    nextCurrentStreak = Math.max(0, currentStreak - 1);
    nextLastLoggedDate = nextCurrentStreak > 0 ? yesterday : null;
  }

  if (nextCurrentStreak === currentStreak && nextLastLoggedDate === lastLoggedDate) return;

  const nextLongestStreak = nextCurrentStreak > longestStreak ? nextCurrentStreak : longestStreak;

  const { error } = await supabase.from("streaks").upsert(
    {
      user_id: userId,
      current_streak: nextCurrentStreak,
      longest_streak: nextLongestStreak,
      last_logged_date: nextLastLoggedDate,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) throw error;
}
export async function getPipLine(
  percentMet: number,
  streakDays: number,
  mood: string,
): Promise<string> {
  const { data, error } = await supabase.functions.invoke("pip-chat", {
    body: { percentMet, streakDays, mood },
  });

  if (error) throw error;

  // The edge function can return a 200 with an unexpected body; without this guard
  // the caller writes `undefined` into Pip's speech bubble.
  const pipLine = (data as { pipLine?: unknown } | null)?.pipLine;
  if (typeof pipLine !== "string" || pipLine.trim() === "") {
    throw new Error("pip-chat returned no line");
  }

  return pipLine;
}
