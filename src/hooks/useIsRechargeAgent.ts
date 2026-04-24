import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/**
 * Returns whether the given profile id (uuid) is an ACTIVE recharge agent.
 * Caches results in-memory per session to avoid extra round-trips when the
 * same id is queried from multiple components (Profile, UserProfile, VoiceRoom).
 */
const cache = new Map<string, boolean>();

export function useIsRechargeAgent(profileId: string | null | undefined) {
  const [isAgent, setIsAgent] = useState<boolean>(
    profileId && cache.has(profileId) ? (cache.get(profileId) as boolean) : false,
  );

  useEffect(() => {
    if (!profileId) { setIsAgent(false); return; }
    if (cache.has(profileId)) { setIsAgent(cache.get(profileId)!); return; }

    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("recharge_agents" as any)
        .select("id")
        .eq("user_id", profileId)
        .eq("is_active", true)
        .maybeSingle();
      const v = !!data;
      cache.set(profileId, v);
      if (!cancelled) setIsAgent(v);
    })();
    return () => { cancelled = true; };
  }, [profileId]);

  return isAgent;
}
