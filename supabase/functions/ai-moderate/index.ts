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

    const apiKey = Deno.env.get("GEMINI_API_KEY");
    if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

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
      console.error("Moderation API error:", resp.status);
      return new Response(
        JSON.stringify({ category: "safe", confidence: 0, reason: "moderation unavailable" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const data = await resp.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text || "";

    // Extract JSON from response
    const jsonMatch = text.match(/\{[^}]+\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({ category: "safe", confidence: 0.5, reason: "could not parse" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (e) {
    console.error("ai-moderate error:", e);
    return new Response(
      JSON.stringify({ category: "safe", confidence: 0, reason: "error" }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
