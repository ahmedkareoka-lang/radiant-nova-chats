import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const SYSTEM_PROMPT = `أنت NOVA AI ✨ — المساعد الذكي الاجتماعي داخل تطبيق NOVA للدردشة الصوتية.

شخصيتك:
- ودود، مرح، وداعم — مثل صديق مقرب عنده نصائح ممتازة
- بتتكلم عربي (مصري/خليجي) وإنجليزي بطلاقة — طابق لغة المستخدم
- استخدم إيموجي بشكل طبيعي بس متكترش
- ردودك مختصرة ومفيدة (2-4 جمل إلا لو المستخدم طلب تفصيل)
- لو حد سألك بالمصري رد بالمصري، لو بالفصحى رد بالفصحى

معرفتك بالتطبيق:
- NOVA تطبيق دردشة صوتية اجتماعي فيه غرف، هدايا، مستويات VIP، وكالات، واقتصاد غني
- المستخدمين يقدرون يرسلوا هدايا (بعملات NOVA) ويستقبلوا ماسات زرقاء ويدخلوا غرف صوتية ويطوروا مستواهم
- نظام VIP بـ 7 مستويات يفتح إطارات خاصة وشارات وتأثيرات دخول ومزايا غرف
- الوكالات بتدير المضيفين اللي بيبثوا في الغرف الصوتية
- نظام BOSS بيدي صلاحيات أدمن خاصة لكبار المستخدمين
- العملات: NOVA Coins (للشراء) و Blue Diamonds (للاستقبال) — نسبة التحويل 50%
- الهدايا الأسطورية بتظهر بتأثيرات ملء الشاشة
- Nova Pass نظام مكافآت شهري (مسار مجاني + بريميوم)

تقدر تساعد في:
- شرح مزايا التطبيق (VIP، الهدايا، الغرف، الوكالات، الاقتصاد)
- نصائح اجتماعية (إزاي تكبر متابعينك، تتفاعل في الغرف)
- اقتراح هدايا مناسبة حسب المناسبة أو المحادثة
- محادثة عامة وترفيه
- الإجابة على أي سؤال عن التطبيق

قواعد مهمة:
- ما تشاركش تفاصيل تقنية أو معلومات قاعدة البيانات
- لو مش متأكد من إجابة، قول كده بصراحة
- شجع المستخدمين يستكشفوا مزايا التطبيق

لو المستخدم سألك "اقترح هدية" أو "أهدي إيه"، اقترح من الهدايا دي حسب المناسبة:
- للترحيب: Rose 🌹 (رخيصة)، Teddy Bear 🧸
- للحب: Heart Crown 💕، Love Letter 💌
- للاحتفال: Fireworks 🎆، Trophy 🏆
- للدعم: Star ⭐، Diamond Ring 💎
- للأسطوري: Castle 🏰، Yacht 🛥️، Private Jet ✈️`;

async function streamGemini(messages: Array<{role: string; content: string}>) {
  const apiKey = Deno.env.get("GEMINI_API_KEY");
  if (!apiKey) throw new Error("GEMINI_API_KEY not configured");

  const contents = [
    { role: "user", parts: [{ text: SYSTEM_PROMPT }] },
    { role: "model", parts: [{ text: "تمام! أنا NOVA AI ✨ جاهز أساعدك!" }] },
    ...messages.map(m => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    })),
  ];

  const resp = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:streamGenerateContent?alt=sse&key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.8,
          topP: 0.95,
          maxOutputTokens: 1024,
        },
        safetySettings: [
          { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
          { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        ],
      }),
    }
  );

  if (!resp.ok) {
    const t = await resp.text();
    console.error("Gemini error:", resp.status, t);
    throw new Error(`Gemini ${resp.status}`);
  }

  // Transform Gemini SSE → OpenAI-compatible SSE
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
          try {
            const parsed = JSON.parse(line.slice(6));
            const text = parsed?.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              await writer.write(encoder.encode(
                `data: ${JSON.stringify({ choices: [{ delta: { content: text }, index: 0 }] })}\n\n`
              ));
            }
          } catch { /* partial JSON, skip */ }
        }
      }
      await writer.write(encoder.encode("data: [DONE]\n\n"));
    } catch (e) {
      console.error("Stream error:", e);
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
    const { messages, mode } = await req.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Gift suggestion mode
    if (mode === "suggest-gift") {
      const giftPrompt = [
        ...messages.slice(-5),
        { role: "user", content: "بناءً على المحادثة السابقة، اقترح 3 هدايا مناسبة من هدايا NOVA مع السبب. رد بشكل مختصر." }
      ];
      const stream = await streamGemini(giftPrompt);
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    // Welcome message mode
    if (mode === "welcome") {
      const userName = messages[0]?.content || "صديق";
      const welcomeMessages = [
        { role: "user", content: `رحب بالمستخدم "${userName}" اللي لسه دخل غرفة صوتية في NOVA. اكتب رسالة ترحيب قصيرة ومرحة (جملة أو اثنتين بالعربي) تشجعه يتفاعل.` }
      ];
      const stream = await streamGemini(welcomeMessages);
      return new Response(stream, {
        headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
      });
    }

    const stream = await streamGemini(messages.slice(-20));
    return new Response(stream, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("ai-chat error:", e);
    // Friendly retry response instead of hardcoded messages
    const friendlyReply = {
      choices: [{ delta: { content: "عذرًا، واجهت مشكلة بسيطة 😅 جرب تاني كمان شوية وهرد عليك فورًا! ✨" } }],
    };
    const body = `data: ${JSON.stringify(friendlyReply)}\n\ndata: [DONE]\n\n`;
    return new Response(body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  }
});
