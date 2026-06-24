import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Returns true if the profile has a non-expired premium vanity_id. */
export function hasActiveVanity(p?: { vanity_id?: string | null; vanity_id_expiry?: string | null } | null) {
  if (!p?.vanity_id) return false;
  if (!p.vanity_id_expiry) return true;
  return new Date(p.vanity_id_expiry).getTime() > Date.now();
}

/** Returns the ID to display publicly: vanity if active, else the original user_id. */
export function getDisplayUid(p?: { user_id?: string | null; vanity_id?: string | null; vanity_id_expiry?: string | null } | null) {
  return hasActiveVanity(p) ? (p!.vanity_id as string) : (p?.user_id || "");
}
