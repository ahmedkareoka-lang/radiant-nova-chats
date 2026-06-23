/**
 * Lightweight client-side profanity filter for posts & comments.
 * Substring-based — case insensitive, supports Arabic + English.
 * Returns the matched term for transparency (e.g. to surface in a toast).
 */

const BANNED = [
  // Arabic offensive (sample set — extend over time)
  "كس","زب","نيك","قحبة","شرموطة","عرص","منيك","لوطي","خول","طيز","حقير","ابن الكلب","ابن العاهرة","يا حمار","يا كلب","قذر","نجس",
  // English offensive
  "fuck","shit","bitch","asshole","cunt","dick","pussy","nigger","faggot","slut","whore","retard","motherfucker",
  // Spam / scams
  "free coins hack","cheat coins","حسابات مهكرة","شحن مجاني هكر",
];

const NORMALIZE = (s: string) =>
  s
    .toLowerCase()
    // strip Arabic diacritics
    .replace(/[\u064B-\u0652\u0670]/g, "")
    // unify alef forms
    .replace(/[إأآا]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    // collapse whitespace
    .replace(/\s+/g, " ")
    .trim();

const BANNED_NORM = BANNED.map(NORMALIZE);

export interface ProfanityCheck {
  ok: boolean;
  matched?: string;
}

export function checkContent(text: string | null | undefined): ProfanityCheck {
  if (!text) return { ok: true };
  const norm = NORMALIZE(text);
  for (let i = 0; i < BANNED_NORM.length; i++) {
    if (norm.includes(BANNED_NORM[i])) {
      return { ok: false, matched: BANNED[i] };
    }
  }
  return { ok: true };
}
