// Relationship types — central config for the 3 relationship modes
export type RelationshipType = "lover" | "married" | "bestie";

export interface RelationshipMeta {
  type: RelationshipType;
  label: string;
  emoji: string;
  cost: number;
  gradient: string;
  glow: string;
  description: string;
  perks: string[];
}

export const RELATIONSHIP_TYPES: Record<RelationshipType, RelationshipMeta> = {
  lover: {
    type: "lover",
    label: "حبيبين",
    emoji: "💕",
    cost: 10_000,
    gradient: "linear-gradient(135deg, hsl(330 90% 55%), hsl(280 90% 55%))",
    glow: "hsl(330 90% 60%)",
    description: "ارتباط رومانسي بين شخصين، مع شارات قلوب طائرة",
    perks: [
      "بطاقة حبيبين مشتركة على البروفايل",
      "نقاط حب تُحتسب من الهدايا المتبادلة",
      "10 مستويات بمميزات بصرية متصاعدة",
    ],
  },
  married: {
    type: "married",
    label: "زواج",
    emoji: "💍",
    cost: 50_000,
    gradient: "linear-gradient(135deg, hsl(45 95% 55%), hsl(20 90% 50%))",
    glow: "hsl(45 95% 60%)",
    description: "أعلى مستوى ارتباط، خواتم ذهبية وتأثيرات أسطورية",
    perks: [
      "خاتم ذهبي على البروفايل والغرف",
      "نقاط حب مضاعفة x2 من الهدايا",
      "دخول مشترك لكل غرفة بتأثير ملكي",
      "ذكرى زواج سنوية بهدايا مجانية",
    ],
  },
  bestie: {
    type: "bestie",
    label: "صديق روح",
    emoji: "🤝",
    cost: 5_000,
    gradient: "linear-gradient(135deg, hsl(190 90% 55%), hsl(220 80% 60%))",
    glow: "hsl(200 90% 60%)",
    description: "صداقة دائمة وأخوّة بدون رومانسية",
    perks: [
      "شارة الأخوّة على البروفايل",
      "دردشة خاصة بإطار مميز",
      "نقاط أخوّة من الهدايا والتفاعل",
    ],
  },
};

export const RELATIONSHIP_LIST: RelationshipMeta[] = [
  RELATIONSHIP_TYPES.lover,
  RELATIONSHIP_TYPES.married,
  RELATIONSHIP_TYPES.bestie,
];
