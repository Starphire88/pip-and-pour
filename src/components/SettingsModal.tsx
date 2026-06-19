import { useEffect, useState } from "react";
import { X } from "lucide-react";
import { useUpsertDailyGoal, useUserSettings } from "@/hooks/useHydration";
import { goalSavedLine, setPipLineOverride } from "@/lib/pip-store";

const MIN_GOAL = 500;
const MAX_GOAL = 5000;

function validateGoal(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return "Enter a daily goal";
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isInteger(n)) return "Enter a whole number";
  if (n < MIN_GOAL || n > MAX_GOAL) return `Goal must be between ${MIN_GOAL} and ${MAX_GOAL} ml`;
  return null;
}

export function SettingsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { data: settings } = useUserSettings();
  const upsertGoal = useUpsertDailyGoal();
  const [value, setValue] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [submitError, setSubmitError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setValue(settings ? String(settings.daily_goal_ml) : "");
    setValidationError(null);
    setSubmitError(null);
  }, [open, settings?.daily_goal_ml]);

  if (!open) return null;

  const handleSave = () => {
    const error = validateGoal(value);
    if (error) {
      setValidationError(error);
      return;
    }

    setValidationError(null);
    setSubmitError(null);

    upsertGoal.mutate(Number(value.trim()), {
      onSuccess: () => {
        setPipLineOverride(goalSavedLine());
        onClose();
      },
      onError: (err) => {
        setSubmitError(err instanceof Error ? err.message : "Could not save. Try again.");
      },
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <button
        type="button"
        aria-label="Close settings"
        className="absolute inset-0 bg-black/40"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="settings-modal-title"
        className="relative w-full max-w-[360px] rounded-2xl border-2 border-[#1A1A1A] bg-white px-6 py-6 shadow-lg"
      >
        <div className="flex items-start justify-between gap-3">
          <h2
            id="settings-modal-title"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            className="text-[20px] font-bold text-[#1A1A1A]"
          >
            Edit Daily Goal
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-8 w-8 rounded-full flex items-center justify-center active:bg-[#F9F9F9]"
          >
            <X size={18} className="text-[#1A1A1A]" />
          </button>
        </div>

        <p className="mt-2 text-[13px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          How much water should Pip expect from you each day?
        </p>

        <div className="mt-5">
          <label
            htmlFor="daily-goal-input"
            className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Daily goal (ml)
          </label>
          <input
            id="daily-goal-input"
            type="number"
            min={MIN_GOAL}
            max={MAX_GOAL}
            step={250}
            value={value}
            onChange={(e) => {
              setValue(e.target.value);
              if (validationError) setValidationError(null);
              if (submitError) setSubmitError(null);
            }}
            className="mt-2 w-full h-12 rounded-xl border-2 border-[#1A1A1A] px-4 text-[18px] font-bold text-[#1A1A1A] outline-none focus:ring-2 focus:ring-[#A8D5E2]"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          />
          {(validationError || submitError) && (
            <p className="mt-2 text-[13px] text-red-600" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {validationError ?? submitError}
            </p>
          )}
        </div>

        <button
          type="button"
          onClick={handleSave}
          disabled={upsertGoal.isPending}
          className="mt-6 w-full h-12 rounded-xl bg-[#1A1A1A] text-white active:scale-[0.99] transition disabled:opacity-60"
          style={{ fontFamily: "Nunito, system-ui, sans-serif", fontWeight: 700 }}
        >
          {upsertGoal.isPending ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
