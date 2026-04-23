import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `You are NOVA AI ✨ — the smart, friendly, and stylish AI assistant inside the NOVA social voice-chat app.

Your personality:
- Warm, playful, and supportive — like a best friend who always has great advice
- You speak Arabic and English fluently; match the user's language
- Use emojis naturally but don't overdo it
- Keep answers concise and helpful (2-4 sentences unless the user wants detail)

Your knowledge:
- NOVA is a social voice-chat app with rooms, gifts, VIP levels, agencies, and a rich economy
- Users can send gifts (costs NOVA Coins), receive Blue Diamonds, join voice rooms, and level up
- VIP tiers unlock special frames, badges, entrance effects, and room perks
- Agencies manage hosts who broadcast in voice rooms
- The BOSS system gives special admin powers to top users

You can help with:
- Explaining app features (VIP, gifts, rooms, agencies, economy)
- Social advice (how to grow followers, engage in rooms)
- General conversation and entertainment
- Answering questions about the app

Never share technical details, database info, or internal implementation details.`;

async function callGeminiDirect(messages: Array<{role: string; content: string}>) {
  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) throw new Error("GEMINI_API_KEY is not configured");

  const geminiMessages = messages.map(m => ({
    role: m.role === "assistant" ? "model" : "user",
    parts: [{ text: m.content }],
  }));

  // Prepend system instruction as first user+model exchange
  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "Understood! I'm NOVA AI ✨, ready to help!" }] },
    ...geminiMessages,
  ];

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${GEMINI_API_KEY}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ contents }),
    }
  );

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Gemini direct error:", resp.status, t);
    throw new Error(`Gemini API error: ${resp.status}`);
  }

  // Transform Gemini SSE to OpenAI-compatible SSE
  const { readable, writable } = new TransformStream();
  const writer = writable.getWriter();
  const encoder = new TextEncoder();

  (async () => {
    try {
      const reader = resp.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);

          if (!line.startsWith("data: ")) continue;
          const jsonStr = line.slice(6);
          try {
            const parsed = JSON.parse(jsonStr);
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              // Write as OpenAI-compatible SSE
              const chunk = {
                choices: [{ delta: { content: text }, index: 0 }],
              };
              await writer.write(encoder.encode(`data: ${JSON.stringify(chunk)}\n\n`));
            }
          } catch { /* skip partial */ }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Stream transform error:", e);
    } finally {
      writer.close();
    }
  })();

  return readable;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Try Lovable AI Gateway first
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (LOVABLE_API_KEY) {
      const response = await fetch(
        "https://ai.gateway.lovable.dev/v1/chat/completions",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${LOVABLE_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: "google/gemini-2.5-flash",
            messages: [
              { role: "system", content: SYSTEM_PROMPT },
              ...messages.slice(-20),
            ],
            stream: true,
          }),
        }
      );

      if (response.ok) {
        return new Response(response.body, {
          headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
        });
      }

      // If 402/429, fall through to Gemini direct
      const errText = await response.text();
      console.warn(`Gateway returned ${response.status}, falling back to Gemini direct. Body: ${errText}`);
    }

    // Fallback: call Gemini API directly with user's key
    console.log("Using Gemini API directly (fallback)");
    const stream = await callGeminiDirect(messages.slice(-20));

    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    return new Response(
      JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
