/**
 * Streak Buddies — live (Supabase) data source.
 *
 * Implements the same BuddyDataSource contract as the local prototype store, so
 * useStreakBuddies can swap sources without touching the dashboard. Differences from the
 * local source, on purpose:
 *
 *   persistence : none. State is a mirror of what my_buddy_overview() returned. Nothing is
 *                 written to localStorage, so switching between demo and live cannot leak
 *                 prototype numbers into real numbers or the other way round.
 *   writes      : update() only moves the local mirror so the UI responds immediately. The
 *                 authoritative write is an RPC (set_buddy_pet_pal, set_buddy_race,
 *                 send_buddy_encouragement, upsert_my_buddy_progress) fired by
 *                 useBuddyLink, after which the overview query is refetched.
 *   reset()     : refuses. Real rows are not mock state and are never discarded from the UI.
 */

import { createSeedState } from "./store";
import type { BuddyDataSource } from "./store";
import { mapOverviewToStoreState, type ServerOverview } from "./overview";
import type { BuddyStoreStateShape } from "./types";

export type LiveBuddySource = BuddyDataSource & {
  /** Replaces the mirror with the server's answer. Returns false when unlinked. */
  hydrate(overview: ServerOverview, now?: Date): boolean;
  /** True once a live overview with a real buddy has been applied. */
  isLinked(): boolean;
};

export function createLiveBuddySource(now: Date = new Date()): LiveBuddySource {
  const serverState = createSeedState(now);
  let state: BuddyStoreStateShape = serverState;
  let linked = false;
  const listeners = new Set<() => void>();

  function notify() {
    listeners.forEach((listener) => listener());
  }

  return {
    kind: "supabase",
    getState() {
      return state;
    },
    getServerState() {
      return serverState;
    },
    isLinked() {
      return linked;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    update(mutator) {
      const next = mutator(state);
      if (next === state) return;
      state = next;
      notify();
    },
    reset() {
      console.warn("streak-buddies: reset is a prototype control; live data is left alone");
    },
    hydrate(overview, at = new Date()) {
      const mapped = mapOverviewToStoreState(overview, at);
      if (!mapped) {
        linked = false;
        return false;
      }
      linked = true;
      state = mapped;
      notify();
      return true;
    },
  };
}

/** One source per browser session, mirroring how pip-store.ts holds its own singleton. */
let sharedLiveSource: LiveBuddySource | null = null;

export function getLiveBuddySource(now: Date = new Date()): LiveBuddySource {
  if (!sharedLiveSource) sharedLiveSource = createLiveBuddySource(now);
  return sharedLiveSource;
}
