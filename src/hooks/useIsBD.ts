import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether a given profile id is a BD (Business Developer).
 * Cached in-memory per session.
 */
const cache = new Map<string, boolean>();

export function useIsBD(profileId: string | null | undefined) {
  const [isBD, setIsBD] = useState<boolean>(
    profileId && cache.has(profileId) ? (cache.get(profileId) as boolean) : false,
  );

  useEffect(() => {
    if (!profileId) { setIsBD(false); return; }
    if (cache.has(profileId)) { setIsBD(cache.get(profileId)!); return; }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("is_bd")
        .eq("id", profileId)
        .maybeSingle();
      const v = !!(data as any)?.is_bd;
      cache.set(profileId, v);
      if (!cancelled) setIsBD(v);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  return isBD;
}
