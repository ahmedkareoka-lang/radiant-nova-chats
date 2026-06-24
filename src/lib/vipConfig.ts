/**
 * NOVA VIP System — 7 Legendary Tiers
 * 
 * Each tier has a unique mythological identity, signature color palette,
 * particle/aura behavior, and exclusive perks. Designed as the single source
 * of truth for VIP styling across the app (badges, frames, entrance effects,
 * mic seat glows, chat bubbles, etc).
 * 
 * Color tokens are HSL strings ready for `hsl(...)` wrapping.
 * Gradients are pre-built for `background: linear-gradient(...)`.
 */

export type VipAura = "ember" | "frost" | "void" | "nova" | "phoenix" | "celestial" | "eternal";
export type VipParticle = "spark" | "snow" | "shadow" | "stardust" | "flame" | "feather" | "rune";

export interface VipTier {
  level: number;
  /** Mythic title (Arabic) */
  title: string;
  /** Mythic title (English fallback) */
  titleEn: string;
  /** Short tagline shown under title */
  tagline: string;
  /** Cost in NOVA Coins for 30 days */
  price: number;
  /** Primary HSL token (hue saturation lightness, no `hsl()` wrap) */
  primary: string;
  /** Secondary HSL token */
  secondary: string;
  /** Accent / glow HSL token */
  glow: string;
  /** Pre-built CSS gradient for badges/buttons */
  gradient: string;
  /** Radial aura gradient for frames/avatars */
  aura: string;
  /** Box-shadow string for active glow */
  shadow: string;
  /** Single emoji crest used in compact UI */
  crest: string;
  /** Aura family — drives motion behavior */
  auraType: VipAura;
  /** Particle type used in frames + entrance effects */
  particle: VipParticle;
  /** Whether the tier has animated wings */
  hasWings: boolean;
  /** Whether the tier has fire/ember particles */
  hasFire: boolean;
  /** Perks list (Arabic) */
  perks: string[];
}

