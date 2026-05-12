import vip1 from "@/assets/vip/vip-1-dawn.png";
import vip2 from "@/assets/vip/vip-2-frost.png";
import vip3 from "@/assets/vip/vip-3-dragon.png";
import vip4 from "@/assets/vip/vip-4-nova.png";
import vip5 from "@/assets/vip/vip-5-phoenix.png";
import vip6 from "@/assets/vip/vip-6-celestial.png";
import vip7 from "@/assets/vip/vip-7-eternal.png";

/**
 * Per-tier rendering metadata for the legendary VIP frames.
 * - `image`: transparent PNG asset
 * - `aspect`: width / height (all square — uniform behavior across sizes)
 * - `holeScale`: diameter of the inner avatar hole, relative to FRAME WIDTH
 * - `holeOffsetY`: vertical nudge as fraction of HOLE DIAMETER (size-invariant)
 * - `widthMultiplier`: legacy field
 *
 * All new tiers (3–7) use centered transparent holes — calibrated to each
 * artwork so the avatar fits perfectly at every size with no drift.
 */
export const VIP_FRAME_ASSETS: Record<number, {
  image: string;
  aspect: number;
  holeScale: number;
  holeOffsetY: number;
  widthMultiplier: number;
}> = {
  1: { image: vip1, aspect: 1, holeScale: 0.66, holeOffsetY: 0.02, widthMultiplier: 1.52 },
  2: { image: vip2, aspect: 1, holeScale: 0.64, holeOffsetY: 0.00, widthMultiplier: 1.56 },
  // New premium AAA-style frames — hole perfectly centered.
  3: { image: vip3, aspect: 1, holeScale: 0.56, holeOffsetY: 0.04, widthMultiplier: 1.79 },
  4: { image: vip4, aspect: 1, holeScale: 0.52, holeOffsetY: 0.00, widthMultiplier: 1.92 },
  5: { image: vip5, aspect: 1, holeScale: 0.54, holeOffsetY: 0.06, widthMultiplier: 1.85 },
  6: { image: vip6, aspect: 1, holeScale: 0.46, holeOffsetY: 0.18, widthMultiplier: 2.17 },
  7: { image: vip7, aspect: 1, holeScale: 0.50, holeOffsetY: 0.04, widthMultiplier: 2.00 },
};

export const getVipFrameAsset = (level: number) => VIP_FRAME_ASSETS[level] || null;
