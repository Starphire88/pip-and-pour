export const hydrationKeys = {
  all: ["hydration"] as const,
  todayTotal: (userId: string) => [...hydrationKeys.all, userId, "todayTotal"] as const,
  latestLogToday: (userId: string) => [...hydrationKeys.all, userId, "latestLogToday"] as const,
  settings: (userId: string) => [...hydrationKeys.all, userId, "settings"] as const,
  streak: (userId: string) => [...hydrationKeys.all, userId, "streak"] as const,
};
