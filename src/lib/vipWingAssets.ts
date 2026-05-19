import wing3 from "@/assets/vip/wing-3-dragon.png";
import wing4 from "@/assets/vip/wing-4-nova.png";
import wing5 from "@/assets/vip/wing-5-phoenix.png";
import wing6 from "@/assets/vip/wing-6-celestial.png";
import wing7 from "@/assets/vip/wing-7-eternal.png";

/**
 * Per-tier flap motion config.
 *  - dur: animation duration (s)
 *  - min/max: rotation degrees (rest / peak)
 *  - squash: vertical scale at peak (1 = none)
 *  - scale: wing size relative to frame width (left + right combined wingspan)
 *  - offsetY: vertical position of wing center as fraction of frame height
 *  - overlap: how much wing tucks behind frame edge (fraction of frame width)
 */
export interface VipWingMotion {
  image: string;
  dur: string;
  min: string;
  max: string;
  squash: number;
  scale: number;
  offsetY: number;
  overlap: number;
}

export const VIP_WING_MOTION: Record<number, VipWingMotion> = {
  // Dragon — powerful, slower beats, big amplitude
  3: { image: wing3, dur: "1.5s", min: "-10deg", max: "16deg", squash: 0.9,  scale: 0.95, offsetY: 0.18, overlap: 0.10 },
  // Nova — graceful cosmic flutter
  4: { image: wing4, dur: "1.2s", min: "-8deg",  max: "12deg", squash: 0.93, scale: 1.0,  offsetY: 0.14, overlap: 0.08 },
  // Phoenix — fast, fiery, large amplitude
  5: { image: wing5, dur: "0.85s",min: "-12deg", max: "18deg", squash: 0.88, scale: 1.05, offsetY: 0.16, overlap: 0.08 },
  // Celestial — majestic, slow, smaller arc
  6: { image: wing6, dur: "1.9s", min: "-6deg",  max: "9deg",  squash: 0.96, scale: 1.1,  offsetY: 0.12, overlap: 0.06 },
  // Eternal — legendary, medium-fast with widest arc
  7: { image: wing7, dur: "1.05s",min: "-14deg", max: "20deg", squash: 0.87, scale: 1.15, offsetY: 0.14, overlap: 0.07 },
};

export const getVipWingAsset = (level: number) => VIP_WING_MOTION[level]?.image || null;
export const getVipWingMotion = (level: number) => VIP_WING_MOTION[level] || null;
