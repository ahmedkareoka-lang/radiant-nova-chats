import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Get all agencies with active status
    const { data: agencies } = await supabase
      .from("agencies")
      .select("id, owner_id, commission_balance")
      .eq("is_active", true)
      .eq("status", "approved");

    if (!agencies || agencies.length === 0) {
      return new Response(JSON.stringify({ message: "No active agencies" }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const results = [];

    for (const agency of agencies) {
      // Get all hosts in this agency
      const { data: members } = await supabase
        .from("agency_members")
        .select("user_id, total_support")
        .eq("agency_id", agency.id)
        .eq("badge", "host");

      if (!members || members.length === 0) continue;

      // Calculate total support from all hosts in last 24h
      const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      
      let dailyTotal = 0;
      for (const member of members) {
        const { data: gifts } = await supabase
          .from("gift_transactions")
          .select("diamond_amount")
          .eq("receiver_id", member.user_id)
          .gte("created_at", yesterday);

        const memberDaily = (gifts || []).reduce((sum: number, g: any) => sum + g.diamond_amount, 0);
        dailyTotal += memberDaily;

        // Update total_support for this member
        if (memberDaily > 0) {
          await supabase
            .from("agency_members")
            .update({ total_support: (member.total_support || 0) + memberDaily })
            .eq("agency_id", agency.id)
            .eq("user_id", member.user_id);
        }
      }

      // Calculate 15% commission bonus for agent
      const commission = Math.floor(dailyTotal * 0.15);
      
      if (commission > 0) {
        // Add commission to agency balance
        await supabase
          .from("agencies")
          .update({ commission_balance: (agency.commission_balance || 0) + commission })
          .eq("id", agency.id);

        // Add diamonds to agent's profile
        const { data: agentProfile } = await supabase
          .from("profiles")
          .select("diamonds")
          .eq("id", agency.owner_id)
          .single();

        if (agentProfile) {
          await supabase
            .from("profiles")
            .update({ diamonds: (agentProfile.diamonds || 0) + commission })
            .eq("id", agency.owner_id);
        }

        // Send notification to agent
        await supabase.from("notifications").insert({
          user_id: agency.owner_id,
          title: "عمولة يومية 💰",
          message: `حصلت على ${commission} ماسة كعمولة 15% من دعم مضيفيك اليوم!`,
          type: "system",
        });

        results.push({ agency_id: agency.id, daily_total: dailyTotal, commission });
      }
    }

    return new Response(JSON.stringify({ success: true, results }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
