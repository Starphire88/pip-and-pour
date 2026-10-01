import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { Check, ChevronDown, Copy, RotateCcw, Trophy } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Confetti } from "@/components/Confetti";
import { MobileShell } from "@/components/MobileShell";
import { RequireAuth } from "@/components/RequireAuth";
import { BuddyLinkCard } from "@/components/buddies/BuddyLinkCard";
import { MemberProgressCard } from "@/components/buddies/MemberProgressCard";
import { PetPalCard } from "@/components/buddies/PetPalCard";
import { SegmentedBar } from "@/components/buddies/SegmentedBar";
import { useStreakBuddies, type StreakBuddiesViewModel } from "@/hooks/useStreakBuddies";
import { BUDDY_PET_PAL_IDS, SELECTABLE_PET_PAL_IDS, getPetPal } from "@/lib/buddies/pet-pals";

export const Route = createFileRoute("/buddies")({
  head: () => ({
    meta: [
      { title: "Pip the Panda — Streak Buddies" },
      {
        name: "description",
        content:
          "Track your hydration alongside your buddy: individual progress, a shared Buddy Streak and a team goal.",
      },
    ],
  }),
  component: BuddiesRoute,
});

function BuddiesRoute() {
  return (
    <RequireAuth>
      <BuddiesPage />
    </RequireAuth>
  );
}

