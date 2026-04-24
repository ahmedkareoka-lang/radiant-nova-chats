// Love Couples (حبيبين) — level system
// Activation costs 10,000 coins (counts as starting points)
// Each subsequent level requires DOUBLE the previous increment

export const LOVE_THRESHOLDS = [
  0,        // Lv 1 — activation
  25_000,   // Lv 2  (+15K)
  60_000,   // Lv 3  (+35K)
  130_000,  // Lv 4  (+70K)
  270_000,  // Lv 5  (+140K) — voice room frame
  550_000,  // Lv 6
  1_110_000,// Lv 7
  2_230_000,// Lv 8 — joint entrance effect
  4_470_000,// Lv 9
  8_950_000,// Lv 10 — legendary card + crown
] as const;

export const LOVE_PERKS: Record<number, string> = {
  1: "بطاقة حبيبين على البروفايل والغرفة 💕",
  2: "قلوب طايرة حول البطاقة 🌸",
  3: "لون قلب أفخم 💖",
  4: "بلورة متوهجة في القلب ✨",
  5: "إطار مشترك حول مايكاتكم في الغرفة 💎",
  6: "تأثير شرارات حول البطاقة 🌟",
  7: "خلفية ذهبية رومانسية 👑",
  8: "تأثير دخول مشترك للغرفة الصوتية 🚪✨",
  9: "هالة أسطورية حول البطاقة 🔮",
  10: "بطاقة Soulmates أسطورية متحركة + لقب خاص 👑💞",
};

export const LOVE_ACTIVATION_COST = 10_000;

export function getLoveLevel(points: number): number {
  for (let i = LOVE_THRESHOLDS.length - 1; i >= 0; i--) {
    if (points >= LOVE_THRESHOLDS[i]) return i + 1;
  }
  return 1;
}

export function getLoveProgress(points: number) {
  const level = getLoveLevel(points);
  const currentTh = LOVE_THRESHOLDS[level - 1] ?? 0;
  const nextTh = LOVE_THRESHOLDS[level] ?? null;
  if (nextTh === null) {
    return { level, currentTh, nextTh: null, pct: 100, remaining: 0 };
  }
  const pct = Math.min(100, ((points - currentTh) / (nextTh - currentTh)) * 100);
  return { level, currentTh, nextTh, pct, remaining: Math.max(0, nextTh - points) };
}
