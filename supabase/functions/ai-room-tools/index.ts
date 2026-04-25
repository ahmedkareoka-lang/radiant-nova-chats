import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.0";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SUMMARY_PROMPT = `أنت مساعد ذكي داخل غرفة دردشة صوتية اسمها NOVA. هتاخد آخر رسائل الشات وتعمل ملخص قصير ومفيد (3-5 أسطر بالعامية المصرية).
- ركّز على الموضوعات الرئيسية اللي اتقالت
- اذكر مين كان بيتكلم لو في حد بارز
- لو الرسائل قليلة أو مش واضحة، قول كده بصراحة
- متستخدمش أكواد أو JSON، رد بنص عادي بس`;

const TRANSLATE_PROMPT = `أنت مترجم فوري في غرفة دردشة. مهمتك:
1. اكتشاف لغة النص المُرسَل (لو عربي خالص، رد بكلمة واحدة بس: SAME).
2. لو لغة تانية (إنجليزي، فرنسي، تركي، هندي، إلخ)، ترجم النص للعربية الفصحى البسيطة.
3. رد بالترجمة فقط، بدون مقدمات أو شروحات.`;

async function callLovableAI(messages: { role: string; content: string }[], maxTokens = 400) {
  const apiKey = Deno.env.get("LOVABLE_API_KEY");
  if (!apiKey) throw new Error("LOVABLE_API_KEY not configured");

  const resp = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "google/gemini-2.5-flash",
      messages,
      max_tokens: maxTokens,
      temperature: 0.4,
    }),
  });

  if (resp.status === 429) {
    const err: any = new Error("Rate limited");
    err.status = 429;
    throw err;
  }
  if (resp.status === 402) {
    const err: any = new Error("Out of credits");
    err.status = 402;
    throw err;
  }
  if (!resp.ok) {
    const t = await resp.text();
    console.error("AI gateway error:", resp.status, t);
    throw new Error(`AI_${resp.status}`);
  }

  const data = await resp.json();
  return (data?.choices?.[0]?.message?.content || "").trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // ── Auth check: require valid Supabase JWT ──
  const authHeader = req.headers.get("Authorization");
  if (!authHeader?.startsWith("Bearer ")) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_ANON_KEY")!,
      { global: { headers: { Authorization: authHeader } } }
    );
    const token = authHeader.replace("Bearer ", "");
    const { data: userData, error: claimsError } = await supabase.auth.getUser(token);
    if (claimsError || !userData?.user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }
  } catch {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();
    const mode = body?.mode as "summarize" | "translate" | undefined;

    if (mode === "summarize") {
      const transcript = (body?.transcript || "").toString().slice(0, 6000);
      if (!transcript.trim()) {
        return new Response(JSON.stringify({ summary: "مفيش رسائل كافية في الشات لتلخيصها." }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const summary = await callLovableAI(
        [
          { role: "system", content: SUMMARY_PROMPT },
          { role: "user", content: `لخّصلي المحادثة دي:\n\n${transcript}` },
        ],
        500
      );
      return new Response(JSON.stringify({ summary }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (mode === "translate") {
      const text = (body?.text || "").toString().slice(0, 1000);
      if (!text.trim()) {
        return new Response(JSON.stringify({ translation: null, same: true }), {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const result = await callLovableAI(
        [
          { role: "system", content: TRANSLATE_PROMPT },
          { role: "user", content: text },
        ],
        300
      );
      const same = result.trim().toUpperCase() === "SAME";
      return new Response(
        JSON.stringify({ translation: same ? null : result, same }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    return new Response(JSON.stringify({ error: "Invalid mode. Use 'summarize' or 'translate'." }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (e: any) {
    console.error("ai-room-tools error:", e);
    const status = e?.status === 429 ? 429 : e?.status === 402 ? 402 : 500;
    const msg =
      status === 429
        ? "النظام مشغول، جرّب بعد شوية."
        : status === 402
        ? "الرصيد خلص. كلّم الإدارة لإضافة كريديت."
        : "حصلت مشكلة، حاول تاني.";
    return new Response(JSON.stringify({ error: msg }), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
