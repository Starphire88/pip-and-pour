import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { Settings } from "lucide-react";
import { MobileShell } from "@/components/MobileShell";
import { PipImage } from "@/components/PipImage";
import { PipBubble } from "@/components/PipBubble";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { Onboarding } from "@/components/Onboarding";
import { usePip, pipMood, pipLine, formatRelative } from "@/lib/pip-store";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Home" },
      { name: "description", content: "Track your hydration with Pip, a sassy panda who reacts in real time." },
    ],
  }),
  component: Home,
});

function Home() {
  const { state, total, percent, todayLogs, addLog, completeOnboarding } = usePip();
  const [confetti, setConfetti] = useState(false);
  const prev = useRef(percent);

  useEffect(() => {
    if (prev.current < 100 && percent >= 100) {
      setConfetti(true);
      const t = setTimeout(() => setConfetti(false), 50);
      return () => clearTimeout(t);
    }
    prev.current = percent;
  }, [percent]);

  if (!state.onboarded) return <Onboarding onDone={completeOnboarding} />;

  const mood = pipMood(percent, state.streakBroken);
  const line = pipLine(percent, total, state.streakBroken);
  const lastLogged = todayLogs[0]?.at ?? null;

  return (
    <MobileShell>
      <Confetti show={confetti} />
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[22px] font-bold text-[#1A1A1A]">
          Pip 🐼
        </h1>
        <button aria-label="Settings" className="h-9 w-9 rounded-full flex items-center justify-center active:bg-[#F9F9F9]">
          <Settings size={20} className="text-[#1A1A1A]" />
        </button>
      </header>

      <section className="flex flex-col items-center px-5 mt-2">
        <div className="h-[200px] w-[200px] flex items-center justify-center">
          <PipImage mood={mood} size={200} className="pip-float" />
        </div>

        <div className="mt-3 w-full">
          <PipBubble text={line} />
        </div>

        <div className="mt-6">
          <ProgressRing percent={percent} total={total} goal={state.goal} size={200} stroke={12} />
        </div>

        <button
          onClick={() => addLog(250)}
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
          <StatCard label="Streak" value={`${state.streak}d`} />
          <StatCard label="Daily Goal" value={`${state.goal}ml`} />
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
