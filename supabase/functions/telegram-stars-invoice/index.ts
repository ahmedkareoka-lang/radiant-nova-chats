// Creates a Telegram Stars invoice link for a NOVA top-up package.
// Client (inside Telegram WebApp) then calls Telegram.WebApp.openInvoice(url).
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

// Mirror of the 8 packages in src/pages/TopUpPage.tsx (kept in sync by code).
const PACKAGES = [
  { usdt: 1,   coins: 7000,    diamonds: 1000   },
  { usdt: 2,   coins: 14000,   diamonds: 2000   },
  { usdt: 4,   coins: 28000,   diamonds: 4000   },
  { usdt: 7,   coins: 51450,   diamonds: 7000   },
  { usdt: 14,  coins: 107800,  diamonds: 14000  },
  { usdt: 28,  coins: 225400,  diamonds: 28000  },
  { usdt: 100, coins: 840000,  diamonds: 100000 },
  { usdt: 128, coins: 1120000, diamonds: 128000 },
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
    if (!LOVABLE_API_KEY || !TELEGRAM_API_KEY) {
      return json({ error: "Telegram not configured" }, 500);
    }
    const auth = req.headers.get("Authorization") || "";
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: auth } } },
    );
    const { data: u } = await supabase.auth.getUser();
    if (!u?.user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json().catch(() => ({}));
    const packageIndex = Number(body.package_index);
    if (!Number.isInteger(packageIndex) || packageIndex < 0 || packageIndex >= PACKAGES.length) {
      return json({ error: "Invalid package" }, 400);
    }
    const pkg = PACKAGES[packageIndex];

    // Conversion rate from system_settings; default 50 Stars per 1 USD.
    const admin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );
    const { data: setting } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "stars_per_usd")
      .maybeSingle();
    const starsPerUsd = Math.max(1, parseInt(setting?.value ?? "50", 10) || 50);
    const stars = pkg.usdt * starsPerUsd;

    // Look up the user's profile to remember their Telegram ID
    const { data: profile } = await admin
      .from("profiles")
      .select("telegram_id, display_name")
      .eq("id", u.user.id)
      .maybeSingle();

    // Insert pending payment with a unique payload (used as invoice payload).
    const payload = crypto.randomUUID();
    const { error: insErr } = await admin.from("telegram_star_payments").insert({
      user_id: u.user.id,
      telegram_id: profile?.telegram_id ?? null,
      package_index: packageIndex,
      usdt: pkg.usdt,
      stars,
      coins: pkg.coins,
      diamonds: pkg.diamonds,
      payload,
    });
    if (insErr) return json({ error: insErr.message }, 500);

    // Create invoice link via Telegram Bot API (currency XTR = Telegram Stars).
    const tgRes = await fetch(`${GATEWAY}/createInvoiceLink`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "X-Connection-Api-Key": TELEGRAM_API_KEY,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: `NOVA $${pkg.usdt} Pack`,
        description: `${pkg.coins.toLocaleString()} NOVA Coins + ${pkg.diamonds.toLocaleString()} Diamonds`,
        payload,
        currency: "XTR",
        prices: [{ label: `NOVA $${pkg.usdt}`, amount: stars }],
      }),
    });
    const tgData = await tgRes.json();
    if (!tgRes.ok || !tgData?.ok) {
      return json({ error: "Telegram API error", detail: tgData }, 500);
    }
    return json({ invoice_url: tgData.result, payload, stars });
  } catch (e) {
    return json({ error: String(e?.message ?? e) }, 500);
  }
});

function json(b: unknown, status = 200) {
  return new Response(JSON.stringify(b), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
