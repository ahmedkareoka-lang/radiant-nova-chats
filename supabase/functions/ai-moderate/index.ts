import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const MODERATION_PROMPT = `أنت مشرف محتوى في تطبيق NOVA للدردشة الصوتية. مهمتك تحليل الرسائل وتحديد إذا كانت مخالفة.

أنواع المخالفات:
- harassment: تنمر أو مضايقة أو تهديد
- hate_speech: كلام كراهية أو عنصرية
- sexual: محتوى جنسي صريح
- spam: رسائل مكررة أو إعلانات
- safe: الرسالة آمنة

رد بـ JSON فقط بالشكل ده:
{"category":"safe","confidence":0.95,"reason":""}

لو مخالفة:
{"category":"harassment","confidence":0.85,"reason":"الرسالة تحتوي على تهديد مباشر"}

مهم: خد بالك إن بعض الكلام المصري/العربي العامي ممكن يبان قوي بس مش مخالف. فرق بين المزح والإهانة الحقيقية.`;

const SAFE_DEFAULT = { category: "safe", confidence: 0, reason: "moderation unavailable" };

async function moderateWithGemini(message: string) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("NO_GEMINI_KEY");

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [
          { role: "user", parts: [{ text: MODERATION_PROMPT }] },
          { role: "model", parts: [{ text: '{"category":"safe","confidence":1,"reason":""}' }] },
          { role: "user", parts: [{ text: `حلل الرسالة دي:\n"${message}"` }] },
        ],
        generationConfig: { temperature: 0.1, maxOutputTokens: 256 },
      }),
    }
  );

  if (!resp.ok) {
    console.error("Gemini moderation error:", resp.status);
    throw new Error(`GEMINI_${resp.status}`);
  }

  const data = await resp.json();
  const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";
  const jsonMatch = text.match(/\{[^}]+\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error("PARSE_FAIL");
}

async function moderateWithLovable(message: string) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("NO_LOVABLE_KEY");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash-lite",
      messages: [
        { role: "system", content: MODERATION_PROMPT },
        { role: "user", content: `حلل الرسالة دي:\n"${message}"` },
      ],
    }),
  });

  if (!resp.ok) {
    console.error("Lovable moderation error:", resp.status);
    throw new Error(`LOVABLE_${resp.status}`);
  }

  const data = await resp.json();
  const text = data?.choices?.[0]?.message?.content || "";
  const jsonMatch = text.match(/\{[^}]+\}/);
  if (jsonMatch) return JSON.parse(jsonMatch[0]);
  throw new Error("PARSE_FAIL");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { message } = await req.json();
    if (!message || typeof message !== "string") {
      return new Response(
        JSON.stringify({ error: "message string is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let result;
    try {
      result = await moderateWithGemini(message);
    } catch (err) {
      console.warn("Gemini moderation failed, trying Lovable fallback:", (err as Error).message);
      try {
        result = await moderateWithLovable(message);
      } catch (err2) {
        console.error("Both moderation providers failed:", (err2 as Error).message);
        result = SAFE_DEFAULT;
      }
    }

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e) {
    console.error("ai-moderate error:", e);
    return new Response(JSON.stringify(SAFE_DEFAULT), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
