/**
 * 🚀 Performance Priority Manager
 *
 * Throttles non-critical gift animations when the gift rate is high so that
 * Agora audio and the room render thread keep top priority.
 *
 * Strategy:
 *   - rate <= 3 gifts/sec  → "high"   (full effects)
 *   - rate <= 8 gifts/sec  → "normal" (skip particles, keep main animation)
 *   - rate >  8 gifts/sec  → "low"    (drop fullscreen effects, banner only)
 *
 * Components subscribe via useGiftPriority() and adjust their render.
 */
import { useEffect, useState } from "react";
import { getGiftRate, subscribePerf } from "./perfMetrics";

export type GiftPriority = "high" | "normal" | "low";

export function computePriority(rate: number): GiftPriority {
  if (rate > 8) return "low";
  if (rate > 3) return "normal";
  return "high";
}

export function useGiftPriority(): GiftPriority {
  const [priority, setPriority] = useState<GiftPriority>("high");
  useEffect(() => {
    const update = () => setPriority(computePriority(getGiftRate()));
    update();
    const unsub = subscribePerf(update);
    const id = setInterval(update, 750);
    return () => {
      unsub();
      clearInterval(id);
    };
  }, []);
  return priority;
}

/** Check if a heavy fullscreen effect should render at current load. */
export function shouldRenderHeavyEffect(): boolean {
  return computePriority(getGiftRate()) !== "low";
}
