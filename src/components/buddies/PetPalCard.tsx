import { PET_PAL_STATUS_LABEL } from "@/lib/buddies/progress";
import { getPetPal } from "@/lib/buddies/pet-pals";
import type { PetPal, PetPalId, PetPalStatus } from "@/lib/buddies/types";

/**
 * Pet Pal identity card. Reads the registry, so a new Pet Pal needs no change here.
 * When `selected` is null the card becomes the picker, which is how Don is asked to choose.
 */
export function PetPalCard({
  ownerName,
  selected,
  status,
  options,
  onChoose,
  isSelf,
}: {
  ownerName: string;
  selected: PetPalId | null;
  status: PetPalStatus;
  options: readonly PetPalId[];
  onChoose?: (petPalId: PetPalId) => void;
  isSelf: boolean;
}) {
  const pal: PetPal | null = getPetPal(selected);
  const accent = pal?.accent ?? "#A8D5E2";

  return (
    <div className="flex-1 min-w-0 rounded-2xl border border-[#E8E8E8] bg-white p-3">
      <div className="flex items-center justify-between gap-1">
        <span
          className="text-[11px] uppercase tracking-wider text-[#6B6B6B] truncate"
          style={{ fontFamily: "Inter, system-ui, sans-serif" }}
        >
          {isSelf ? "You" : ownerName}
        </span>
        {pal && (
          <span
            className="shrink-0 rounded-full px-2 py-[2px] text-[10px] font-semibold text-[#1A1A1A]"
            style={{ background: accent, fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {PET_PAL_STATUS_LABEL[status]}
          </span>
        )}
      </div>

      {pal ? (
        <div className="mt-2 flex items-center gap-2">
          <span aria-hidden className="text-[30px] leading-none">
            {pal.emoji}
          </span>
          <div className="min-w-0">
            <div
              className="text-[14px] font-bold text-[#1A1A1A] truncate"
              style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
            >
              {pal.name}
            </div>
            <div
              className="text-[10px] text-[#6B6B6B] truncate"
              style={{ fontFamily: "Inter, system-ui, sans-serif" }}
            >
              {pal.personality.join(" · ")}
            </div>
          </div>
        </div>
      ) : (
        <div className="mt-2">
          <div
            className="text-[13px] font-bold text-[#1A1A1A]"
            style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
          >
            No Pet Pal yet
          </div>
          <div
            className="text-[10px] text-[#6B6B6B] mt-0.5"
            style={{ fontFamily: "Inter, system-ui, sans-serif" }}
          >
            {ownerName} picks one of these
          </div>
        </div>
      )}

      {onChoose && (
        <div className="mt-3 space-y-2">
          {options.map((id) => {
            const option = getPetPal(id);
            if (!option) return null;
            const active = id === selected;
            return (
              <button
                key={id}
                type="button"
                onClick={() => onChoose(id)}
                aria-pressed={active}
                className={`w-full flex items-center gap-2 rounded-xl border px-2.5 py-2 text-left transition ${
                  active
                    ? "border-[#1A1A1A] bg-[#F9F9F9]"
                    : "border-[#E8E8E8] bg-white active:bg-[#F9F9F9]"
                }`}
              >
                <span aria-hidden className="text-[18px] leading-none">
                  {option.emoji}
                </span>
                <span className="min-w-0">
                  <span
                    className="block text-[12px] font-bold text-[#1A1A1A] truncate"
                    style={{ fontFamily: "Nunito, system-ui, sans-serif" }}
                  >
                    {option.shortName}
                  </span>
                  <span
                    className="block text-[10px] text-[#6B6B6B] truncate"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    {option.personality[0]}
                  </span>
                </span>
                {active && (
                  <span
                    className="ml-auto text-[10px] font-semibold text-[#1A1A1A]"
                    style={{ fontFamily: "Inter, system-ui, sans-serif" }}
                  >
                    chosen
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
