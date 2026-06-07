// Public Telegram webhook for Stars payments + bot updates.
// Handles:
//  - /start command → welcome message + inline keyboard
//  - callback_query → reply with feature explanation
//  - pre_checkout_query  → answer ok:true (required by Bot API)
//  - successful_payment  → credit coins/diamonds atomically
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GATEWAY = "https://connector-gateway.lovable.dev/telegram";
const MINI_APP_URL = "https://t.me/NovaVoiceChat_bot/NOVA";

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

function tgHeaders(lov: string, tg: string) {
  return {
    Authorization: `Bearer ${lov}`,
    "X-Connection-Api-Key": tg,
    "Content-Type": "application/json",
  };
}

async function tg(method: string, body: unknown, lov: string, tgKey: string) {
  try {
    await fetch(`${GATEWAY}/${method}`, {
      method: "POST",
      headers: tgHeaders(lov, tgKey),
      body: JSON.stringify(body),
    });
  } catch (e) {
    console.error(`[tg ${method}]`, e);
  }
}

const WELCOME_TEXT =
  "مرحباً بك في NOVA! 🚀 عالمك الخاص للدردشة الصوتية والألعاب التنافسية. 💎";

const MAIN_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🎙️ غرف الدردشة الصوتية", callback_data: "info_rooms" }],
    [{ text: "🎮 الألعاب والتحديات", callback_data: "info_games" }],
    [{ text: "💰 الشحن ونظام الجوائز", callback_data: "info_topup" }],
    [{ text: "🚀 دخول تطبيق NOVA", url: MINI_APP_URL }],
  ],
};

const INFO_TEXTS: Record<string, string> = {
  info_rooms:
    "🎙️ غرف الدردشة الصوتية\n\nانضم إلى غرف صوتية حية مع آلاف المستخدمين، أنشئ غرفتك الخاصة، اصعد على المايك، أرسل الهدايا، وكوّن صداقات جديدة. كل غرفة لها مواضيعها وثيماتها الفريدة. 🎧✨",
  info_games:
    "🎮 الألعاب والتحديات\n\nالعب في مركز الألعاب: الروليت، الأسد والنمر، وصندوق الحظ. راهن بـ NOVA Coins واربح المزيد، تنافس على لوحة المتصدرين، واحصل على جوائز يومية. 🏆🎲",
  info_topup:
    "💰 الشحن ونظام الجوائز\n\nاحصل على NOVA Coins بعدة طرق:\n• 💳 Binance Pay\n• ⭐ Telegram Stars (داخل التطبيق مباشرة)\n• 🧑‍💼 وكلاء الشحن المعتمدين\n\nاستخدم الكوينز لإرسال الهدايا، شراء VIP، والمراهنة في الألعاب. كل هدية تتحول إلى ماسات زرقاء للمستلم! 💎",
};

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
    // /start command
    const msg = update.message;
    if (msg?.text && typeof msg.text === "string" && msg.chat?.id) {
      const text = msg.text.trim();
      if (text === "/start" || text.startsWith("/start ")) {
        await tg("sendMessage", {
          chat_id: msg.chat.id,
          text: WELCOME_TEXT,
          reply_markup: MAIN_KEYBOARD,
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
        return new Response("ok");
      }
    }

    // Inline keyboard button click
    const cq = update.callback_query;
    if (cq?.id) {
      const data = String(cq.data ?? "");
      const reply = INFO_TEXTS[data];
      await tg("answerCallbackQuery", { callback_query_id: cq.id }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      if (reply && cq.message?.chat?.id) {
        await tg("sendMessage", {
          chat_id: cq.message.chat.id,
          text: reply,
          reply_markup: {
            inline_keyboard: [[{ text: "🚀 دخول تطبيق NOVA", url: MINI_APP_URL }]],
          },
        }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
      }
      return new Response("ok");
    }

    // 1) pre-checkout — must answer within 10s
    if (update.pre_checkout_query) {
      await tg("answerPreCheckoutQuery", {
        pre_checkout_query_id: update.pre_checkout_query.id,
        ok: true,
      }, LOVABLE_API_KEY, TELEGRAM_API_KEY);
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
