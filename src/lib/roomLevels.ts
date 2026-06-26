// Room level progression — driven by lifetime support (gold/Nova coins).
// Mirrors the SQL helpers `compute_room_level` and `compute_room_max_mics`.

export interface RoomLevelTier {
  level: number;
  threshold: number;   // lifetime support coins required to reach this level
  nextThreshold: number | null;
  maxMics: number;
  label: string;       // Arabic name
  badgeName: string;   // short badge label
  color: string;       // hex
  glow: string;        // tailwind shadow color (rgba)
  /** Visual rarity — the higher the more elaborate the badge */
  rarity: "common" | "rare" | "epic" | "legendary" | "mythic" | "celestial";
}

export const ROOM_LEVEL_TIERS: RoomLevelTier[] = [
  { level: 1, threshold: 0,         nextThreshold: 750_000,    maxMics: 5,  label: "غرفة عادية",            badgeName: "LV.1", color: "#9ca3af", glow: "rgba(156,163,175,0.45)", rarity: "common" },
  { level: 2, threshold: 750_000,   nextThreshold: 3_000_000,  maxMics: 8,  label: "غرفة فضية",             badgeName: "LV.2", color: "#cbd5e1", glow: "rgba(203,213,225,0.55)", rarity: "rare" },
  { level: 3, threshold: 3_000_000, nextThreshold: 8_000_000,  maxMics: 12, label: "مالك الغرفة LV.3",      badgeName: "OWNER 3", color: "#38bdf8", glow: "rgba(56,189,248,0.65)", rarity: "epic" },
  { level: 4, threshold: 8_000_000, nextThreshold: 13_000_000, maxMics: 16, label: "ملك الغرفة LV.4",        badgeName: "KING 4",  color: "#a855f7", glow: "rgba(168,85,247,0.70)", rarity: "legendary" },
  { level: 5, threshold: 13_000_000,nextThreshold: 25_000_000, maxMics: 18, label: "إمبراطور الغرفة LV.5",   badgeName: "EMPEROR 5", color: "#f59e0b", glow: "rgba(245,158,11,0.85)", rarity: "mythic" },
  { level: 6, threshold: 25_000_000,nextThreshold: null,       maxMics: 20, label: "أسطورة الغرفة LV.6",     badgeName: "LEGEND 6",  color: "#ef4444", glow: "rgba(239,68,68,0.95)", rarity: "celestial" },
];

export function getRoomTier(coins: number): RoomLevelTier {
  let tier = ROOM_LEVEL_TIERS[0];
  for (const t of ROOM_LEVEL_TIERS) {
    if (coins >= t.threshold) tier = t;
  }
  return tier;
}

export function getRoomTierByLevel(level: number): RoomLevelTier {
  return ROOM_LEVEL_TIERS.find((t) => t.level === level) || ROOM_LEVEL_TIERS[0];
}

export function getRoomLevelProgress(coins: number): number {
  const tier = getRoomTier(coins);
  if (tier.nextThreshold == null) return 1;
  const span = tier.nextThreshold - tier.threshold;
  return Math.max(0, Math.min(1, (coins - tier.threshold) / span));
}

export function formatCoins(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1) + "M";
  if (n >= 1_000) return (n / 1_000).toFixed(0) + "K";
  return String(n);
}
