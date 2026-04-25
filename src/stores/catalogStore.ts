/**
 * 🎁 Catalog Store — Zustand
 *
 * Cache layer for static-ish catalog data (gifts, store items, frames).
 * - Loaded ONCE per session and reused across all components.
 * - Realtime channels keep it fresh in the background.
 * - Reading from this store is instant (no network round-trip),
 *   so the gift sheet, inventory, and store all open immediately.
 */
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { supabase } from "@/integrations/supabase/client";

export interface CatalogGift {
  id: string;
  name: string;
  price: number;
  image_url: string | null;
  lottie_url: string | null;
  video_url: string | null;
  tier: string;
  duration_ms: number | null;
  category: string;
  created_at: string;
}

export interface CatalogStoreItem {
  id: string;
  name: string;
  type: string;
  price_coins: number;
  price_diamonds: number;
  image_url: string | null;
  data: any;
  tier_type: string;
  tier_required: number;
  is_active: boolean;
}

interface CatalogState {
  gifts: CatalogGift[];
  storeItems: CatalogStoreItem[];
  giftsLoaded: boolean;
  storeLoaded: boolean;
  fetchGifts: (force?: boolean) => Promise<void>;
  fetchStoreItems: (force?: boolean) => Promise<void>;
  subscribeRealtime: () => () => void;
}

export const useCatalogStore = create<CatalogState>()(
  persist(
    (set, get) => ({
      gifts: [],
      storeItems: [],
      giftsLoaded: false,
      storeLoaded: false,

      async fetchGifts(force = false) {
        if (!force && get().giftsLoaded && get().gifts.length > 0) return;
        const { data } = await supabase
          .from("gifts")
          .select("*")
          .order("price", { ascending: true });
        if (data) {
          set({
            gifts: (data as any[]).map((g) => ({
              id: g.id,
              name: g.name,
              price: Number(g.price),
              image_url: g.image_url,
              lottie_url: g.lottie_url,
              video_url: g.video_url,
              tier: g.tier,
              duration_ms: g.duration_ms,
              category: g.category || "general",
              created_at: g.created_at,
            })),
            giftsLoaded: true,
          });
        }
      },

      async fetchStoreItems(force = false) {
        if (!force && get().storeLoaded && get().storeItems.length > 0) return;
        const { data } = await supabase
          .from("store_items")
          .select("*")
          .eq("is_active", true);
        if (data) {
          set({ storeItems: data as any, storeLoaded: true });
        }
      },

      subscribeRealtime() {
        const giftsCh = supabase
          .channel("catalog-gifts-live")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "gifts" },
            () => get().fetchGifts(true),
          )
          .subscribe();
        const storeCh = supabase
          .channel("catalog-store-live")
          .on(
            "postgres_changes",
            { event: "*", schema: "public", table: "store_items" },
            () => get().fetchStoreItems(true),
          )
          .subscribe();
        return () => {
          supabase.removeChannel(giftsCh);
          supabase.removeChannel(storeCh);
        };
      },
    }),
    {
      name: "nova-catalog-cache",
      storage: createJSONStorage(() => localStorage),
      // Only persist data, not loading flags (so we always re-validate in background)
      partialize: (s) => ({ gifts: s.gifts, storeItems: s.storeItems }),
    },
  ),
);
