import { createFileRoute } from "@tanstack/react-router";
import { MobileShell } from "@/components/MobileShell";
import { PipImage } from "@/components/PipImage";
import { RequireAuth } from "@/components/RequireAuth";
import { usePip, pipMood } from "@/lib/pip-store";

export const Route = createFileRoute("/streak")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Streak & Evolution" },
      { name: "description", content: "Watch Pip evolve as your hydration streak grows." },
    ],
  }),
  component: StreakRoute,
});

function StreakRoute() {
  return (
    <RequireAuth>
      <StreakPage />
    </RequireAuth>
  );
}

const STAGES = [
  { key: "cub", name: "Baby Cub", minDays: 0, quote: "I'm new here. Be gentle." },
  { key: "teen", name: "Teen Panda", minDays: 3, quote: "Okay, I see you. Keep going." },
  { key: "adult", name: "Adult Panda", minDays: 7, quote: "We are a hydration machine now." },
  { key: "elder", name: "Elder Sage", minDays: 30, quote: "Wise. Hydrated. Untouchable." },
];

function currentStageIndex(days: number) {
  let idx = 0;
  STAGES.forEach((s, i) => {
    if (days >= s.minDays) idx = i;
  });
  return idx;
}

function StreakPage() {
  const { state, percent } = usePip();
  const stageIdx = currentStageIndex(state.streak);
  const stage = STAGES[stageIdx];
  const mood = state.streakBroken ? "collapsed" : pipMood(percent, false);

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <h1 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[22px] font-bold text-[#1A1A1A]">
          Streak & Evolution
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {state.streakBroken ? "The streak was lost. Begin again." : "Pip levels up the longer you stay hydrated."}
        </p>
      </header>

      <section className="px-5 mt-5">
        <div className="rounded-2xl border border-[#E8E8E8] bg-white p-5 flex flex-col items-center">
          <PipImage mood={mood} size={180} className="pip-float" />
          <div className="mt-3 text-center">
            <h2 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[18px] font-bold text-[#1A1A1A]">
              {state.streakBroken ? "Fallen Sage" : stage.name}
            </h2>
            <p className="text-[14px] text-[#6B6B6B] mt-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {state.streak} day streak
            </p>
            <p
              className="mt-3 italic text-[13px] text-[#1A1A1A] max-w-[260px] mx-auto"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              "{state.streakBroken ? "The streak is gone. It's fine. Today is a new day." : stage.quote}"
            </p>
          </div>
        </div>
      </section>

      <section className="px-5 mt-6">
        <p className="text-[12px] uppercase tracking-wider text-[#6B6B6B] mb-3" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Milestones
        </p>
        <div className="relative">
          <div className="absolute left-0 right-0 top-3 h-[2px] bg-[#E8E8E8]" />
          <div className="relative grid grid-cols-4 gap-2">
            {STAGES.map((s, i) => {
              const active = i === stageIdx && !state.streakBroken;
              const reached = i <= stageIdx && !state.streakBroken;
              return (
                <div key={s.key} className="flex flex-col items-center text-center">
                  <div
                    className={`h-7 w-7 rounded-full border-2 ${
                      active
                        ? "bg-[#A8D5E2] border-[#1A1A1A]"
                        : reached
                        ? "bg-[#1A1A1A] border-[#1A1A1A]"
                        : "bg-white border-[#E8E8E8]"
                    }`}
                  />
                  <div
                    className={`mt-2 text-[11px] leading-tight ${active ? "text-[#1A1A1A] font-semibold" : "text-[#9A9A9A]"}`}
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {s.name}
                  </div>
                  <div className="text-[10px] text-[#9A9A9A] mt-0.5" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                    {s.minDays}d
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </MobileShell>
  );
}
