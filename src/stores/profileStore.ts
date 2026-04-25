/**
 * 👤 Profile Store — Zustand
 *
 * Stale-While-Revalidate cache for the current user's profile.
 * - On mount, returns instantly from localStorage (no spinner).
 * - In the background, re-fetches and updates if anything changed.
 * - Used for balance (coins/diamonds), equipped frame, badge, etc.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface CachedProfile {
  id: string;
  display_name: string;
  avatar_url: string | null;
  coins: number;
  diamonds: number;
  equipped_frame: string | null;
  equipped_badge: string | null;
  vip_level: number;
  level: number;
  is_boss: boolean;
}

interface ProfileState {
  profile: CachedProfile | null;
  loading: boolean;
  setProfile: (p: Partial<CachedProfile>) => void;
  fetchProfile: (userId: string, force?: boolean) => Promise<void>;
  clear: () => void;
}

export const useProfileStore = create<ProfileState>()(
  persist(
    (set, get) => ({
      profile: null,
      loading: false,

      setProfile(p) {
        const cur = get().profile;
        if (!cur) return;
        set({ profile: { ...cur, ...p } });
      },

      async fetchProfile(userId, force = false) {
        const cur = get().profile;
        // SWR: return cache, refetch in background unless forced
        if (!force && cur?.id === userId) {
          // Background refresh
          (async () => {
            const { data } = await supabase
              .from("profiles")
              .select("id, display_name, avatar_url, coins, diamonds, equipped_frame, equipped_badge, vip_level, level, is_boss")
              .eq("id", userId)
              .single();
            if (data) set({ profile: data as CachedProfile });
          })();
          return;
        }
        set({ loading: true });
        const { data } = await supabase
          .from("profiles")
          .select("id, display_name, avatar_url, coins, diamonds, equipped_frame, equipped_badge, vip_level, level, is_boss")
          .eq("id", userId)
          .single();
        if (data) set({ profile: data as CachedProfile });
        set({ loading: false });
      },

      clear() {
        set({ profile: null, loading: false });
      },
    }),
    {
      name: "nova-profile-cache",
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ profile: s.profile }),
    },
  ),
);
