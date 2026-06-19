import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { ChevronDown, LogOut, Settings, Target, Trash2 } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { MobileShell } from "@/components/MobileShell";
import { PipImage } from "@/components/PipImage";
import { PipBubble } from "@/components/PipBubble";
import { ProgressRing } from "@/components/ProgressRing";
import { Confetti } from "@/components/Confetti";
import { Onboarding } from "@/components/Onboarding";
import { RequireAuth } from "@/components/RequireAuth";
import { SettingsModal } from "@/components/SettingsModal";
import { useAuth } from "@/hooks/useAuth";
import {
  useAddHydrationLog,
  useDeleteHydrationLog,
  useHydrationHistory,
  useHydrationStats,
  useLatestLogToday,
  usePipLine,
  useUpsertDailyGoal,
  useUserSettings,
} from "@/hooks/useHydration";
import type { HydrationLog } from "@/lib/hydration/api";
import { pipMood, pipLine, formatRelative, clearPipLineOverride, usePipLineOverride } from "@/lib/pip-store";

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
  const [menuOpen, setMenuOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const prev = useRef(percent);
  const lineOverride = usePipLineOverride();
  const mood = pipMood(percent, streakBroken);
  const pipLineQuery = usePipLine(percent, streak, mood);

  useEffect(() => {
    if (!menuOpen) return;
    const onPointerDown = (e: PointerEvent) => {
      if (settingsRef.current && !settingsRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [menuOpen]);

  const handleLogout = async () => {
    setMenuOpen(false);
    await signOut();
    navigate({ to: "/auth/login", replace: true });
  };

  const openGoalModal = () => {
    setMenuOpen(false);
    setGoalModalOpen(true);
  };

  useEffect(() => {
    clearPipLineOverride();
  }, [total, streakBroken]);

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

  const fallbackLine = pipLine(percent, total, streakBroken);
  const line =
    lineOverride ??
    (pipLineQuery.isSuccess && pipLineQuery.data ? pipLineQuery.data : fallbackLine);
  const lastLogged = latestLogQuery.data ?? null;

  return (
    <MobileShell>
      <Confetti show={confetti} />
      <SettingsModal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} />
      <header className="flex items-center justify-between px-5 pt-5">
        <h1 style={{ fontFamily: "Nunito, system-ui, sans-serif" }} className="text-[22px] font-bold text-[#1A1A1A]">
          Pip 🐼
        </h1>
        <div className="relative" ref={settingsRef}>
          <button
            type="button"
            aria-label="Settings"
            aria-expanded={menuOpen}
            onClick={() => setMenuOpen((open) => !open)}
            className="h-9 w-9 rounded-full flex items-center justify-center active:bg-[#F9F9F9]"
          >
            <Settings size={20} className="text-[#1A1A1A]" />
          </button>
          {menuOpen && (
            <div className="absolute right-0 top-11 z-20 min-w-[180px] rounded-xl border border-[#E8E8E8] bg-white py-1 shadow-sm">
              <button
                type="button"
                onClick={openGoalModal}
                className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[14px] text-[#1A1A1A] active:bg-[#F9F9F9]"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                <Target size={16} />
                Edit Daily Goal
              </button>
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

        <HydrationHistorySection />
      </section>
    </MobileShell>
  );
}

function HydrationHistorySection() {
  const historyQuery = useHydrationHistory();
  const deleteLog = useDeleteHydrationLog();
  const [open, setOpen] = useState(false);
  const [confirmId, setConfirmId] = useState<string | null>(null);
  const logs = historyQuery.data ?? [];

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="mt-6 w-full">
      <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] px-4 py-3 active:bg-[#F0F0F0]">
        <span className="text-[14px] font-bold text-[#1A1A1A]" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
          Drink History
        </span>
        <div className="flex items-center gap-2">
          {!historyQuery.isLoading && (
            <span className="text-[12px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
              {logs.length}
            </span>
          )}
          <ChevronDown
            size={18}
            className={`text-[#6B6B6B] transition-transform duration-200 ${open ? "rotate-180" : ""}`}
          />
        </div>
      </CollapsibleTrigger>
      <CollapsibleContent className="mt-2">
        {historyQuery.isLoading ? (
          <p className="px-1 py-2 text-[13px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            Loading…
          </p>
        ) : logs.length === 0 ? (
          <p className="px-1 py-2 text-[13px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
            No drinks logged yet.
          </p>
        ) : (
          <div className="max-h-56 overflow-y-auto rounded-xl border border-[#E8E8E8] bg-white divide-y divide-[#E8E8E8]">
            {logs.map((log) => (
              <HydrationHistoryRow
                key={log.id}
                log={log}
                confirming={confirmId === log.id}
                deleting={deleteLog.isPending && deleteLog.variables === log.id}
                onRequestDelete={() => setConfirmId(log.id)}
                onCancelDelete={() => setConfirmId(null)}
                onConfirmDelete={() => {
                  deleteLog.mutate(log.id, {
                    onSuccess: () => setConfirmId(null),
                  });
                }}
              />
            ))}
          </div>
        )}
      </CollapsibleContent>
    </Collapsible>
  );
}

function HydrationHistoryRow({
  log,
  confirming,
  deleting,
  onRequestDelete,
  onCancelDelete,
  onConfirmDelete,
}: {
  log: HydrationLog;
  confirming: boolean;
  deleting: boolean;
  onRequestDelete: () => void;
  onCancelDelete: () => void;
  onConfirmDelete: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 px-4 py-3">
      <div className="min-w-0">
        <div className="text-[15px] font-bold text-[#1A1A1A]" style={{ fontFamily: "Nunito, system-ui, sans-serif" }}>
          {log.amount_ml} ml
        </div>
        <div className="text-[12px] text-[#6B6B6B]" style={{ fontFamily: "Inter, system-ui, sans-serif" }}>
          {formatRelative(new Date(log.logged_at).getTime())}
        </div>
      </div>
      {confirming ? (
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={onCancelDelete}
            disabled={deleting}
            className="text-[12px] text-[#6B6B6B] px-2 py-1"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirmDelete}
            disabled={deleting}
            className="text-[12px] font-semibold text-[#C0392B] px-2 py-1"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {deleting ? "Deleting…" : "Delete"}
          </button>
        </div>
      ) : (
        <button
          type="button"
          aria-label={`Delete ${log.amount_ml} ml log`}
          onClick={onRequestDelete}
          className="shrink-0 h-8 w-8 flex items-center justify-center rounded-lg text-[#9A9A9A] active:bg-[#F9F9F9]"
        >
          <Trash2 size={16} />
        </button>
      )}
    </div>
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
