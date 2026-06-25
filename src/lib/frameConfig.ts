import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import lionFrame from "@/assets/lion-frame.png";
import bossFrame from "@/assets/boss-frame.png";
import frameFire from "@/assets/frame-fire.png";
import frameIce from "@/assets/frame-ice.png";
import frameRainbow from "@/assets/frame-rainbow.png";
import frameDragon from "@/assets/frame-dragon.png";

/**
 * Single source of truth for built-in frames.
 * To add a new frame globally (Store + Profile + Voice Room),
 * just add an entry here.
 */
export type FrameDef = {
  key: string;
  name: string;
  image: string;
  /** Actual artwork width / height. Non-square frames must keep their real ratio. */
  aspect?: number;
  /** Inner avatar size relative to frame box (0.55 = 55%). Tune per frame artwork. */
  innerScale: number;
  /** Optional vertical nudge (-0.5..0.5) inside the frame, e.g. crowns sit higher */
  innerOffsetY?: number;
  /** Optional CSS animation class applied to the frame img */
  animation?: string;
  /** Storefront metadata */
  store?: {
    price_coins: number;
    rarity: "rare" | "epic" | "legendary" | "mythic";
    vipRequired?: number;
  };
};

/**
 * Keys of frames retired from the store / inventory.
 * The artwork is still mapped in FRAME_MAP so legacy equipped users keep
 * their look, but they no longer appear in StorePage or InventoryPage.
 */
export const REMOVED_FRAME_KEYS = new Set<string>([
  "frame-purple-wings",
  "frame-royal-crown",
  "lion-frame",
  "frame-fire",
  "frame-ice",
  "frame-rainbow",
  "frame-dragon",
]);

export const FRAMES: FrameDef[] = [
  // Legendary / mythic frames were removed from the store per design request.
  // Their artwork is still resolvable via FRAME_MAP below for legacy equipped users.
  { key: "frame-purple-wings", name: "إطار الأجنحة البنفسجية", image: framePurpleWings, aspect: 1080 / 1920, innerScale: 0.62 },
  { key: "frame-royal-crown",  name: "إطار التاج الملكي",      image: frameRoyalCrown,  innerScale: 0.66, innerOffsetY: 0.06 },
  { key: "lion-frame",         name: "إطار الأسد",             image: lionFrame,        aspect: 1638 / 1920, innerScale: 0.6 },
  { key: "frame-fire",         name: "إطار النار 🔥",          image: frameFire,        innerScale: 0.64, animation: "frame-animate-fire" },
  { key: "frame-ice",          name: "إطار الجليد ❄️",         image: frameIce,         innerScale: 0.64, animation: "frame-animate-ice" },
  { key: "frame-rainbow",      name: "إطار قوس قزح 🌈",        image: frameRainbow,     innerScale: 0.64, animation: "frame-animate-rainbow" },
  { key: "frame-dragon",       name: "إطار التنين الذهبي 🐉",  image: frameDragon,      innerScale: 0.6,  animation: "frame-animate-dragon" },
];

// Backwards-compatible maps used across the app
export const FRAME_MAP: Record<string, string> = Object.fromEntries(
  FRAMES.map((f) => [f.key, f.image]),
);

// Boss frame stays available but is not exposed in the store anymore.
FRAME_MAP["boss-frame"] = bossFrame;

export const FRAME_ANIMATION: Record<string, string> = Object.fromEntries(
  FRAMES.filter((f) => f.animation).map((f) => [f.key, f.animation as string]),
);

/**
 * Resolve fitting metadata for an equipped frame key.
 * Falls back to safe defaults so unknown / admin-uploaded frames still look correct.
 */
export function getFrameFit(key: string | null | undefined): {
  innerScale: number;
  innerOffsetY: number;
  aspect: number;
} {
  if (!key) return { innerScale: 0.7, innerOffsetY: 0, aspect: 1 };
  const def = FRAMES.find((f) => f.key === key);
  if (def) return { innerScale: def.innerScale, innerOffsetY: def.innerOffsetY ?? 0, aspect: def.aspect ?? 1 };
  // Unknown / admin-uploaded frame → conservative inner so the avatar fits inside
  return { innerScale: 0.66, innerOffsetY: 0, aspect: 1 };
}

export { bossFrame };
