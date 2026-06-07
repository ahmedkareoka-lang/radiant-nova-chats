// Telegram Auth — verifies Mini App initData or Login Widget payload
// using TELEGRAM_BOT_TOKEN, then provisions/returns a synthetic Supabase
// email+password the client can use with signInWithPassword.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const enc = new TextEncoder();

async function hmacSha256(key: ArrayBuffer | Uint8Array, msg: string) {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key as BufferSource,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return new Uint8Array(
    await crypto.subtle.sign("HMAC", cryptoKey, enc.encode(msg)),
  );
}
async function sha256(msg: string) {
  return new Uint8Array(await crypto.subtle.digest("SHA-256", enc.encode(msg)));
}
function toHex(bytes: Uint8Array) {
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEq(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

// Verify Telegram Mini App initData (querystring form)
async function verifyInitData(initData: string, botToken: string) {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) return null;
  params.delete("hash");
  const pairs: string[] = [];
  for (const [k, v] of [...params.entries()].sort(([a], [b]) => a.localeCompare(b))) {
    pairs.push(`${k}=${v}`);
  }
  const dataCheckString = pairs.join("\n");
  const secretKey = await hmacSha256(enc.encode("WebAppData"), botToken);
  const computed = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!safeEq(computed, hash)) return null;
  const userRaw = params.get("user");
  if (!userRaw) return null;
  try {
    return JSON.parse(userRaw) as {
      id: number;
      first_name?: string;
      last_name?: string;
      username?: string;
      photo_url?: string;
    };
  } catch {
    return null;
  }
}

// Verify Telegram Login Widget payload (object form)
async function verifyWidget(
  data: Record<string, string | number>,
  botToken: string,
) {
  const hash = String(data.hash ?? "");
  if (!hash) return null;
  const pairs: string[] = [];
  for (const k of Object.keys(data).sort()) {
    if (k === "hash") continue;
    pairs.push(`${k}=${data[k]}`);
  }
  const dataCheckString = pairs.join("\n");
  const secretKey = await sha256(botToken);
  const computed = toHex(await hmacSha256(secretKey, dataCheckString));
  if (!safeEq(computed, hash)) return null;
  // reject stale (>1 day)
  const authDate = Number(data.auth_date ?? 0);
  if (!authDate || Date.now() / 1000 - authDate > 86400) return null;
  return {
    id: Number(data.id),
    first_name: String(data.first_name ?? ""),
    last_name: data.last_name ? String(data.last_name) : undefined,
    username: data.username ? String(data.username) : undefined,
    photo_url: data.photo_url ? String(data.photo_url) : undefined,
  };
}

async function derivedPassword(telegramId: number, botToken: string) {
  const mac = await hmacSha256(enc.encode(botToken), `nova-tg:${telegramId}`);
  return toHex(mac).slice(0, 32);
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  const json = (b: unknown, status = 200) =>
    new Response(JSON.stringify(b), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  try {
    const BOT_TOKEN = Deno.env.get("TELEGRAM_BOT_TOKEN");
    if (!BOT_TOKEN) return json({ error: "bot_token_missing" }, 500);

    const body = await req.json().catch(() => ({}));
    let tgUser:
      | { id: number; first_name?: string; username?: string; photo_url?: string }
      | null = null;

    if (typeof body.initData === "string" && body.initData.length > 0) {
      tgUser = await verifyInitData(body.initData, BOT_TOKEN);
    } else if (body.widget && typeof body.widget === "object") {
      tgUser = await verifyWidget(body.widget, BOT_TOKEN);
    } else {
      return json({ error: "missing_payload" }, 400);
    }

    if (!tgUser?.id) return json({ error: "invalid_signature" }, 401);

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    const email = `tg${tgUser.id}@nova.telegram.app`;
    const password = await derivedPassword(tgUser.id, BOT_TOKEN);
    const displayName = tgUser.first_name || tgUser.username || `tg${tgUser.id}`;

    // Try to find an existing profile by telegram_id
    const { data: existingProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("telegram_id", tgUser.id)
      .maybeSingle();

    if (!existingProfile) {
      // Create auth user (idempotent: if exists by email, ignore)
      const { data: created, error: createErr } = await supabase.auth.admin
        .createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            display_name: displayName,
            telegram_id: tgUser.id,
            telegram_username: tgUser.username,
            telegram_first_name: tgUser.first_name,
            avatar_url: tgUser.photo_url,
          },
        });

      if (createErr && !/already|exists|registered/i.test(createErr.message)) {
        console.error("createUser error:", createErr);
        return json({ error: "create_failed" }, 500);
      }

      const userId = created?.user?.id;
      if (userId) {
        // Patch the profile (created via trigger) with telegram info
        await supabase
          .from("profiles")
          .update({
            telegram_id: tgUser.id,
            telegram_username: tgUser.username ?? null,
            telegram_first_name: tgUser.first_name ?? null,
          })
          .eq("id", userId);
      }
    }

    return json({ email, password });
  } catch (e) {
    console.error("[telegram-auth]", e);
    return json({ error: "internal_error" }, 500);
  }
});
