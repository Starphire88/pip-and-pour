import { SegmentedBar } from "./SegmentedBar";
import { getPetPal } from "@/lib/buddies/pet-pals";
import type { BuddyDashboard } from "@/lib/buddies/types";

type Member = BuddyDashboard["self"];

/**
 * One member's own progress, always shown against their OWN goal. The percentage is the only
 * number ever compared between the two of them.
 */
export function MemberProgressCard({ member, isSelf }: { member: Member; isSelf: boolean }) {
  const pal = getPetPal(member.petPalId);

  return (
    <div className="rounded-2xl border border-[#E8E8E8] bg-white px-4 py-4">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <span aria-hidden className="text-[16px] leading-none">
            {pal?.emoji ?? "💧"}
          </span>
          <span
            className="text-[15px] font-bold text-[#1A1A1A] truncate"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            {isSelf ? `${member.name} (you)` : member.name}
          </span>
        </div>
        <span
          className="shrink-0 rounded-full border border-[#E8E8E8] px-2 py-[2px] text-[10px] text-[#6B6B6B]"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {member.provenance === "real" ? "live data" : "prototype data"}
        </span>
      </div>

      <div className="mt-3 flex items-baseline justify-between">
        <span
          className="text-[13px] text-[#6B6B6B]"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {member.totalMl} / {member.hydrationGoalMl} ml
        </span>
        <span
          className="text-[18px] font-bold text-[#1A1A1A]"
          style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
        >
          {member.percent}%
        </span>
      </div>

      <div className="mt-2">
        <SegmentedBar
          percent={member.percent}
          tint={pal?.accent ?? "#A8D5E2"}
          ariaLabel={`${member.name} hydration progress`}
        />
      </div>

      <dl className="mt-3 grid grid-cols-3 gap-2">
        <Stat label="Streak" value={`${member.individualStreak}d`} />
        <Stat label="Level" value={`${member.level}`} />
        <Stat label="XP" value={`${member.xp}`} />
      </dl>

      <div
        className="mt-2 text-[11px] text-[#6B6B6B]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        Pet Pal: {pal ? pal.name : "not chosen"}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[#F9F9F9] px-2 py-2 text-center">
      <dt
        className="text-[10px] text-[#6B6B6B]"
        style={{ fontFamily: "Inter, system-ui, sans-serif" }}
      >
        {label}
      </dt>
      <dd
        className="text-[14px] font-bold text-[#1A1A1A] truncate"
        style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
      >
        {value}
      </dd>
    </div>
  );
}
