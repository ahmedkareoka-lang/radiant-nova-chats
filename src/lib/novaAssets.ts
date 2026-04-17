import { FRAME_MAP } from "./frameConfig";

/**
 * NOVA P tier asset mapping.
 * Each level unlocks a frame, name style, entrance effect and chat bubble.
 */
export const NOVA_ASSETS = {
  thresholds: [40_000, 100_000, 800_000, 2_000_000, 7_000_000, 10_000_000] as const,
  durations: [30, 30, 60, 90, 150, 240] as const, // days

  byLevel: {
    1: {
      label: "P1",
      frame: FRAME_MAP["frame-purple-wings"],
      nameStyle: "nova-name-p1",
      entrance: "entrance-glow-purple",
      bubble: "bubble-p1",
      gradient: "from-purple-500/30 to-fuchsia-500/30",
      borderGlow: "shadow-[0_0_20px_hsl(280_90%_60%/0.5)]",
    },
    2: {
      label: "P2",
      frame: FRAME_MAP["frame-royal-crown"],
      nameStyle: "nova-name-p2",
      entrance: "entrance-glow-blue",
      bubble: "bubble-p2",
      gradient: "from-blue-500/30 to-cyan-500/30",
      borderGlow: "shadow-[0_0_25px_hsl(200_90%_60%/0.6)]",
    },
    3: {
      label: "P3",
      frame: FRAME_MAP["frame-ice"],
      nameStyle: "nova-name-p3",
      entrance: "entrance-glow-cyan",
      bubble: "bubble-p3",
      gradient: "from-cyan-400/30 to-teal-500/30",
      borderGlow: "shadow-[0_0_30px_hsl(180_90%_60%/0.6)]",
    },
    4: {
      label: "P4",
      frame: FRAME_MAP["frame-fire"],
      nameStyle: "nova-name-p4",
      entrance: "entrance-glow-fire",
      bubble: "bubble-p4",
      gradient: "from-orange-500/30 to-red-500/30",
      borderGlow: "shadow-[0_0_35px_hsl(20_90%_55%/0.7)]",
    },
    5: {
      label: "P5",
      frame: FRAME_MAP["frame-rainbow"],
      nameStyle: "nova-name-p5",
      entrance: "entrance-glow-rainbow",
      bubble: "bubble-p5",
      gradient: "from-pink-500/30 via-yellow-400/30 to-cyan-400/30",
      borderGlow: "shadow-[0_0_40px_hsl(320_90%_60%/0.7)]",
    },
    6: {
      label: "P6",
      frame: FRAME_MAP["frame-dragon"],
      nameStyle: "nova-name-p6",
      entrance: "entrance-glow-dragon",
      bubble: "bubble-p6",
      gradient: "from-amber-400/40 via-yellow-500/40 to-amber-700/40",
      borderGlow: "shadow-[0_0_50px_hsl(45_95%_55%/0.85)]",
    },
  } as Record<number, {
    label: string;
    frame: string;
    nameStyle: string;
    entrance: string;
    bubble: string;
    gradient: string;
    borderGlow: string;
  }>,
};

export function getNovaAsset(level: number) {
  return NOVA_ASSETS.byLevel[level] ?? null;
}

export function getNovaProgress(totalGold: number) {
  const t = NOVA_ASSETS.thresholds;
  let level = 0;
  for (let i = t.length - 1; i >= 0; i--) {
    if (totalGold >= t[i]) { level = i + 1; break; }
  }
  const nextLevel = level < 6 ? level + 1 : null;
  const currentThreshold = level > 0 ? t[level - 1] : 0;
  const nextThreshold = nextLevel ? t[nextLevel - 1] : null;
  const pct = nextThreshold
    ? Math.min(100, ((totalGold - currentThreshold) / (nextThreshold - currentThreshold)) * 100)
    : 100;
  return { level, nextLevel, currentThreshold, nextThreshold, pct };
}
