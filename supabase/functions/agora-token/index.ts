// Agora RTC Token generator (App ID + Certificate auth)
// Pure-Deno implementation of the AccessToken2 spec — no external deps.
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

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

// ─── Agora AccessToken2 minimal builder ─────────────────────────────────────
// Spec: https://docs.agora.io/en/video-calling/develop/authentication-workflow
// Service ID for RTC = 1
// Privilege: JOIN_CHANNEL=1, PUBLISH_AUDIO_STREAM=2, PUBLISH_VIDEO_STREAM=3, PUBLISH_DATA_STREAM=4

const SERVICE_RTC = 1;
const PRIVILEGE_JOIN_CHANNEL = 1;
const PRIVILEGE_PUBLISH_AUDIO = 2;
const PRIVILEGE_PUBLISH_VIDEO = 3;
const PRIVILEGE_PUBLISH_DATA = 4;
const VERSION = "007";

// HMAC-SHA256 using Web Crypto
async function hmacSha256(key: Uint8Array, data: Uint8Array): Promise<Uint8Array> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key,
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", cryptoKey, data);
  return new Uint8Array(sig);
}

// little-endian packing helpers
class Packer {
  private bytes: number[] = [];
  putUint16(v: number) { this.bytes.push(v & 0xff, (v >> 8) & 0xff); }
  putUint32(v: number) {
    this.bytes.push(v & 0xff, (v >> 8) & 0xff, (v >> 16) & 0xff, (v >> 24) & 0xff);
  }
  putString(s: string) {
    const enc = new TextEncoder().encode(s);
    this.putUint16(enc.length);
    for (const b of enc) this.bytes.push(b);
  }
  putBytes(b: Uint8Array) {
    this.putUint16(b.length);
    for (const x of b) this.bytes.push(x);
  }
  putMapUint32(map: Map<number, number>) {
    this.putUint16(map.size);
    for (const [k, v] of map) {
      this.putUint16(k);
      this.putUint32(v);
    }
  }
  toUint8(): Uint8Array { return new Uint8Array(this.bytes); }
}

function bytesToBase64(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin);
}

async function buildAgoraToken(
  appId: string,
  appCertificate: string,
  channelName: string,
  uid: string,
  expireSeconds: number,
  role: "host" | "audience",
): Promise<string> {
  const issueTs = Math.floor(Date.now() / 1000);
  const salt = Math.floor(Math.random() * 0xffffffff);
  const expire = expireSeconds; // seconds from issueTs

  // ── Service: RTC ──
  const servicePacker = new Packer();
  servicePacker.putUint16(SERVICE_RTC);
  servicePacker.putString(channelName);
  servicePacker.putString(uid);

  // privileges map: priv → expireTs (relative to issueTs)
  const privileges = new Map<number, number>();
  privileges.set(PRIVILEGE_JOIN_CHANNEL, expire);
  if (role === "host") {
    privileges.set(PRIVILEGE_PUBLISH_AUDIO, expire);
    privileges.set(PRIVILEGE_PUBLISH_VIDEO, expire);
    privileges.set(PRIVILEGE_PUBLISH_DATA, expire);
  }
  servicePacker.putMapUint32(privileges);
  const serviceBytes = servicePacker.toUint8();

  // ── Message body: salt + ts + expire + services ──
  const msgPacker = new Packer();
  msgPacker.putUint32(salt);
  msgPacker.putUint32(issueTs);
  msgPacker.putUint32(expire);
  msgPacker.putUint16(1); // service count
  // append raw service bytes (already length-prefixed where needed)
  for (const b of serviceBytes) (msgPacker as any).bytes.push(b);
  const msgBytes = msgPacker.toUint8();

  // ── Signature: HMAC-SHA256(certificate, appId + msg) — Agora 007 spec ──
  const enc = new TextEncoder();
  const signTarget = new Uint8Array(msgBytes.length + appId.length);
  signTarget.set(enc.encode(appId), 0);
  signTarget.set(msgBytes, appId.length);
  const signature = await hmacSha256(enc.encode(appCertificate), signTarget);

  // ── Final token: header + sig + msg ──
  const finalPacker = new Packer();
  finalPacker.putString(appId);
  finalPacker.putBytes(signature);
  finalPacker.putBytes(msgBytes);
  const tokenBytes = finalPacker.toUint8();

  return VERSION + bytesToBase64(tokenBytes);
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
    const userId = userData.user.id;

    // Parse body
    const body = await req.json().catch(() => ({}));
    const channelName: string = String(body.channelName || "").trim();
    const role: "host" | "audience" = body.role === "host" ? "host" : "audience";
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

    // Use the authenticated user's ID as Agora UID (string mode)
    const uid = userId;

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
