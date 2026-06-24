/**
 * VIP benefit helpers — kept in sync with vip_active_level / vip_store_discount
 * SQL helpers added in migration 20260624_vip_benefits.
 *
 * Use these for client-side previews (UI badges, discounted price display).
 * All security-sensitive calculations (actual coin deduction, kick checks,
 * stealth visits, daily reward bonuses) are enforced server-side.
 */

export function isVipExpired(expiry: string | null | undefined): boolean {
  if (!expiry) return true;
  return new Date(expiry).getTime() <= Date.now();
}

export function activeVipLevel(profile: { vip_level?: number | null; vip_expiry?: string | null } | null | undefined): number {
  if (!profile) return 0;
  const lvl = profile.vip_level ?? 0;
  if (!lvl || lvl < 1) return 0;
  if (isVipExpired(profile.vip_expiry)) return 0;
  return lvl;
}

/** Daily-reward multiplier mirroring vip_reward_multiplier(). */
export function vipRewardMultiplier(level: number): number {
  switch (level) {
    case 1: return 1.05;
    case 2: return 1.10;
    case 3: return 1.15;
    case 4: return 1.20;
    case 5: return 1.30;
    case 6: return 1.40;
    case 7: return 1.50;
    default: return 1.0;
  }
}

/** Store discount % mirroring vip_store_discount(). VIP5+ only. */
export function vipStoreDiscountPct(level: number): number {
  switch (level) {
    case 5: return 15;
    case 6: return 25;
    case 7: return 40;
    default: return 0;
  }
}

/** Apply VIP store discount to a price (floor result). */
export function applyVipDiscount(price: number, profile: { vip_level?: number | null; vip_expiry?: string | null } | null | undefined): number {
  const pct = vipStoreDiscountPct(activeVipLevel(profile));
  if (!pct) return price;
  return Math.floor(price * (100 - pct) / 100);
}

/** VIP5+ users are protected from non-BOSS kick / mic-kick. */
export function isKickProtected(level: number): boolean {
  return level >= 5;
}

/** VIP2+ visits to profiles are stealth (not recorded). */
export function hasStealthVisits(level: number): boolean {
  return level >= 2;
}

/** VIP6+ has built-in translation in rooms (auto-on). */
export function hasAutoTranslate(level: number): boolean {
  return level >= 6;
}
