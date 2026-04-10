import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Get client IP from headers
    const forwarded = req.headers.get("x-forwarded-for");
    const ip = forwarded ? forwarded.split(",")[0].trim() : "unknown";

    // Use a free IP geolocation API
    const res = await fetch(`https://ipapi.co/${ip}/json/`);
    const data = await res.json();

    return new Response(
      JSON.stringify({
        country_code: data.country_code || "US",
        country_name: data.country_name || "United States",
        currency: data.currency || "USD",
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch {
    return new Response(
      JSON.stringify({ country_code: "US", country_name: "United States", currency: "USD" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
