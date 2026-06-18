import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { LogOut, Settings } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { PipImage } from "@/components/PipImage";
import { PipBubble } from "@/components/PipBubble";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { Onboarding } from "@/components/Onboarding";
import { RequireAuth } from "@/components/RequireAuth";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddHydrationLog,
  useHydrationStats,
  useLatestLogToday,
  useUpsertDailyGoal,
  useUserSettings,
} from "@/hooks/useHydration";
import { pipMood, pipLine, formatRelative } from "@/lib/pip-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Home" },
      { name: "description", content: "Track your hydration with Pip, a sassy panda who reacts in real time." },
    ],
  }),
  component: HomePage,
});

function HomePage() {
  return (
    <RequireAuth>
      <Home />
    </RequireAuth>
  );
}

function Home() {
  const navigate = useNavigate();
  const { signOut } = useAuth();
  const settingsQuery = useUserSettings();
  const { total, goal, percent, streak, streakBroken, isLoading } = useHydrationStats();
  const latestLogQuery = useLatestLogToday();
  const addLog = useAddHydrationLog();
  const upsertGoal = useUpsertDailyGoal();
  const [confetti, setConfetti] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const prev = useRef(percent);

  useEffect(() => {
    if (!settingsOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [settingsOpen]);

  const handleLogout = async () => {
    setSettingsOpen(false);
    await signOut();
    navigate({ to: "/auth/login", replace: true });
  };

  useEffect(() => {
    if (prev.current < 100 && percent >= 100) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 50);
      return () => clearTimeout(t);
    }
    prev.current = percent;
  }, [percent]);

  if (settingsQuery.isLoading) {
    return (
      <MobileShell>
        <div className="flex items-center justify-center min-h-[50vh] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Loading…
        </div>
      </MobileShell>
    );
  }

  if (!settingsQuery.data) {
    return (
      <Onboarding
        onDone={(dailyGoal) => upsertGoal.mutate(dailyGoal)}
        isSubmitting={upsertGoal.isPending}
      />
    );
  }

  const mood = pipMood(percent, streakBroken);
  const line = pipLine(percent, total, streakBroken);
  const lastLogged = latestLogQuery.data ?? null;

  return (
    <MobileShell>
      <Confetti show={confetti} />
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[22px] font-bold text-[#1A1A1A]">
          Pip 🐼
        </h1>
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={settingsOpen}
            onClick={() => setSettingsOpen((open) => !open)}
            className="h-9 w-9 rounded-full flex items-center justify-center active:bg-[#F9F9F9]"
          >
            <Settings size={20} className="text-[#1A1A1A]" />
          </button>
          {settingsOpen && (
            <div className="absolute right-0 top-11 z-20 min-w-[160px] rounded-xl border border-[#E8E8E8] bg-white py-1 shadow-sm">
              <button
                type="button"
                onClick={handleLogout}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#1A1A1A] active:bg-[#F9F9F9]"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                <LogOut size={16} />
                Log out
              </button>
            </div>
          )}
        </div>
      </header>

      <section className="flex flex-col items-center px-5 mt-2">
        <div className="h-[200px] w-[200px] flex items-center justify-center">
          <PipImage mood={mood} size={200} className="pip-float" />
        </div>

        <div className="mt-3 w-full">
          <PipBubble text={line} />
        </div>

        <div className="mt-6">
          <ProgressRing percent={percent} total={total} goal={goal} size={200} stroke={12} />
        </div>

        <button
          onClick={() => addLog.mutate(250)}
          disabled={addLog.isPending || isLoading}
          className="mt-6 w-full h-12 rounded-xl bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99] transition"
          style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
        >
          Log a Drink
        </button>

        <div className="mt-3 text-center">
          <Link to="/log" className="text-[12px] text-[#6B6B6B] underline" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            Choose a custom amount
          </Link>
        </div>

        <div className="mt-6 grid grid-cols-3 gap-3 w-full">
          <StatCard label="Streak" value={`${streak}d`} />
          <StatCard label="Daily Goal" value={`${goal}ml`} />
          <StatCard label="Last Logged" value={formatRelative(lastLogged)} />
        </div>
      </section>
    </MobileShell>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F9F9F9] border border-[#E8E8E8] px-3 py-3 text-center">
      <div className="text-[11px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
        {label}
      </div>
      <div className="mt-1 text-[16px] font-bold text-[#1A1A1A] truncate" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
        {value}
      </div>
    </div>
  );
}
