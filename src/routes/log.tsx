import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { MobileShell } from "@/components/MobileShell";
import { PipBubble } from "@/components/PipBubble";
import { usePip, pipLine } from "@/lib/pip-store";

export const Route = createFileRoute("/log")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Log a Drink" },
      { name: "description", content: "Log how much water you drank. Pip will react." },
    ],
  }),
  component: LogPage,
});

const QUICK = [150, 250, 350, 500];

function LogPage() {
  const { state, total, percent, addLog } = usePip();
  const [custom, setCustom] = useState("");
  const [tapped, setTapped] = useState<number | null>(null);

  const handleAdd = (amount: number) => {
    if (!amount || amount <= 0) return;
    setTapped(amount);
    addLog(amount);
    setTimeout(() => setTapped(null), 220);
  };

  return (
    <MobileShell>
      <header className="px-5 pt-5">
        <h1 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[22px] font-bold text-[#1A1A1A]">
          Log a Drink
        </h1>
        <p className="text-[13px] text-[#6B6B6B] mt-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {total} of {state.goal} ml today · {percent}%
        </p>
      </header>

      <section className="px-5 mt-5">
        <PipBubble text={pipLine(percent, total, state.streakBroken)} />
      </section>

      <section className="px-5 mt-6">
        <div className="grid grid-cols-2 gap-3">
          {QUICK.map((amt) => {
            const isActive = tapped === amt;
            return (
              <button
                key={amt}
                onClick={() => handleAdd(amt)}
                className={`h-24 rounded-2xl border-[1.5px] border-[#1A1A1A] transition active:scale-[0.98] ${
                  isActive ? "bg-[#A8D5E2]" : "bg-white"
                }`}
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                <div className="text-[26px] font-bold text-[#1A1A1A] leading-none">{amt}</div>
                <div className="text-[12px] text-[#6B6B6B] mt-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                  milliliters
                </div>
              </button>
            );
          })}
        </div>
      </section>

      <section className="px-5 mt-6">
        <label className="text-[12px] uppercase tracking-wider text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          Custom Amount
        </label>
        <div className="mt-2 flex gap-2">
          <input
            inputMode="numeric"
            pattern="[0-9]*"
            value={custom}
            onChange={(e) => setCustom(e.target.value.replace(/\D/g, ""))}
            placeholder="ml"
            className="flex-1 h-12 rounded-xl border-[1.5px] border-[#1A1A1A] bg-white px-4 text-[16px] outline-none"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          />
          <button
            onClick={() => {
              const n = parseInt(custom, 10);
              if (n > 0) {
                handleAdd(n);
                setCustom("");
              }
            }}
            className="h-12 px-5 rounded-xl bg-[#1A1A1A] text-white"
            style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
          >
            Add
          </button>
        </div>
      </section>
    </MobileShell>
  );
}
