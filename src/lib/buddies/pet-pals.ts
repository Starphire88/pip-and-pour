import type { PetPal, PetPalId } from "./types";

/**
 * Pet Pal registry.
 *
 * A Pet Pal is an emotional-identity entity, not a UI branch. Adding an entry here (plus its
 * emoji) is the whole cost of adding a new Pet Pal: pickers, cards, status copy and the
 * dashboard all read from this registry.
 *
 * `panda` is Pip himself. He is included as the default for the signed-in member so that
 * Streak Buddies does not replace the existing mascot identity (see the "do not rebuild Pip"
 * constraint in docs/streak-buddies.md). Elephant and Dolphin are the spec's initial pair.
 */
export const PET_PALS: Record<PetPalId, PetPal> = {
  panda: {
    id: "panda",
    name: "Pip the Panda",
    shortName: "Pip",
    emoji: "🐼",
    personality: ["Deadpan", "Loyal", "Emotionally invested"],
    blurb: "Already here. Already judging your fluid intake. Mostly on your side.",
    accent: "#A8D5E2",
  },
  elephant: {
    id: "elephant",
    name: "Ellie the Elephant",
    shortName: "Ellie",
    emoji: "🐘",
    personality: ["Steady", "Strong", "Consistent"],
    blurb: "Remembers everything. Has never once forgotten to drink water.",
    accent: "#F2C57E",
  },
  dolphin: {
    id: "dolphin",
    name: "Dolly the Dolphin",
    shortName: "Dolly",
    emoji: "🐬",
    personality: ["Playful", "Energetic", "Social"],
    blurb: "Treats hydration like a group activity. Will splash you into participating.",
    accent: "#A8D5E2",
  },
};

export const PET_PAL_LIST: readonly PetPal[] = Object.values(PET_PALS);

/** Pet Pals a member picking for the first time can choose between. */
export const SELECTABLE_PET_PAL_IDS: readonly PetPalId[] = ["panda", "elephant", "dolphin"];

/** Don's two options from the brief. He is never hard-coded to either one. */
export const BUDDY_PET_PAL_IDS: readonly PetPalId[] = ["elephant", "dolphin"];

export function getPetPal(id: PetPalId | null | undefined): PetPal | null {
  if (!id) return null;
  return PET_PALS[id] ?? null;
}

export function isPetPalId(value: unknown): value is PetPalId {
  return typeof value === "string" && value in PET_PALS;
}
