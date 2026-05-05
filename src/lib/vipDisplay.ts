/**
 * 🔱 VIP display helper
 * Users may own VIP tier N (the highest they bought) but choose to display
 * any tier from 1..N via `displayed_vip_level`. This helper normalizes a
 * profile-shaped object so all UI keeps reading the single field `vip_level`
 * but actually sees the chosen display tier (capped by what's owned).
 */
export function effectiveVipLevel(owned?: number | null, displayed?: number | null): number {
  const o = Math.max(0, owned || 0);
  const d = Math.max(0, displayed || 0);
  if (!o) return 0;
  if (!d) return o;
  return Math.min(d, o);
}

/** Mutates a profile-like object so its vip_level reflects user's chosen displayed tier. */
export function applyDisplayedVip<T extends { vip_level?: number | null; displayed_vip_level?: number | null }>(
  profile: T | null | undefined,
): T | null | undefined {
  if (!profile) return profile;
  const eff = effectiveVipLevel(profile.vip_level as any, profile.displayed_vip_level as any);
  return { ...profile, vip_level: eff };
}