function BuddiesPage() {
  const { ready, dashboard, actions, link } = useStreakBuddies();
  const [editing, setEditing] = useState<"self" | "buddy">("buddy");
  const [controlsOpen, setControlsOpen] = useState(false);

  if (!ready || !dashboard) {
    return (
      <MobileShell>
        <div
          className="flex items-center justify-center min-h-[50vh] text-[#6B6B6B]"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Loading…
        </div>
      </MobileShell>
    );
  }

  const { self, buddy, buddyStreak, teamProgress, todayCount, race, rescue, relationship } =
    dashboard;
  const buddyPal = getPetPal(buddy.petPalId);
  const bothComplete = todayCount === 2;
  // A live pairing only ever lets you change your OWN Pet Pal: the buddy sets his from his
  // own account. The local demo still lets you drive both sides.
  const activeEditing = link.live ? "self" : editing;
  const pickerOptions = activeEditing === "self" ? SELECTABLE_PET_PAL_IDS : BUDDY_PET_PAL_IDS;

  return (
    <MobileShell>
      <Confetti show={bothComplete} />

      <header className="px-5 pt-5">
        <h1
          className="text-[22px] font-bold text-[#1A1A1A]"
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          Streak Buddies
        </h1>
        <p
          className="text-[13px] text-[#6B6B6B] mt-1"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {self.name} + {buddy.name} · shared accountability, separate goals
        </p>
      </header>

      {link.live ? (
        <section className="px-5 mt-4">
          <div className="flex items-center justify-between gap-2 rounded-2xl border border-[#A8D5E2] bg-[#F2FAFD] px-3 py-2.5">
            <span
              className="flex items-center gap-2 text-[12px] text-[#1A1A1A]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <span className="inline-block h-2 w-2 rounded-full bg-[#4CAF50]" />
              Live pairing · both accounts connected
            </span>
            <button
              type="button"
              onClick={() => {
                if (window.confirm(`Disconnect from ${buddy.name}? Individual progress stays.`)) {
                  link.leave();
                }
              }}
              className="rounded-lg px-2 py-1 text-[11px] text-[#6B6B6B] underline active:bg-white"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Disconnect
            </button>
          </div>
          {link.error && (
            <p
              className="mt-2 text-[11px] text-[#B3413B]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {link.error}
            </p>
          )}
        </section>
      ) : (
        <BuddyLinkCard link={link} buddyName={buddy.name} />
      )}

      {/* ---------------------------------------------------------------- Pet Pals */}
      <section className="px-5 mt-5">
        <SectionLabel>Pet Pals</SectionLabel>
        <div className="flex gap-3">
          <PetPalCard
            ownerName={self.name}
            selected={self.petPalId}
            status={self.petPalStatus}
            options={SELECTABLE_PET_PAL_IDS}
            isSelf
          />
          <PetPalCard
            ownerName={buddy.name}
            selected={buddy.petPalId}
            status={buddy.petPalStatus}
            options={BUDDY_PET_PAL_IDS}
            isSelf={false}
          />
        </div>

        <div className="mt-3 rounded-2xl border border-[#E8E8E8] bg-[#F9F9F9] p-3">
          <div className="flex items-center justify-between gap-2">
            <span
              className="text-[12px] text-[#6B6B6B]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {link.live
                ? buddy.petPalId === null
                  ? `${buddy.name} chooses his own Pet Pal from his own account.`
                  : `You can change your own Pet Pal here. ${buddy.name} set his own.`
                : buddy.petPalId === null
                  ? `${buddy.name} has not chosen yet. Pick one for the test:`
                  : `Change a Pet Pal`}
            </span>
            {!link.live && (
              <div className="flex gap-1 rounded-full border border-[#E8E8E8] bg-white p-1">
                {(["self", "buddy"] as const).map((who) => (
                  <button
                    key={who}
                    type="button"
                    onClick={() => setEditing(who)}
                    aria-pressed={editing === who}
                    className={`rounded-full px-3 py-1 text-[11px] font-semibold ${
                      editing === who ? "bg-[#1A1A1A] text-white" : "text-[#6B6B6B]"
                    }`}
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {who === "self" ? "You" : buddy.name}
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {pickerOptions.map((id) => {
              const option = getPetPal(id);
              if (!option) return null;
              const current = activeEditing === "self" ? self.petPalId : buddy.petPalId;
              const active = current === id;
              return (
                <button
                  key={id}
                  type="button"
                  onClick={() =>
                    activeEditing === "self"
                      ? actions.chooseOwnPetPal(id)
                      : actions.chooseBuddyPetPal(id)
                  }
                  aria-pressed={active}
                  className={`flex items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition ${
                    active
                      ? "border-[#1A1A1A] bg-white"
                      : "border-[#E8E8E8] bg-white active:bg-[#F0F0F0]"
                  }`}
                >
                  <span aria-hidden className="text-[22px] leading-none">
                    {option.emoji}
                  </span>
                  <span className="min-w-0">
                    <span
                      className="block text-[13px] font-bold text-[#1A1A1A]"
                      style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                    >
                      {option.name}
                    </span>
                    <span
                      className="block text-[11px] text-[#6B6B6B]"
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      {option.personality.join(" · ")}
                    </span>
                  </span>
                  {active && (
                    <span
                      className="ml-auto shrink-0 text-[11px] font-semibold text-[#1A1A1A]"
                      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                    >
                      chosen
                    </span>
                  )}
                </button>
              );
            })}
          </div>
          {buddyPal && (
            <p
              className="mt-2 text-[11px] italic text-[#6B6B6B]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              "{buddyPal.blurb}"
            </p>
          )}
        </div>
      </section>

      {/* ------------------------------------------------------- individual progress */}
      <section className="px-5 mt-6">
        <SectionLabel>Individual Progress</SectionLabel>
        <div className="space-y-3">
          <MemberProgressCard member={self} isSelf />
          <MemberProgressCard member={buddy} isSelf={false} />
        </div>
        <p
          className="mt-2 text-[11px] text-[#6B6B6B]"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          Each of you is measured against your own goal. {buddy.name} is on {buddy.hydrationGoalMl}{" "}
          ml, you are on {self.hydrationGoalMl} ml, and neither total is treated as the better one.
        </p>
      </section>

      {/* ------------------------------------------------------------ team progress */}
      <section className="px-5 mt-6">
        <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-4">
          <div className="flex items-baseline justify-between">
            <span
              className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Team Progress
            </span>
            <span
              className="text-[20px] font-bold text-[#1A1A1A]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              {teamProgress}%
            </span>
          </div>
          <div className="mt-2">
            <SegmentedBar percent={teamProgress} tint="#7BAE7F" ariaLabel="Team progress" />
          </div>
          <p
            className="mt-2 text-[11px] text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Average of both percentages of your own goals: ({self.percent}% + {buddy.percent}%) / 2.
          </p>
        </div>
      </section>

      {/* ---------------------------------------------------------------------- today */}
      <section className="px-5 mt-6">
        <SectionLabel>Today's Buddy Goal</SectionLabel>
        <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-4">
          <div className="flex items-center gap-3">
            <Ticked label={self.name} done={self.completedToday} />
            <Ticked label={buddy.name} done={buddy.completedToday} />
          </div>
          <div
            className="mt-3 text-[15px] font-bold text-[#1A1A1A]"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {todayCount} / 2 completed
          </div>
          <p
            className="mt-1 text-[12px] text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Complete today's hydration goals together. That is the whole objective.
          </p>
        </div>
      </section>

      {/* --------------------------------------------------------------- buddy streak */}
      <section className="px-5 mt-6">
        <div className="rounded-2xl border-2 border-[#1A1A1A] bg-white px-4 py-5 text-center">
          <div
            className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Buddy Streak
          </div>
          <div
            className="mt-1 text-[40px] font-bold leading-none text-[#1A1A1A]"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {buddyStreak.currentStreak}
          </div>
          <div
            className="text-[13px] text-[#6B6B6B]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {buddyStreak.currentStreak === 1 ? "day" : "days"}
          </div>
          <p
            className="mt-3 text-[12px] text-[#6B6B6B] max-w-[300px] mx-auto"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            This one counts only on days when you BOTH finish your OWN goals. Longest shared run:{" "}
            {buddyStreak.longestStreak} days.
          </p>
        </div>
      </section>

      {/* ------------------------------------------------------------------- actions */}
      <section className="px-5 mt-6 space-y-3">
        <button
          type="button"
          onClick={actions.encourageBuddy}
          disabled={!rescue.needed || rescue.alreadyEncouragedToday}
          className={`w-full h-12 rounded-xl text-[15px] font-bold transition ${
            !rescue.needed || rescue.alreadyEncouragedToday
              ? "bg-[#F9F9F9] text-[#9A9A9A] border border-[#E8E8E8]"
              : "bg-[#A8D5E2] text-[#1A1A1A] active:scale-[0.99]"
          }`}
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {rescue.alreadyEncouragedToday
            ? `${buddy.name} has been encouraged ✓`
            : `Encourage ${buddy.name}`}
        </button>
        <p
          className="text-[11px] text-[#6B6B6B] text-center"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {rescue.headline} {rescue.message}
        </p>

        <div className="flex items-center justify-between gap-3 rounded-2xl border border-[#E8E8E8] bg-white px-4 py-3">
          <div className="flex items-center gap-2 min-w-0">
            <Trophy size={16} className="text-[#6B6B6B] shrink-0" />
            <span
              className="text-[13px] text-[#1A1A1A]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Friendly Challenge
            </span>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={race.enabled}
            onClick={() => actions.toggleRace(!race.enabled)}
            className={`relative h-7 w-12 shrink-0 rounded-full transition ${race.enabled ? "bg-[#1A1A1A]" : "bg-[#E8E8E8]"}`}
          >
            <span
              className={`absolute top-[3px] h-[22px] w-[22px] rounded-full bg-white transition-all ${
                race.enabled ? "left-[23px]" : "left-[3px]"
              }`}
            />
            <span className="sr-only">Toggle friendly challenge</span>
          </button>
        </div>
        {race.enabled && (
          <div className="rounded-2xl border border-[#E8E8E8] bg-[#F9F9F9] px-4 py-3">
            <div
              className="text-[12px] uppercase tracking-wider text-[#6B6B6B]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              Goal Race · optional
            </div>
            <div
              className="mt-2 space-y-1 text-[13px] text-[#1A1A1A]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <div>
                {self.name}: {self.percent}% of personal goal
              </div>
              <div>
                {buddy.name}: {buddy.percent}% of personal goal
              </div>
            </div>
            <p
              className="mt-2 text-[12px] text-[#6B6B6B]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {race.summary}
            </p>
          </div>
        )}
      </section>

      {/* ------------------------------------------------------------------- results */}
      {bothComplete && (
        <section className="px-5 mt-6">
          <div className="rounded-2xl border-2 border-[#1A1A1A] bg-[#F9F9F9] px-4 py-5">
            <div
              className="text-[16px] font-bold text-[#1A1A1A]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Buddy Challenge Complete
            </div>
            <div
              className="mt-2 text-[13px] text-[#1A1A1A]"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              <div>
                {self.name}: {self.percent}%
              </div>
              <div>
                {buddy.name}: {buddy.percent}%
              </div>
            </div>
            <div
              className="mt-3 text-[13px] font-bold text-[#1A1A1A]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              Buddy Streak: +1 → {buddyStreak.currentStreak} days
            </div>
            <p
              className="mt-2 text-[13px] italic text-[#1A1A1A]"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              "You both showed up today. Team Goal: {teamProgress}%."
            </p>
            {race.enabled && (
              <p
                className="mt-2 text-[12px] text-[#6B6B6B]"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                {race.summary}
              </p>
            )}
          </div>
        </section>
      )}

      {/* ---------------------------------------------------------------- explainer */}
      <section className="px-5 mt-6">
        <SectionLabel>Three different numbers</SectionLabel>
        <div className="rounded-2xl border border-[#E8E8E8] bg-white divide-y divide-[#E8E8E8]">
          <Explain
            title={`${self.name}'s streak: ${self.individualStreak}d`}
            body="Your own run. Counts days you hit your own goal. Unaffected by anyone else."
          />
          <Explain
            title={`${buddy.name}'s streak: ${buddy.individualStreak}d`}
            body={`${buddy.name}'s own run, on his own goal. Separate from yours.`}
          />
          <Explain
            title={`Buddy Streak: ${buddyStreak.currentStreak}d`}
            body="Days you BOTH hit your own goals. A miss by either of you resets this one only."
          />
        </div>
      </section>

      {/* ---------------------------------------------- prototype controls (demo only) */}
      {!link.live && (
        <section className="px-5 mt-6">
          <Collapsible open={controlsOpen} onOpenChange={setControlsOpen}>
            <CollapsibleTrigger className="flex w-full items-center justify-between rounded-xl border border-[#E8E8E8] bg-[#F9F9F9] px-4 py-3 active:bg-[#F0F0F0]">
              <span
                className="text-[13px] font-bold text-[#1A1A1A]"
                style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
              >
                Prototype controls
              </span>
              <ChevronDown
                size={18}
                className={`text-[#6B6B6B] transition-transform ${controlsOpen ? "rotate-180" : ""}`}
              />
            </CollapsibleTrigger>
            <CollapsibleContent className="mt-2 rounded-xl border border-[#E8E8E8] bg-white px-4 py-3">
              <p
                className="text-[11px] text-[#6B6B6B]"
                style={{ fontFamily: "Inter, system-ui, sans-serif" }}
              >
                Moves the mocked buddy's intake so the cooperative, falling-behind and race states
                can be tested. This block disappears on its own once two real accounts are paired.
              </p>
              <div className="mt-3 grid grid-cols-3 gap-2">
                {[
                  { label: "0%", value: 0 },
                  { label: "60%", value: Math.round(buddy.hydrationGoalMl * 0.6) },
                  { label: "100%", value: buddy.hydrationGoalMl },
                ].map((preset) => (
                  <button
                    key={preset.label}
                    type="button"
                    onClick={() => actions.setBuddyTodayMl(preset.value)}
                    className="h-11 rounded-xl border border-[#1A1A1A] bg-white text-[13px] font-bold text-[#1A1A1A] active:scale-[0.98]"
                    style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
              <div className="mt-3 flex items-center justify-between gap-2">
                <span
                  className="text-[11px] text-[#6B6B6B]"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  {buddy.name} today: {buddy.totalMl} / {buddy.hydrationGoalMl} ml
                </span>
                <button
                  type="button"
                  onClick={actions.resetPrototype}
                  className="flex items-center gap-1 rounded-lg px-2 py-1 text-[11px] text-[#6B6B6B] active:bg-[#F9F9F9]"
                  style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                >
                  <RotateCcw size={13} /> Reset prototype data
                </button>
              </div>
            </CollapsibleContent>
          </Collapsible>

          <p
            className="mt-3 text-[10px] leading-relaxed text-[#9A9A9A]"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            Prototype: your own hydration, streak and XP are live Supabase data. {buddy.name}'s side
            (intake, Pet Pal, shared streak history, encouragements) is stored on this device only,
            keyed to relationship {relationship.id}.
          </p>
        </section>
      )}
    </MobileShell>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-[12px] uppercase tracking-wider text-[#6B6B6B] mb-3"
      style={{ fontFamily: "Inter, system-ui, sans-serif" }}
    >
      {children}
    </p>
  );
}

function Ticked({ label, done }: { label: string; done: boolean }) {
  return (
    <div className="flex flex-1 items-center gap-2 rounded-xl bg-[#F9F9F9] px-3 py-2">
      <span aria-hidden className={`text-[15px] ${done ? "text-[#7BAE7F]" : "text-[#9A9A9A]"}`}>
        {done ? "✓" : "○"}
      </span>
      <span
        className="text-[13px] text-[#1A1A1A] truncate"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </span>
    </div>
  );
}

function Explain({ title, body }: { title: string; body: string }) {
  return (
    <div className="px-4 py-3">
      <div
        className="text-[13px] font-bold text-[#1A1A1A]"
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        {title}
      </div>
      <p
        className="mt-0.5 text-[11px] text-[#6B6B6B]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {body}
      </p>
    </div>
  );
}
