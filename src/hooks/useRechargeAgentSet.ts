import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns a Set of user_ids that are currently active recharge agents.
 *  Loaded once per room view so all mics can highlight the special frame. */
export function useRechargeAgentSet() {
  const [agents, setAgents] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("recharge_agents" as any)
        .select("user_id")
        .eq("is_active", true);
      if (cancelled) return;
      const set = new Set<string>((data || []).map((r: any) => r.user_id));
      setAgents(set);
    })();
    return () => { cancelled = true; };
  }, []);

  return agents;
}
