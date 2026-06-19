import { r as __toESM } from "../_runtime.mjs";
import { a as require_jsx_runtime, o as require_react } from "../_libs/@radix-ui/react-collapsible+[...].mjs";
import { n as supabase, r as useAuth } from "./useAuth-72BPIaO7.mjs";
import { _ as useNavigate, g as Link, l as useRouterState } from "../_libs/@tanstack/react-router+[...].mjs";
import { i as useQueryClient, n as useQuery, t as useMutation } from "../_libs/tanstack__react-query.mjs";
import { c as House, l as Flame, u as Droplet } from "../_libs/lucide-react.mjs";
//#region node_modules/.nitro/vite/services/ssr/assets/pip-store-Cxqmce5k.js
var import_react = /* @__PURE__ */ __toESM(require_react());
var import_jsx_runtime = require_jsx_runtime();
function MobileShell({ children }) {
	const path = useRouterState({ select: (s) => s.location.pathname });
	return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen w-full flex justify-center bg-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)("div", {
			className: "relative w-full max-w-[440px] min-h-screen bg-white flex flex-col",
			children: [/* @__PURE__ */ (0, import_jsx_runtime.jsx)("main", {
				className: "flex-1 pb-24",
				children
			}), /* @__PURE__ */ (0, import_jsx_runtime.jsx)("nav", {
				className: "fixed bottom-0 left-1/2 -translate-x-1/2 w-full max-w-[440px] bg-white border-t border-[#E8E8E8]",
				children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("ul", {
					className: "grid grid-cols-3",
					children: [
						{
							to: "/",
							label: "Home",
							icon: House
						},
						{
							to: "/log",
							label: "Log",
							icon: Droplet
						},
						{
							to: "/streak",
							label: "Streak",
							icon: Flame
						}
					].map(({ to, label, icon: Icon }) => {
						const active = to === "/" ? path === "/" : path.startsWith(to);
						return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("li", { children: /* @__PURE__ */ (0, import_jsx_runtime.jsxs)(Link, {
							to,
							className: "flex flex-col items-center justify-center gap-1 py-3 relative",
							children: [
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)(Icon, {
									size: 22,
									className: active ? "text-[#1A1A1A]" : "text-[#9A9A9A]",
									strokeWidth: 2
								}),
								/* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", {
									className: `text-[11px] ${active ? "text-[#1A1A1A]" : "text-[#9A9A9A]"}`,
									style: { fontFamily: "Inter, system-ui, sans-serif" },
									children: label
								}),
								active && /* @__PURE__ */ (0, import_jsx_runtime.jsx)("span", { className: "absolute bottom-1 h-[3px] w-8 rounded-full bg-[#A8D5E2]" })
							]
						}) }, to);
					})
				})
			})]
		})
	});
}
function RequireAuth({ children }) {
	const { user, loading } = useAuth();
	const navigate = useNavigate();
	(0, import_react.useEffect)(() => {
		if (!loading && !user) navigate({
			to: "/auth/login",
			replace: true
		});
	}, [
		user,
		loading,
		navigate
	]);
	if (loading) return /* @__PURE__ */ (0, import_jsx_runtime.jsx)("div", {
		className: "min-h-screen flex items-center justify-center bg-white",
		children: /* @__PURE__ */ (0, import_jsx_runtime.jsx)("p", {
			className: "text-[14px] text-[#6B6B6B]",
			style: { fontFamily: "Inter, system-ui, sans-serif" },
			children: "Loading…"
		})
	});
	if (!user) return null;
	return children;
}
function getTodayBounds() {
	const now = /* @__PURE__ */ new Date();
	const start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
	const end = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
	return {
		start: start.toISOString(),
		end: end.toISOString()
	};
}
function todayDateString() {
	const d = /* @__PURE__ */ new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function yesterdayDateString() {
	const d = /* @__PURE__ */ new Date();
	d.setDate(d.getDate() - 1);
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
function isStreakBroken(lastLoggedDate) {
	if (!lastLoggedDate) return false;
	const today = todayDateString();
	const yesterday = yesterdayDateString();
	return lastLoggedDate !== today && lastLoggedDate !== yesterday;
}
async function fetchTodayTotal(userId) {
	const { start, end } = getTodayBounds();
	const { data, error } = await supabase.from("hydration_logs").select("amount_ml").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end);
	if (error) throw error;
	return (data ?? []).reduce((sum, row) => sum + (row.amount_ml ?? 0), 0);
}
async function fetchLatestLogToday(userId) {
	const { start, end } = getTodayBounds();
	const { data, error } = await supabase.from("hydration_logs").select("logged_at").eq("user_id", userId).gte("logged_at", start).lt("logged_at", end).order("logged_at", { ascending: false }).limit(1).maybeSingle();
	if (error) throw error;
	return data?.logged_at ? new Date(data.logged_at).getTime() : null;
}
async function fetchUserSettings(userId) {
	const { data, error } = await supabase.from("user_settings").select("*").eq("user_id", userId).maybeSingle();
	if (error) throw error;
	return data;
}
async function fetchStreak(userId) {
	const { data, error } = await supabase.from("streaks").select("*").eq("user_id", userId).maybeSingle();
	if (error) throw error;
	return data;
}
async function insertHydrationLog(userId, amountMl) {
	const { error } = await supabase.from("hydration_logs").insert({
		user_id: userId,
		amount_ml: amountMl,
		logged_at: (/* @__PURE__ */ new Date()).toISOString()
	});
	if (error) throw error;
}
async function getHydrationHistory(userId) {
	const { data, error } = await supabase.from("hydration_logs").select("*").eq("user_id", userId).order("logged_at", { ascending: false });
	if (error) throw error;
	return data ?? [];
}
async function deleteHydrationLog(logId) {
	const { error } = await supabase.from("hydration_logs").delete().eq("id", logId);
	if (error) throw error;
}
async function upsertDailyGoal(userId, dailyGoalMl) {
	const goal = Math.max(500, Math.min(5e3, dailyGoalMl));
	const { data, error } = await supabase.from("user_settings").upsert({
		user_id: userId,
		daily_goal_ml: goal,
		updated_at: (/* @__PURE__ */ new Date()).toISOString()
	}, { onConflict: "user_id" }).select().single();
	if (error) throw error;
	return data;
}
async function syncStreakWithTodayTotal(userId, todayTotal, dailyGoalMl) {
	const today = todayDateString();
	const yesterday = yesterdayDateString();
	const now = (/* @__PURE__ */ new Date()).toISOString();
	const goalMet = todayTotal >= dailyGoalMl;
	const { data: streak, error: fetchError } = await supabase.from("streaks").select("current_streak, longest_streak, last_logged_date").eq("user_id", userId).maybeSingle();
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
	const { error } = await supabase.from("streaks").upsert({
		user_id: userId,
		current_streak: nextCurrentStreak,
		longest_streak: nextLongestStreak,
		last_logged_date: nextLastLoggedDate,
		updated_at: now
	}, { onConflict: "user_id" });
	if (error) throw error;
}
async function getPipLine(percentMet, streakDays, mood) {
	const { data, error } = await supabase.functions.invoke("pip-chat", { body: {
		percentMet,
		streakDays,
		mood
	} });
	if (error) throw error;
	return data.pipLine;
}
var hydrationKeys = {
	all: ["hydration"],
	todayTotal: (userId) => [
		...hydrationKeys.all,
		userId,
		"todayTotal"
	],
	latestLogToday: (userId) => [
		...hydrationKeys.all,
		userId,
		"latestLogToday"
	],
	settings: (userId) => [
		...hydrationKeys.all,
		userId,
		"settings"
	],
	streak: (userId) => [
		...hydrationKeys.all,
		userId,
		"streak"
	],
	history: (userId) => [
		...hydrationKeys.all,
		userId,
		"history"
	]
};
var DEFAULT_GOAL = 2e3;
async function syncAfterLogChange(userId, queryClient) {
	await Promise.all([
		queryClient.invalidateQueries({ queryKey: hydrationKeys.todayTotal(userId) }),
		queryClient.invalidateQueries({ queryKey: hydrationKeys.latestLogToday(userId) }),
		queryClient.invalidateQueries({ queryKey: hydrationKeys.history(userId) })
	]);
	await syncStreakWithTodayTotal(userId, await fetchTodayTotal(userId), (await fetchUserSettings(userId))?.daily_goal_ml ?? DEFAULT_GOAL);
	await queryClient.invalidateQueries({ queryKey: hydrationKeys.streak(userId) });
}
function useUserId() {
	const { user } = useAuth();
	return user?.id ?? null;
}
function useTodayTotal() {
	const userId = useUserId();
	return useQuery({
		queryKey: hydrationKeys.todayTotal(userId ?? ""),
		queryFn: () => fetchTodayTotal(userId),
		enabled: !!userId
	});
}
function useLatestLogToday() {
	const userId = useUserId();
	return useQuery({
		queryKey: hydrationKeys.latestLogToday(userId ?? ""),
		queryFn: () => fetchLatestLogToday(userId),
		enabled: !!userId
	});
}
function useUserSettings() {
	const userId = useUserId();
	return useQuery({
		queryKey: hydrationKeys.settings(userId ?? ""),
		queryFn: () => fetchUserSettings(userId),
		enabled: !!userId
	});
}
function useStreak() {
	const userId = useUserId();
	return useQuery({
		queryKey: hydrationKeys.streak(userId ?? ""),
		queryFn: () => fetchStreak(userId),
		enabled: !!userId
	});
}
function useHydrationHistory() {
	const userId = useUserId();
	return useQuery({
		queryKey: hydrationKeys.history(userId ?? ""),
		queryFn: () => getHydrationHistory(userId),
		enabled: !!userId
	});
}
function useHydrationStats() {
	const totalQuery = useTodayTotal();
	const settingsQuery = useUserSettings();
	const streakQuery = useStreak();
	const total = totalQuery.data ?? 0;
	const goal = settingsQuery.data?.daily_goal_ml ?? DEFAULT_GOAL;
	return {
		total,
		goal,
		percent: goal > 0 ? Math.min(100, Math.round(total / goal * 100)) : 0,
		streak: streakQuery.data?.current_streak ?? 0,
		streakBroken: isStreakBroken(streakQuery.data?.last_logged_date ?? null),
		onboarded: settingsQuery.data != null,
		isLoading: totalQuery.isLoading || settingsQuery.isLoading || streakQuery.isLoading
	};
}
function useAddHydrationLog() {
	const userId = useUserId();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (amountMl) => {
			if (!userId) throw new Error("Not authenticated");
			return insertHydrationLog(userId, amountMl);
		},
		onSuccess: async () => {
			if (!userId) return;
			await syncAfterLogChange(userId, queryClient);
		}
	});
}
function useDeleteHydrationLog() {
	const userId = useUserId();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (logId) => deleteHydrationLog(logId),
		onSuccess: async () => {
			if (!userId) return;
			await syncAfterLogChange(userId, queryClient);
		}
	});
}
function useUpsertDailyGoal() {
	const userId = useUserId();
	const queryClient = useQueryClient();
	return useMutation({
		mutationFn: (dailyGoalMl) => {
			if (!userId) throw new Error("Not authenticated");
			return upsertDailyGoal(userId, dailyGoalMl);
		},
		onSuccess: (settings) => {
			if (!userId) return;
			queryClient.setQueryData(hydrationKeys.settings(userId), settings);
		}
	});
}
function usePipLine(percentMet, streakDays, mood) {
	return useQuery({
		queryKey: [
			"pipLine",
			percentMet,
			streakDays,
			mood
		],
		queryFn: () => getPipLine(percentMet, streakDays, mood)
	});
}
function pipMood(percent, streakBroken) {
	if (streakBroken) return "collapsed";
	if (percent >= 75) return "happy";
	if (percent >= 50) return "neutral";
	return "sad";
}
function pipLine(percent, total, streakBroken) {
	if (streakBroken) return "The streak is gone. It's fine. Pip has known sadness before. Today is a new day.";
	if (total === 0) return "No water logged yet. Pip is... fine. Totally fine.";
	if (percent >= 100) return "FULL HYDRATION ACHIEVED. Pip is glowing. You did this. WE did this.";
	if (percent >= 75) return "So close. Pip is vibrating with anticipation.";
	if (percent >= 50) return "Halfway there. Pip is cautiously optimistic.";
	if (percent >= 25) return "A respectable sip. Pip nods, slowly.";
	return "Hey. You're here. Drink some water.";
}
function goalSavedLine() {
	return "Goal updated. Pip has adjusted expectations accordingly. Try not to disappoint us both.";
}
var lineOverride = null;
var lineListeners = /* @__PURE__ */ new Set();
function subscribeLineOverride(cb) {
	lineListeners.add(cb);
	return () => lineListeners.delete(cb);
}
function getLineOverrideSnapshot() {
	return lineOverride;
}
function setPipLineOverride(line) {
	lineOverride = line;
	lineListeners.forEach((l) => l());
}
function clearPipLineOverride() {
	lineOverride = null;
	lineListeners.forEach((l) => l());
}
function usePipLineOverride() {
	return (0, import_react.useSyncExternalStore)(subscribeLineOverride, getLineOverrideSnapshot, getLineOverrideSnapshot);
}
function formatRelative(ts) {
	if (!ts) return "—";
	const diff = Math.floor((Date.now() - ts) / 6e4);
	if (diff < 1) return "just now";
	if (diff < 60) return `${diff}m ago`;
	const h = Math.floor(diff / 60);
	if (h < 24) return `${h}h ago`;
	return `${Math.floor(h / 24)}d ago`;
}
//#endregion
export { useUserSettings as _, goalSavedLine as a, setPipLineOverride as c, useHydrationHistory as d, useHydrationStats as f, useUpsertDailyGoal as g, usePipLineOverride as h, formatRelative as i, useAddHydrationLog as l, usePipLine as m, RequireAuth as n, pipLine as o, useLatestLogToday as p, clearPipLineOverride as r, pipMood as s, MobileShell as t, useDeleteHydrationLog as u };
