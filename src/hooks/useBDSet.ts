import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

/** Returns a Set of user_ids that are currently active BDs (Business Developers).
 *  Loaded once per room view so all mics / cards can highlight the BD badge & frame. */
export function useBDSet() {
  const [bds, setBDs] = useState<Set<string>>(new Set());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data } = await supabase
        .from("profiles" as any)
        .select("id")
        .eq("is_bd", true);
      if (cancelled) return;
      const set = new Set<string>((data || []).map((r: any) => r.id));
      setBDs(set);
    })();
    return () => { cancelled = true; };
  }, []);

  return bds;
}
