// Love Couples (حبيبين) — Legendary Edition level system
// All perks unlock via Love Points (earned from mutual gifts + quests + streak)

export const LOVE_THRESHOLDS = [
  0,         // Lv 1 — activation
  25_000,    // Lv 2
  60_000,    // Lv 3
  130_000,   // Lv 4
  270_000,   // Lv 5
  550_000,   // Lv 6
  1_110_000, // Lv 7
  2_230_000, // Lv 8
  4_470_000, // Lv 9
  8_950_000, // Lv 10
] as const;

export interface LovePerk {
  level: number;
  emoji: string;
  title: string;
  description: string;
  big?: boolean;
}

export const LOVE_PERKS_DETAILED: LovePerk[] = [
  { level: 1,  emoji: "💕", title: "بطاقة حبيبين", description: "بطاقة الحب الأساسية تظهر على البروفايل والغرفة" },
  { level: 2,  emoji: "🌸", title: "قلوب طايرة + لقب", description: "قلوب متحركة تحوم حول البطاقة + لقب \"حبيبين\"" },
  { level: 3,  emoji: "💌", title: "رسائل قلب يومية", description: "3 قلوب مجانية ترسلوها لبعض كل يوم — كل قلب = 500 نقطة", big: true },
  { level: 4,  emoji: "🎁", title: "ذكرى أسبوعية", description: "هدية مجانية أسبوعية: 2000 كوينز لكل منكما + 1500 نقطة حب", big: true },
  { level: 5,  emoji: "👑", title: "إطار CoupleSeats", description: "إطار ذهبي مشترك حول مايكاتكم في الغرفة الصوتية" },
  { level: 6,  emoji: "💎", title: "متجر هدايا حصري", description: "4 هدايا أسطورية ما تظهرش إلا للحبيبين فقط", big: true },
  { level: 7,  emoji: "🚪✨", title: "Royal Entrance مشترك", description: "دخول ملكي للغرف بتأثير سينمائي + بطاقة Soulmates" },
  { level: 8,  emoji: "🎂", title: "ذكرى ارتباط شهرية", description: "5000 كوينز لكل منكما كل شهر + 5000 نقطة", big: true },
  { level: 9,  emoji: "🔮", title: "هالة أسطورية + لقب مخصص", description: "اختاروا لقبكم الخاص اللي يظهر تحت البطاقة" },
  { level: 10, emoji: "👑💞", title: "Legendary Soulmates", description: "بطاقة أسطورية + ظهور دائم في Hall of Fame العالمي", big: true },
];

export const LOVE_PERKS: Record<number, string> = Object.fromEntries(
  LOVE_PERKS_DETAILED.map((p) => [p.level, `${p.emoji} ${p.title} — ${p.description}`])
);

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

// Aura color per level (CSS gradient)
export const LOVE_AURA_GRADIENTS: Record<number, string> = {
  1: "radial-gradient(circle, hsl(330 90% 70% / 0.5), transparent 70%)",
  2: "radial-gradient(circle, hsl(330 95% 70% / 0.55), hsl(300 90% 60% / 0.3), transparent 75%)",
  3: "radial-gradient(circle, hsl(340 95% 70% / 0.6), hsl(310 90% 60% / 0.35), transparent 75%)",
  4: "radial-gradient(circle, hsl(280 95% 70% / 0.65), hsl(330 95% 65% / 0.4), transparent 78%)",
  5: "radial-gradient(circle, hsl(45 100% 65% / 0.5), hsl(330 95% 65% / 0.45), transparent 80%)",
  6: "radial-gradient(circle, hsl(300 100% 75% / 0.6), hsl(45 100% 65% / 0.4), transparent 82%)",
  7: "radial-gradient(circle, hsl(45 100% 70% / 0.7), hsl(280 95% 65% / 0.45), hsl(330 95% 65% / 0.3), transparent 85%)",
  8: "radial-gradient(circle, hsl(30 100% 65% / 0.7), hsl(330 100% 65% / 0.5), hsl(280 95% 65% / 0.35), transparent 88%)",
  9: "radial-gradient(circle, hsl(45 100% 70% / 0.8), hsl(280 100% 65% / 0.55), hsl(330 100% 65% / 0.4), transparent 90%)",
  10: "conic-gradient(from 0deg, hsl(0 100% 65%), hsl(45 100% 60%), hsl(120 80% 55%), hsl(200 95% 60%), hsl(280 95% 65%), hsl(330 100% 65%), hsl(0 100% 65%))",
};