export const VIP_TIERS: VipTier[] = [
  {
    level: 1,
    title: "بريق الفجر",
    titleEn: "Dawn Ember",
    tagline: "أول شعاع في رحلة النجوم",
    price: 4_000,
    primary: "190 90% 60%",
    secondary: "210 80% 50%",
    glow: "180 100% 70%",
    gradient: "linear-gradient(135deg, hsl(190 90% 60%), hsl(210 80% 50%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(190 90% 60% / 0.4), transparent 70%)",
    shadow: "0 0 24px hsl(190 100% 60% / 0.45)",
    crest: "✦",
    auraType: "frost",
    particle: "spark",
    hasWings: false,
    hasFire: false,
    perks: [
      "شارة VIP متوهجة بجانب اسمك",
      "إطار صورة بريق الفجر",
      "+5% مكافآت يومية",
      "أولوية بسيطة في قوائم الغرف",
      "👁️ رؤية زوار ملفك الشخصي بالكامل",
      "تأثير دخول صغير عند الانضمام للغرف",
    ],
  },
  {
    level: 2,
    title: "حارس الصقيع",
    titleEn: "Frost Guardian",
    tagline: "تاج من الجليد لا يذوب",
    price: 20_000,
    primary: "200 100% 70%",
    secondary: "260 70% 65%",
    glow: "190 100% 80%",
    gradient: "linear-gradient(135deg, hsl(200 100% 70%), hsl(260 70% 65%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(200 100% 75% / 0.5), transparent 70%)",
    shadow: "0 0 28px hsl(200 100% 70% / 0.55)",
    crest: "❄",
    auraType: "frost",
    particle: "snow",
    hasWings: false,
    hasFire: false,
    perks: [
      "كل مزايا المستوى 1",
      "إطار جليدي متحرك ببلورات",
      "+10% مكافآت يومية",
      "إيموجي حصرية في الشات",
      "إخفاء زيارتك من ملفات الآخرين",
      "🕵️ تصفّح ملفات زوارك بدون ترك أثر",
      "تنبيه فوري عند زيارة جديدة لملفك",
    ],
  },
  {
    level: 3,
    title: "ظل التنين",
    titleEn: "Dragon Shade",
    tagline: "قوة من العتمة المضيئة",
    price: 60_000,
    primary: "280 90% 55%",
    secondary: "320 80% 50%",
    glow: "290 100% 70%",
    gradient: "linear-gradient(135deg, hsl(280 90% 55%), hsl(320 80% 50%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(290 100% 60% / 0.55), transparent 65%)",
    shadow: "0 0 32px hsl(290 100% 60% / 0.6)",
    crest: "𓆗",
    auraType: "void",
    particle: "shadow",
    hasWings: true,
    hasFire: false,
    perks: [
      "كل مزايا المستوى 2",
      "إطار التنين بأجنحة شفافة متحركة",
      "تأثير دخول صغير عند انضمامك للغرف",
      "تغيير ID المستخدم مرة واحدة",
      "فقاعة شات أرجوانية",
      "+15% مكافآت يومية",
      "📜 سجل كامل لزوار ملفك مع عدد الزيارات",
      "حد رسائل خاصة أعلى لغير المتابَعين",
    ],
  },
  {
    level: 4,
    title: "نجم نوفا",
    titleEn: "Nova Star",
    tagline: "انفجار كوني في كل دخول",
    price: 200_000,
    primary: "260 95% 65%",
    secondary: "200 95% 60%",
    glow: "240 100% 75%",
    gradient: "linear-gradient(135deg, hsl(260 95% 65%), hsl(200 95% 60%), hsl(280 90% 55%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(260 100% 70% / 0.6), hsl(200 100% 60% / 0.3) 40%, transparent 70%)",
    shadow: "0 0 40px hsl(260 100% 70% / 0.7), 0 0 80px hsl(200 100% 60% / 0.3)",
    crest: "✧",
    auraType: "nova",
    particle: "stardust",
    hasWings: true,
    hasFire: false,
    perks: [
      "كل مزايا المستوى 3",
      "إطار النوفا بحلقات نجمية دوّارة",
      "تأثير دخول كامل بصوت كوني",
      "10 إطارات نجمية حصرية",
      "أولوية في قائمة المتصلين بالغرف",
      "+20% مكافآت يومية",
      "🎨 ألوان اسم متدرجة قابلة للتخصيص",
      "تثبيت رسالتك في الغرف لمدة أطول",
    ],
  },
  {
    level: 5,
    title: "طائر العنقاء",
    titleEn: "Phoenix Sovereign",
    tagline: "نهض من اللهب ليحكم السماء",
    price: 600_000,
    primary: "15 100% 55%",
    secondary: "35 100% 60%",
    glow: "25 100% 65%",
    gradient: "linear-gradient(135deg, hsl(15 100% 55%), hsl(35 100% 60%), hsl(0 90% 50%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(15 100% 60% / 0.7), hsl(35 100% 55% / 0.35) 50%, transparent 75%)",
    shadow: "0 0 48px hsl(20 100% 60% / 0.75), 0 0 100px hsl(0 100% 50% / 0.35)",
    crest: "🔥",
    auraType: "phoenix",
    particle: "flame",
    hasWings: true,
    hasFire: true,
    perks: [
      "كل مزايا المستوى 4",
      "إطار العنقاء بأجنحة لهب متحركة",
      "ألسنة نار حقيقية حول صورتك",
      "دخول صامت اختياري للغرف",
      "صوت دخول مخصص قابل للتعديل",
      "هدية شهرية حصرية",
      "+30% مكافآت يومية",
      "🛡️ حماية من الطرد من الغرف العادية",
      "خصم 15% على كل مشتريات المتجر",
    ],
  },
  {
    level: 6,
    title: "إمبراطور السماء",
    titleEn: "Celestial Emperor",
    tagline: "تاج مصنوع من ضوء النجوم",
    price: 500_000,
    primary: "45 100% 55%",
    secondary: "30 100% 50%",
    glow: "50 100% 70%",
    gradient: "linear-gradient(135deg, hsl(45 100% 55%), hsl(30 100% 50%), hsl(280 90% 55%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(45 100% 60% / 0.75), hsl(280 90% 55% / 0.4) 45%, transparent 75%)",
    shadow: "0 0 56px hsl(45 100% 60% / 0.8), 0 0 120px hsl(280 100% 60% / 0.4)",
    crest: "👑",
    auraType: "celestial",
    particle: "feather",
    hasWings: true,
    hasFire: true,
    perks: [
      "كل مزايا المستوى 5",
      "إطار إمبراطوري بتاج ذهبي وأجنحة ملائكية",
      "ريش ذهبي يتساقط حولك في الغرف",
      "إعلان فاخر عند الدخول لكل الغرف",
      "تأثير ملء الشاشة عند رفعك للهدايا",
      "هدايا حصرية أسبوعية",
      "+40% مكافآت يومية",
    ],
  },
  {
    level: 7,
    title: "أسطورة نوفا الخالدة",
    titleEn: "Eternal NOVA Legend",
    tagline: "اسم محفور في السماء إلى الأبد",
    price: 2_000_000,
    primary: "50 100% 60%",
    secondary: "320 100% 60%",
    glow: "45 100% 75%",
    gradient: "linear-gradient(135deg, hsl(50 100% 60%), hsl(15 100% 55%), hsl(320 100% 60%), hsl(260 100% 65%))",
    aura: "radial-gradient(circle at 50% 50%, hsl(50 100% 65% / 0.85), hsl(320 100% 60% / 0.45) 40%, hsl(260 100% 65% / 0.3) 70%, transparent 90%)",
    shadow: "0 0 80px hsl(45 100% 65% / 0.9), 0 0 160px hsl(320 100% 60% / 0.5), 0 0 240px hsl(260 100% 65% / 0.3)",
    crest: "🜲",
    auraType: "eternal",
    particle: "rune",
    hasWings: true,
    hasFire: true,
    perks: [
      "كل مزايا المستوى 6",
      "إطار أسطوري بأجنحة نارية ورموز سماوية متحركة",
      "هالة قوس قزح كونية حول صورتك",
      "إعلان عالمي في كل الغرف عند الدخول",
      "بانر شخصي مخصص في الصفحة الرئيسية",
      "شارة \"أسطورة NOVA\" دائمة لا تنتهي",
      "إطار مخصص يصممه الفنان لك",
      "+50% مكافآت يومية + هدية شهرية فاخرة",
    ],
  },
];

/** Quick lookup by level (1-7). Returns null for level 0 or invalid. */
export const getVipTier = (level: number | null | undefined): VipTier | null => {
  if (!level || level < 1 || level > VIP_TIERS.length) return null;
  return VIP_TIERS[level - 1];
};

/** True if this user has any active VIP tier */
export const isVip = (level: number | null | undefined): boolean => !!level && level >= 1;

/** True if VIP is currently within expiry window */
export const isVipActive = (level: number | null | undefined, expiry: string | null | undefined): boolean => {
  if (!isVip(level)) return false;
  if (!expiry) return false;
  return new Date(expiry).getTime() > Date.now();
};
