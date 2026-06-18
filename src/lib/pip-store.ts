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
