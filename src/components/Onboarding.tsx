import { useState } from "react";
import { PipImage } from "./PipImage";
import { Minus, Plus } from "lucide-react";

export function Onboarding({
  onDone,
  isSubmitting = false,
}: {
  onDone: (goal: number) => void;
  isSubmitting?: boolean;
}) {
  const [goal, setGoal] = useState(2000);
  return (
    <div className="fixed inset-0 z-40 bg-white flex justify-center overflow-y-auto">
      <div className="w-full max-w-[440px] px-6 pt-10 pb-12 flex flex-col items-center">
        <PipImage mood="neutral" size={180} className="pip-float" />
        <div className="mt-6 w-full rounded-2xl border-2 border-[#1A1A1A] bg-white px-5 py-4">
          <p
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            className="italic text-[15px] leading-relaxed text-[#1A1A1A] text-center"
          >
            "Oh — hello. You found me. I'm Pip. I will be... emotionally invested in your hydration. Pick a daily goal and we begin."
          </p>
        </div>

        <div className="mt-8 w-full">
          <p
            className="text-center text-[12px] uppercase tracking-wider text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Daily Goal
          </p>
          <div className="mt-3 flex items-center justify-center gap-5">
            <button
              onClick={() => setGoal((g) => Math.max(500, g - 250))}
              className="h-12 w-12 rounded-full bg-[#A8D5E2] flex items-center justify-center active:scale-95 transition"
              aria-label="Decrease goal"
            >
              <Minus className="text-[#1A1A1A]" size={20} />
            </button>
            <div className="text-center min-w-[120px]">
              <div
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                className="text-[40px] font-bold text-[#1A1A1A] leading-none"
              >
                {goal}
              </div>
              <div className="text-[12px] text-[#6B6B6B] mt-1" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
                milliliters
              </div>
            </div>
            <button
              onClick={() => setGoal((g) => Math.min(5000, g + 250))}
              className="h-12 w-12 rounded-full bg-[#A8D5E2] flex items-center justify-center active:scale-95 transition"
              aria-label="Increase goal"
            >
              <Plus className="text-[#1A1A1A]" size={20} />
            </button>
          </div>
        </div>

        <button
          onClick={() => onDone(goal)}
          disabled={isSubmitting}
          className="mt-10 w-full h-12 rounded-xl bg-[#1A1A1A] text-white active:scale-[0.99] transition disabled:opacity-60"
          style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
        >
          {isSubmitting ? "Saving…" : "Let's go"}
        </button>
      </div>
    </div>
  );
}
