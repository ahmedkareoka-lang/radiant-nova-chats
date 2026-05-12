import vip1 from "@/assets/vip/vip-1-dawn.png";
import vip2 from "@/assets/vip/vip-2-frost.png";
import vip3 from "@/assets/vip/vip-3-dragon.png";
import vip4 from "@/assets/vip/vip-4-nova.png";
import vip5 from "@/assets/vip/vip-5-phoenix.png";
import vip6 from "@/assets/vip/vip-6-celestial.png";
import vip7 from "@/assets/vip/vip-7-eternal.png";

/**
 * Per-tier rendering metadata for the legendary VIP frames.
 * - `image`: the transparent PNG asset
 * - `aspect`: width / height of the asset (square vs wide-with-wings)
 * - `holeScale`: diameter of the inner avatar hole, relative to FRAME WIDTH
 * - `holeOffsetY`: vertical nudge as a fraction of HOLE DIAMETER (positive = down).
 *   Anchoring to hole-diameter (not frame-height) keeps the avatar perfectly
 *   centered at every size — no drift when the frame scales.
 * - `widthMultiplier`: legacy field, kept for backwards-compat (FramedAvatar
 *   now derives outer width from holeScale directly).
 */
export const VIP_FRAME_ASSETS: Record<number, {
  image: string;
  aspect: number;       // w / h
  holeScale: number;    // 0..1 of width
  holeOffsetY: number;  // fraction of HOLE DIAMETER (size-invariant)
  widthMultiplier: number;
}> = {
  // Tuned so the avatar sits visually centered in each artwork's hole.
  // Higher tiers (3-7) have crowns / wings above, so the hole sits slightly
  // lower in the artwork and the avatar needs a small downward nudge.
  // Tuned so the avatar fills the frame's hole nicely (image inside frame).
  1: { image: vip1, aspect: 1, holeScale: 0.66, holeOffsetY: 0.02, widthMultiplier: 1.52 },
  2: { image: vip2, aspect: 1, holeScale: 0.64, holeOffsetY: 0.00, widthMultiplier: 1.56 },
  // New square luxury frames — large centered avatar hole, no vertical drift.
  3: { image: vip3, aspect: 1, holeScale: 0.46, holeOffsetY: 0.18, widthMultiplier: 2.17 },
  4: { image: vip4, aspect: 1, holeScale: 0.58, holeOffsetY: 0.00, widthMultiplier: 1.72 },
  5: { image: vip5, aspect: 1, holeScale: 0.44, holeOffsetY: 0.18, widthMultiplier: 2.27 },
  6: { image: vip6, aspect: 1, holeScale: 0.50, holeOffsetY: 0.10, widthMultiplier: 2.00 },
  7: { image: vip7, aspect: 1, holeScale: 0.42, holeOffsetY: 0.05, widthMultiplier: 2.38 },
};

export const getVipFrameAsset = (level: number) => VIP_FRAME_ASSETS[level] || null;
