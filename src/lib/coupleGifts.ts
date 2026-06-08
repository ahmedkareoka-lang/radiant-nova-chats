// Exclusive gifts that only Love Couples (Lv 6+) can see and send to each other.
// Pure frontend catalog — no DB rows needed; uses existing SVG assets.

export interface CoupleGift {
  key: string;
  name: string;
  emoji: string;
  asset: string;       // public path
  price: number;       // NOVA coins
  lovePoints: number;  // bonus points awarded
  tagline: string;
}

export const COUPLE_GIFTS: CoupleGift[] = [
  {
    key: "eternal_love",
    name: "حب أبدي",
    emoji: "💞",
    asset: "/gifts/eternal_love.svg",
    price: 9_999,
    lovePoints: 15_000,
    tagline: "رمز الحب الذي لا ينتهي",
  },
  {
    key: "couple_ring",
    name: "خاتم الوعد",
    emoji: "💍",
    asset: "/gifts/ring.svg",
    price: 19_999,
    lovePoints: 30_000,
    tagline: "خاتم ذهبي للزوجين فقط",
  },
  {
    key: "couple_castle",
    name: "قصر الحبيبين",
    emoji: "🏰",
    asset: "/gifts/castle.svg",
    price: 49_999,
    lovePoints: 75_000,
    tagline: "ملكتم القلوب — قصر خاص بكما",
  },
  {
    key: "soulmate_galaxy",
    name: "مجرة التوأم",
    emoji: "🌌",
    asset: "/gifts/galaxy.svg",
    price: 99_999,
    lovePoints: 150_000,
    tagline: "مجرتكما الخاصة في الكون",
  },
];
