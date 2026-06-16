import { useEffect, useState, useCallback } from "react";

export type LogEntry = { id: string; amount: number; at: number };
export type PipState = {
  goal: number;
  onboarded: boolean;
  logs: LogEntry[];
  streak: number;
  lastDayCompleted: string | null;
  streakBroken: boolean;
};

const KEY = "pip:v1";

const defaultState: PipState = {
  goal: 2000,
  onboarded: false,
  logs: [],
  streak: 0,
  lastDayCompleted: null,
  streakBroken: false,
};

function dayKey(ts: number) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function load(): PipState {
  if (typeof window === "undefined") return defaultState;
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaultState;
    return { ...defaultState, ...JSON.parse(raw) };
  } catch {
    return defaultState;
  }
}

function save(s: PipState) {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(s));
  window.dispatchEvent(new CustomEvent("pip:update"));
}

export function usePip() {
  const [state, setState] = useState<PipState>(defaultState);

  useEffect(() => {
    setState(load());
    const onUpdate = () => setState(load());
    window.addEventListener("pip:update", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("pip:update", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, []);

  useEffect(() => {
    if (!state.lastDayCompleted) return;
    const today = dayKey(Date.now());
    const yesterday = dayKey(Date.now() - 86400000);
    if (state.lastDayCompleted !== today && state.lastDayCompleted !== yesterday && !state.streakBroken) {
      save({ ...state, streakBroken: true, streak: 0 });
    }
  }, [state]);

  const today = dayKey(Date.now());
  const todayLogs = state.logs.filter((l) => dayKey(l.at) === today);
  const total = todayLogs.reduce((sum, l) => sum + l.amount, 0);
  const percent = state.goal > 0 ? Math.min(100, Math.round((total / state.goal) * 100)) : 0;

  const addLog = useCallback((amount: number) => {
    const s = load();
    const entry: LogEntry = { id: crypto.randomUUID(), amount, at: Date.now() };
    const logs = [entry, ...s.logs];
    const todayTotal = logs.filter((l) => dayKey(l.at) === dayKey(Date.now())).reduce((a, b) => a + b.amount, 0);
    let streak = s.streak;
    let lastDayCompleted = s.lastDayCompleted;
    let streakBroken = s.streakBroken;
    if (todayTotal >= s.goal && lastDayCompleted !== dayKey(Date.now())) {
      const yest = dayKey(Date.now() - 86400000);
      streak = lastDayCompleted === yest ? streak + 1 : 1;
      lastDayCompleted = dayKey(Date.now());
      streakBroken = false;
    }
    save({ ...s, logs, streak, lastDayCompleted, streakBroken });
  }, []);

  const setGoal = useCallback((goal: number) => {
    const s = load();
    save({ ...s, goal: Math.max(250, Math.min(6000, goal)) });
  }, []);

  const completeOnboarding = useCallback((goal: number) => {
    const s = load();
    save({ ...s, goal, onboarded: true });
  }, []);

  const reset = useCallback(() => save(defaultState), []);

  return { state, total, percent, todayLogs, addLog, setGoal, completeOnboarding, reset };
}

export function pipMood(percent: number, streakBroken: boolean): "sad" | "neutral" | "happy" | "collapsed" {
  if (streakBroken) return "collapsed";
  if (percent >= 75) return "happy";
  if (percent >= 50) return "neutral";
  return "sad";
}

export function pipLine(percent: number, total: number, streakBroken: boolean): string {
  if (streakBroken) return "The streak is gone. It's fine. Pip has known sadness before. Today is a new day.";
  if (total === 0) return "No water logged yet. Pip is... fine. Totally fine.";
  if (percent >= 100) return "FULL HYDRATION ACHIEVED. Pip is glowing. You did this. WE did this.";
  if (percent >= 75) return "So close. Pip is vibrating with anticipation.";
  if (percent >= 50) return "Halfway there. Pip is cautiously optimistic.";
  if (percent >= 25) return "A respectable sip. Pip nods, slowly.";
  return "Hey. You're here. Drink some water.";
}

export function formatRelative(ts: number | null): string {
  if (!ts) return "—";
  const diff = Math.floor((Date.now() - ts) / 60000);
  if (diff < 1) return "just now";
  if (diff < 60) return `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}
