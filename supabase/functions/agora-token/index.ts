// Agora RTC Token generator (App ID + Certificate auth)
// Pure-Deno implementation of the AccessToken2 spec — no external deps.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";
import AgoraToken from "https://esm.sh/agora-token@2.0.5";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// ─── CORS ───────────────────────────────────────────────────────────────────
const handleCors = (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  return null;
};

const { RtcRole, RtcTokenBuilder } = AgoraToken;

async function buildAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: number,
  expireSeconds: number,
  role: "host" | "audience",
): Promise<string> {
  const rtcRole = role === "host" ? RtcRole.PUBLISHER : RtcRole.SUBSCRIBER;
  return RtcTokenBuilder.buildTokenWithUid(
    appId,
    appCertificate,
    channelName,
    uid,
    rtcRole,
    expireSeconds,
    expireSeconds,
  );
}

// ─── HTTP handler ───────────────────────────────────────────────────────────
Deno.serve(async (req) => {
  const cors = handleCors(req);
  if (cors) return cors;

  try {
    const APP_ID = Deno.env.get("AGORA_APP_ID");
    const APP_CERT = Deno.env.get("AGORA_APP_CERTIFICATE");
    if (!APP_ID || !APP_CERT) {
      return new Response(
        JSON.stringify({ error: "Agora credentials not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Authenticate the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } },
    );

    const { data: userData, error: userErr } = await supabase.auth.getUser();
    if (userErr || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    // Parse body
    const body = await req.json().catch(() => ({}));
    const channelName: string = String(body.channelName || "").trim();
    let role: "host" | "audience" = body.role === "host" ? "host" : "audience";
    const expireSeconds: number = Math.min(
      Math.max(Number(body.expireSeconds) || 3600, 60),
      24 * 3600,
    );

    if (!channelName || channelName.length > 64) {
      return new Response(JSON.stringify({ error: "Invalid channelName" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Verify host role: only the room host or a user occupying a mic seat may publish.
    if (role === "host") {
      const userId = userData.user.id;
      const { data: room } = await supabase
        .from("rooms")
        .select("host_id")
        .eq("id", channelName)
        .maybeSingle();
      let allowed = !!room && room.host_id === userId;
      if (!allowed && room) {
        const { data: member } = await supabase
          .from("room_members")
          .select("mic_slot")
          .eq("room_id", channelName)
          .eq("user_id", userId)
          .maybeSingle();
        allowed = !!member && member.mic_slot !== null && member.mic_slot !== undefined;
      }
      if (!allowed) {
        // Downgrade silently to audience instead of refusing — keeps UX smooth.
        role = "audience";
      }
    }

    const uid = 0;

    const rtcToken = await buildAgoraToken(
      APP_ID,
      APP_CERT,
      channelName,
      uid,
      expireSeconds,
      role,
    );

    return new Response(
      JSON.stringify({
        token: rtcToken,
        appId: APP_ID,
        channel: channelName,
        uid,
        role,
        expireSeconds,
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("[agora-token] error:", msg);
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
