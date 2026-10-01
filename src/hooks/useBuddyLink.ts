/**
 * Streak Buddies — live link layer (invite, accept, pairing, sync).
 *
 * Everything here talks to the security definer RPCs in
 * supabase/migrations/0006_streak_buddies_live.sql. The client never touches the buddy
 * tables directly: they are scoped auth.uid() = user_id, and a shared dashboard needs one
 * policy-safe read of the other member's rows, which is what my_buddy_overview() provides.
 *
 * Failed RPCs raise Postgres exceptions with short machine codes
 * (invalid_or_expired_code, already_paired, ...). mapLinkError turns those into sentences.
 */

import { useCallback, useEffect, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { ServerOverview } from "@/lib/buddies/overview";

export const BUDDY_OVERVIEW_KEY = ["streak-buddies", "overview"] as const;

export type BuddyInvite = { code: string; expiresAt: string };

export type AcceptResult = {
  relationshipId: string;
  challengeId: string;
  buddyName: string;
};

const LINK_ERRORS: Record<string, string> = {
  invalid_or_expired_code: "That code is not valid any more. Ask for a fresh one.",
  code_required: "Enter the code your Buddy sent you.",
  cannot_accept_own_invite: "That code belongs to your own account.",
  already_paired: "You are already paired with a Buddy.",
  inviter_already_paired: "They are already paired with someone else.",
  not_authenticated: "Sign in again, then retry.",
  unknown_pet_pal: "That Pet Pal does not exist.",
  no_relationship: "You are not paired yet.",
};

/** Postgres prefixes messages with ERROR: on some drivers; keep only the machine code. */
export function mapLinkError(error: unknown): string | null {
  if (!error) return null;
  const raw = error instanceof Error ? error.message : String(error);
  const key = Object.keys(LINK_ERRORS).find((candidate) => raw.includes(candidate));
  return key ? LINK_ERRORS[key] : "Something went wrong. Try again.";
}

/** "ashleymagezi18" -> "Ashleymagezi 18": a starting point the user can edit. */
export function prettifyName(raw: string | null | undefined): string {
  if (!raw) return "";
  const local = raw.includes("@") ? raw.split("@")[0] : raw;
  const cleaned = local.replace(/[._-]+/g, " ").replace(/([a-z])([0-9])/gi, "$1 $2");
  return cleaned
    .split(" ")
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(" ");
}

async function rpc<T>(fn: string, args: Record<string, unknown> = {}): Promise<T> {
  const { data, error } = await supabase.rpc(fn, args);
  if (error) throw new Error(error.message);
  return data as T;
}

export function useBuddyLink(enabled: boolean) {
  const queryClient = useQueryClient();

  const overviewQuery = useQuery({
    queryKey: BUDDY_OVERVIEW_KEY,
    queryFn: () => rpc<ServerOverview>("my_buddy_overview"),
    enabled,
    staleTime: 10_000,
    refetchOnWindowFocus: true,
  });

  const refresh = useCallback(
    () => queryClient.invalidateQueries({ queryKey: BUDDY_OVERVIEW_KEY }),
    [queryClient],
  );

  const createInvite = useMutation({
    mutationFn: (displayName?: string) =>
      rpc<BuddyInvite>("create_buddy_invite", { p_display_name: displayName ?? null }),
    onSuccess: refresh,
  });

  const acceptInvite = useMutation({
    mutationFn: (input: { code: string; displayName?: string }) =>
      rpc<AcceptResult>("accept_buddy_invite", {
        p_code: input.code.trim().toUpperCase(),
        p_display_name: input.displayName ?? null,
      }),
    onSuccess: refresh,
  });

  const choosePetPal = useMutation({
    mutationFn: (petPalId: string | null) =>
      rpc<{ petPalId: string | null }>("set_buddy_pet_pal", { p_pet_pal_id: petPalId }),
    onSuccess: refresh,
  });

  const setRace = useMutation({
    mutationFn: (enabled: boolean) =>
      rpc<{ type: string }>("set_buddy_race", { p_enabled: enabled }),
    onSuccess: refresh,
  });

  const encourage = useMutation({
    mutationFn: (message: string) =>
      rpc<{ sent: boolean }>("send_buddy_encouragement", { p_message: message || null }),
    onSuccess: refresh,
  });

  const leave = useMutation({
    mutationFn: () => rpc<{ status: string }>("leave_buddy_relationship"),
    onSuccess: refresh,
  });

  const pushProgress = useMutation({
    mutationFn: () =>
      rpc<{ status: string; totalMl?: number; completed?: boolean }>("upsert_my_buddy_progress", {
        p_total_ml: null,
      }),
    onSuccess: refresh,
  });

  const backfill = useMutation({
    mutationFn: () => rpc<{ daysWritten: number }>("backfill_my_buddy_progress", { p_days: 120 }),
    onSuccess: refresh,
  });

  return {
    overview: overviewQuery.data ?? null,
    overviewError: overviewQuery.error ? String(overviewQuery.error) : null,
    isLoading: overviewQuery.isLoading,
    refresh,
    createInvite,
    acceptInvite,
    choosePetPal,
    setRace,
    encourage,
    leave,
    pushProgress,
    backfill,
  };
}

export type BuddyLinkApi = ReturnType<typeof useBuddyLink>;

const BACKFILL_FLAG = "pip.streakBuddies.backfilled";

/**
 * Pushes this account's own hydration into the shared challenge and, once per pairing,
 * backfills the days that were logged before the two accounts were linked. Both are the
 * server's own arithmetic over hydration_logs, so nothing is invented client-side.
 *
 * Keyed on primitives only: the callbacks are read through a ref so a re-render cannot
 * re-fire the sync and write to the database in a loop.
 */
export function useBuddyProgressSync(input: {
  enabled: boolean;
  relationshipId: string | null;
  /** needsBackfill is true on the first sync of a pairing. */
  onSync: (needsBackfill: boolean) => void;
}) {
  const { enabled, relationshipId, onSync } = input;
  const onSyncRef = useRef(onSync);
  onSyncRef.current = onSync;
  const running = useRef(false);

  useEffect(() => {
    if (!enabled || !relationshipId || running.current) return;
    running.current = true;

    const storageKey = `${BACKFILL_FLAG}.${relationshipId}`;
    let alreadyBackfilled = false;
    try {
      alreadyBackfilled = window.localStorage.getItem(storageKey) === "1";
    } catch {
      alreadyBackfilled = true;
    }

    if (!alreadyBackfilled) {
      try {
        window.localStorage.setItem(storageKey, "1");
      } catch {
        /* private mode: backfill simply runs again next time */
      }
    }

    onSyncRef.current(!alreadyBackfilled);
    running.current = false;
  }, [enabled, relationshipId]);
}
