/**
 * Supporter Badge Tiers — awarded based on the total NOVA coins a user has
 * spent on gifts (profiles.total_spend_gold).
 *
 * Each tier is visually richer than the previous one. The 5M+ tiers add a
 * fiery-gold "داعم" crown that screams whale status.
 */

export interface SupporterTier {
  /** Minimum coins spent to unlock this tier */
  threshold: number;
  /** Short label rendered inside the badge, e.g. "500K", "5M" */
  short: string;
  /** Arabic title shown in tooltips / VIP-status page */
  title: string;
  /** CSS gradient for the badge background */
  gradient: string;
  /** Ring/border color (CSS color string) */
  ring: string;
  /** Outer glow color */
  glow: string;
  /** Inner text color */
  text: string;
  /** Whether to render the fiery "داعم" crown overlay */
  fire?: boolean;
}

export const SUPPORTER_TIERS: SupporterTier[] = [
  {
    threshold: 500_000,
    short: "500K",
    title: "داعم برونزي",
    gradient: "linear-gradient(135deg, #c89262 0%, #8a5a32 100%)",
    ring: "#f0c08a",
    glow: "hsl(28 70% 55% / 0.55)",
    text: "#fff5e6",
  },
  {
    threshold: 1_000_000,
    short: "1M",
    title: "داعم فضي",
    gradient: "linear-gradient(135deg, #d8dde6 0%, #8a93a8 100%)",
    ring: "#ffffff",
    glow: "hsl(220 20% 80% / 0.6)",
    text: "#1a2030",
  },
  {
    threshold: 5_000_000,
    short: "5M",
    title: "داعم ذهبي ناري",
    gradient: "linear-gradient(135deg, #ff6a00 0%, #ffd000 50%, #ff3d00 100%)",
    ring: "#ffe27a",
    glow: "hsl(35 100% 55% / 0.85)",
    text: "#1a0a00",
    fire: true,
  },
  {
    threshold: 10_000_000,
    short: "10M",
    title: "داعم أسطوري",
    gradient: "linear-gradient(135deg, #b621fe 0%, #ff2bd6 50%, #ffd500 100%)",
    ring: "#ffd7ff",
    glow: "hsl(300 100% 60% / 0.8)",
    text: "#ffffff",
    fire: true,
  },
  {
    threshold: 25_000_000,
    short: "25M",
    title: "داعم ملكي",
    gradient: "linear-gradient(135deg, #0ea5e9 0%, #6366f1 50%, #a855f7 100%)",
    ring: "#bae6fd",
    glow: "hsl(220 100% 65% / 0.8)",
    text: "#ffffff",
    fire: true,
  },
  {
    threshold: 50_000_000,
    short: "50M",
    title: "إمبراطور الدعم",
    gradient: "linear-gradient(135deg, #00ffd5 0%, #00b4ff 40%, #b300ff 100%)",
    ring: "#a4ffef",
    glow: "hsl(180 100% 55% / 0.85)",
    text: "#001019",
    fire: true,
  },
  {
    threshold: 75_000_000,
    short: "75M",
    title: "تاج الدعم",
    gradient: "linear-gradient(135deg, #fff200 0%, #ff8a00 40%, #d100ff 100%)",
    ring: "#fff7a8",
    glow: "hsl(45 100% 60% / 0.9)",
    text: "#2b1500",
    fire: true,
  },
  {
    threshold: 100_000_000,
    short: "100M",
    title: "أسطورة NOVA",
    gradient:
      "conic-gradient(from 0deg, #ff0080, #ffae00, #fffb00, #00ff85, #00d4ff, #b400ff, #ff0080)",
    ring: "#ffffff",
    glow: "hsl(320 100% 60% / 0.95)",
    text: "#ffffff",
    fire: true,
  },
];

/** Returns the highest supporter tier the user has unlocked, or null. */
export function getSupporterTier(coinsSpent: number | null | undefined): SupporterTier | null {
  const total = Number(coinsSpent || 0);
  if (!total || total < SUPPORTER_TIERS[0].threshold) return null;
  let match: SupporterTier | null = null;
  for (const tier of SUPPORTER_TIERS) {
    if (total >= tier.threshold) match = tier;
    else break;
  }
  return match;
}

/** Coins remaining until the next supporter tier (or null if at the cap). */
export function nextSupporterTier(coinsSpent: number | null | undefined): SupporterTier | null {
  const total = Number(coinsSpent || 0);
  return SUPPORTER_TIERS.find((t) => t.threshold > total) || null;
}
