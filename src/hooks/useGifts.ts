import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

// Gift tier thresholds (gold value of a single gift, after multiplier).
const TIER_BIG = 10000;        // Show global ticker across the app
const TIER_LEGENDARY = 100000; // Trigger full-screen cinematic explosion

export const useGifts = () => {
  const sendGift = async (
    senderId: string,
    receiverId: string,
    giftName: string,
    goldAmount: number,
    extras?: { giftEmoji?: string; imageUrl?: string | null; comboCount?: number; unitPrice?: number; roomId?: string | null }
  ) => {
    // Get conversion rate from system settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "gift_conversion_rate")
      .single();
    const rate = setting ? parseInt(setting.value) : 50;

    // Check sender balance
    const { data: sender } = await supabase
      .from("profiles")
      .select("coins, display_name")
      .eq("id", senderId)
      .single();
    if (!sender || sender.coins < goldAmount) {
      toast.error("رصيدك غير كافٍ!");
      return false;
    }

    const diamondAmount = Math.floor((goldAmount * rate) / 100);

    // Deduct from sender via secure RPC
    const { error: deductErr } = await supabase.rpc("deduct_coins_add_wealth", {
      _user_id: senderId,
      _coin_amount: goldAmount,
      _xp_amount: goldAmount,
    });
    if (deductErr) {
      toast.error("فشل في خصم الرصيد");
      return false;
    }

    // Add to receiver via secure RPC
    await supabase.rpc("add_diamonds_add_charisma", {
      _user_id: receiverId,
      _diamond_amount: diamondAmount,
      _xp_amount: diamondAmount,
    });

    // Log transaction
    await supabase.from("gift_transactions").insert({
      sender_id: senderId,
      receiver_id: receiverId,
      gift_name: giftName,
      gold_amount: goldAmount,
      diamond_amount: diamondAmount,
    });

    // Create notifications
    await supabase.from("notifications").insert({
      user_id: receiverId,
      title: "هدية جديدة! 🎁",
      message: `حصلت على ${giftName} بقيمة ${diamondAmount} ماسة!`,
      type: "gift",
    });

    // Track daily task: gift sent
    supabase.rpc("increment_daily_task", { _user_id: senderId, _task_type: "gift", _amount: 1 });

    // Log combo if multi-send (×10 / ×99 / ×520 / ×1314)
    if (extras?.comboCount && extras.comboCount > 1 && extras?.unitPrice) {
      supabase.from("gift_combos").insert({
        sender_id: senderId,
        receiver_id: receiverId,
        room_id: extras.roomId || null,
        gift_name: giftName,
        combo_count: extras.comboCount,
        unit_price: extras.unitPrice,
        total_gold: goldAmount,
      });
    }

    // Global broadcasts for big / legendary gifts (Soulmatch / Yalla style)
    if (goldAmount >= TIER_BIG) {
      const { data: receiver } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", receiverId)
        .single();
      const payload = {
        senderName: sender.display_name || "مستخدم",
        receiverName: receiver?.display_name || "مستخدم",
        giftName,
        giftEmoji: extras?.giftEmoji || "🎁",
        imageUrl: extras?.imageUrl || null,
        amount: goldAmount,
      };
      const tickerCh = supabase.channel("global-big-gifts");
      await tickerCh.subscribe();
      await tickerCh.send({ type: "broadcast", event: "global-big-gift", payload });
      setTimeout(() => supabase.removeChannel(tickerCh), 800);

      if (goldAmount >= TIER_LEGENDARY) {
        const legCh = supabase.channel("legendary-gifts");
        await legCh.subscribe();
        await legCh.send({ type: "broadcast", event: "legendary-gift", payload });
        setTimeout(() => supabase.removeChannel(legCh), 800);
      }
    }

    // No synthesized sounds or confetti — the gift's own media (video/Lottie) plays its sound.
    toast.success(`تم إرسال ${giftName}! 🎁`);
    return true;
  };

  return { sendGift };
};
