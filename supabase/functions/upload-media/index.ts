// Uploads media to the `assets` bucket with NOVA P-based restrictions.
// - Any authenticated user can upload images.
// - GIF uploads require nova_p_level >= 4.
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const ALLOWED_TYPES = new Set(["image", "gif"]);
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    if (req.method !== "POST") {
      return new Response(JSON.stringify({ error: "Method not allowed" }), {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 1. Authenticate caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const token = authHeader.replace("Bearer ", "");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const adminClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

    const { data: userData, error: userErr } = await adminClient.auth.getUser(token);
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: "Invalid auth" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    const userId = userData.user.id;

    // 2. Parse multipart form
    const form = await req.formData();
    const file = form.get("file");
    const fileType = String(form.get("fileType") ?? "image").toLowerCase();
    const folder = String(form.get("folder") ?? "uploads");

    if (!(file instanceof File)) {
      return new Response(JSON.stringify({ error: "Missing file" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (!ALLOWED_TYPES.has(fileType)) {
      return new Response(JSON.stringify({ error: "Invalid fileType (image|gif)" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
    if (file.size > MAX_BYTES) {
      return new Response(JSON.stringify({ error: "File exceeds 10MB" }), {
        status: 413,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // 3. NOVA P gate for GIFs
    const isGif = fileType === "gif" || file.type === "image/gif" || file.name.toLowerCase().endsWith(".gif");
    if (isGif) {
      const { data: profile } = await adminClient
        .from("profiles")
        .select("nova_p_level, nova_p_expiry")
        .eq("id", userId)
        .maybeSingle();

      const level = profile?.nova_p_level ?? 0;
      const notExpired = !profile?.nova_p_expiry || new Date(profile.nova_p_expiry) > new Date();

      if (level < 4 || !notExpired) {
        return new Response(
          JSON.stringify({
            error: "GIF upload restricted to NOVA P4+",
            required_level: 4,
            current_level: level,
          }),
          { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } },
        );
      }
    }

    // 4. Upload to storage
    const ext = (file.name.split(".").pop() || (isGif ? "gif" : "png")).toLowerCase();
    const safeFolder = folder.replace(/[^a-z0-9_\-]/gi, "");
    const path = `${safeFolder}/${userId}/${Date.now()}.${ext}`;

    const buffer = new Uint8Array(await file.arrayBuffer());
    const { error: upErr } = await adminClient.storage.from("assets").upload(path, buffer, {
      contentType: file.type || (isGif ? "image/gif" : "application/octet-stream"),
      upsert: false,
    });
    if (upErr) {
      return new Response(JSON.stringify({ error: upErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { data: pub } = adminClient.storage.from("assets").getPublicUrl(path);

    return new Response(JSON.stringify({ url: pub.publicUrl, path, isGif }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    return new Response(JSON.stringify({ error: (e as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
