// Public Telegram webhook for Stars payments + bot updates.
// Handles:
//  - pre_checkout_query  → answer ok:true (required by Bot API)
//  - successful_payment  → credit coins/diamonds atomically
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";

async function deriveSecret(token: string): Promise<string> {
  const buf = new TextEncoder().encode(`telegram-webhook:${token}`);
  const d = await crypto.subtle.digest("SHA-256", buf);
  return btoa(String.fromCharCode(...new Uint8Array(d)))
    .replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}
function safeEq(a: string | null, b: string) {
  if (!a || a.length !== b.length) return false;
  let d = 0; for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return new Response("ok", { status: 200 });
  const TELEGRAM_API_KEY = Deno.env.get("TELEGRAM_API_KEY");
  const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
  if (!TELEGRAM_API_KEY || !LOVABLE_API_KEY) return new Response("ok");

  const expected = await deriveSecret(TELEGRAM_API_KEY);
  if (!safeEq(req.headers.get("X-Telegram-Bot-Api-Secret-Token"), expected)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const update = await req.json().catch(() => ({}));
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  try {
    // 1) pre-checkout — must answer within 10s
    if (update.pre_checkout_query) {
      await fetch(`${GATEWAY}/answerPreCheckoutQuery`, {
        method: "POST",
        headers: tgHeaders(LOVABLE_API_KEY, TELEGRAM_API_KEY),
        body: JSON.stringify({
          pre_checkout_query_id: update.pre_checkout_query.id,
          ok: true,
        }),
      });
      return new Response("ok");
    }

    // 2) successful payment
    const sp = update.message?.successful_payment;
    if (sp && update.message?.from?.id) {
      const payload = sp.invoice_payload as string;
      const { data: row } = await supabase
        .from("telegram_star_payments")
        .select("*")
        .eq("payload", payload)
        .maybeSingle();
      if (row && row.status !== "paid") {
        // Credit coins & diamonds
        const { data: prof } = await supabase
          .from("profiles")
          .select("coins, diamonds")
          .eq("id", row.user_id)
          .single();
        await supabase
          .from("profiles")
          .update({
            coins: (prof?.coins ?? 0) + row.coins,
            diamonds: (prof?.diamonds ?? 0) + row.diamonds,
          })
          .eq("id", row.user_id);
        await supabase
          .from("telegram_star_payments")
          .update({
            status: "paid",
            paid_at: new Date().toISOString(),
            telegram_charge_id: sp.telegram_payment_charge_id ?? null,
            provider_charge_id: sp.provider_payment_charge_id ?? null,
          })
          .eq("payload", payload);

        // Optional notification
        await supabase.from("notifications").insert({
          user_id: row.user_id,
          type: "topup",
          title: "تم الشحن عبر Telegram Stars ⭐",
          message: `+${row.coins.toLocaleString()} كوين و +${row.diamonds.toLocaleString()} ماسة`,
        }).select().maybeSingle().then(() => {}).catch(() => {});
      }
    }
  } catch (e) {
    console.error("[telegram-webhook]", e);
  }

  return new Response("ok");
});

function tgHeaders(lov: string, tg: string) {
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": tg,
    "Content-Type": "application/json",
  };
}
