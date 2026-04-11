import framePurpleWings from "@/assets/frame-purple-wings.png";
import frameRoyalCrown from "@/assets/frame-royal-crown.png";
import lionFrame from "@/assets/lion-frame.png";
import bossFrame from "@/assets/boss-frame.png";
import frameFire from "@/assets/frame-fire.png";
import frameIce from "@/assets/frame-ice.png";
import frameRainbow from "@/assets/frame-rainbow.png";
import frameDragon from "@/assets/frame-dragon.png";

export const FRAME_MAP: Record<string, string> = {
  "frame-purple-wings": framePurpleWings,
  "frame-royal-crown": frameRoyalCrown,
  "lion-frame": lionFrame,
  "boss-frame": bossFrame,
  "frame-fire": frameFire,
  "frame-ice": frameIce,
  "frame-rainbow": frameRainbow,
  "frame-dragon": frameDragon,
};

/** CSS animation class for animated frames */
export const FRAME_ANIMATION: Record<string, string> = {
  "frame-fire": "frame-animate-fire",
  "frame-ice": "frame-animate-ice",
  "frame-rainbow": "frame-animate-rainbow",
  "frame-dragon": "frame-animate-dragon",
};

export { bossFrame };
