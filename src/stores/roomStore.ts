/**
 * 🏠 Room Snapshot Store — Zustand (persisted)
 *
 * Caches the last-known mini-snapshot of rooms the user has visited so that
 * re-entry shows the room INSTANTLY (background refresh continues).
 * - Keeps only the 8 most-recently-visited rooms (small footprint).
 * - Stores: room metadata, member count, host info — NOT messages.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

export interface CachedRoomSnapshot {
  id: string;
  name: string;
  room_image: string | null;
  background_theme: string;
  mic_count: number;
  host_id: string;
  host_display_name?: string;
  host_avatar_url?: string | null;
  member_count: number;
  cachedAt: number;
}

interface RoomState {
  snapshots: Record<string, CachedRoomSnapshot>;
  saveSnapshot: (snap: CachedRoomSnapshot) => void;
  getSnapshot: (roomId: string) => CachedRoomSnapshot | null;
  clear: () => void;
}

const MAX_SNAPSHOTS = 8;
const TTL_MS = 30 * 60 * 1000; // 30 min — older entries are considered stale

export const useRoomStore = create<RoomState>()(
  persist(
    (set, get) => ({
      snapshots: {},

      saveSnapshot(snap) {
        const next = { ...get().snapshots, [snap.id]: { ...snap, cachedAt: Date.now() } };
        // Cap size: drop the oldest entries beyond MAX_SNAPSHOTS
        const entries = Object.values(next).sort((a, b) => b.cachedAt - a.cachedAt);
        const capped: Record<string, CachedRoomSnapshot> = {};
        for (const e of entries.slice(0, MAX_SNAPSHOTS)) capped[e.id] = e;
        set({ snapshots: capped });
      },

      getSnapshot(roomId) {
        const s = get().snapshots[roomId];
        if (!s) return null;
        if (Date.now() - s.cachedAt > TTL_MS) return null;
        return s;
      },

      clear() {
        set({ snapshots: {} });
      },
    }),
    {
      name: "nova-room-cache",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ snapshots: s.snapshots }),
    },
  ),
);
