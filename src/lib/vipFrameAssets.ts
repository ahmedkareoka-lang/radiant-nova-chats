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
 * - `holeOffsetY`: vertical nudge of the hole as a fraction of FRAME HEIGHT (positive = down)
 * - `widthMultiplier`: outer frame width relative to avatar slot size
 *   (wider frames need a bigger multiplier so wings fit and avatar matches the hole)
 */
export const VIP_FRAME_ASSETS: Record<number, {
  image: string;
  aspect: number;       // w / h
  holeScale: number;    // 0..1 of width
  holeOffsetY: number;  // -0.5..0.5 of height
  widthMultiplier: number; // outer width = avatarSize * this
}> = {
  1: { image: vip1, aspect: 1,    holeScale: 0.56, holeOffsetY: 0.02, widthMultiplier: 1.7 },
  2: { image: vip2, aspect: 1,    holeScale: 0.50, holeOffsetY: 0.0,  widthMultiplier: 1.9 },
  3: { image: vip3, aspect: 1.5,  holeScale: 0.32, holeOffsetY: 0.05, widthMultiplier: 2.8 },
  4: { image: vip4, aspect: 1.5,  holeScale: 0.36, holeOffsetY: 0.0,  widthMultiplier: 2.6 },
  5: { image: vip5, aspect: 1.5,  holeScale: 0.34, holeOffsetY: -0.04, widthMultiplier: 2.8 },
  6: { image: vip6, aspect: 1.5,  holeScale: 0.30, holeOffsetY: 0.05, widthMultiplier: 3.0 },
  7: { image: vip7, aspect: 1.5,  holeScale: 0.30, holeOffsetY: 0.02, widthMultiplier: 3.0 },
};

export const getVipFrameAsset = (level: number) => VIP_FRAME_ASSETS[level] || null;
