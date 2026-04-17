import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { playGiftSound, triggerConfetti } from "@/lib/effects";

export const useGifts = () => {
  const sendGift = async (
    senderId: string,
    receiverId: string,
    giftName: string,
    goldAmount: number
  ) => {
    // Get conversion rate from system settings
    const { data: setting } = await supabase
      .from("system_settings")
      .select("value")
      .eq("key", "gift_conversion_rate")
      .single();
    const rate = setting ? parseInt(setting.value) : 50;

    // Check sender balance
    const { data: sender } = await supabase.from("profiles").select("coins").eq("id", senderId).single();
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

    playGiftSound();
    if (goldAmount >= 1000) triggerConfetti();
    toast.success(`تم إرسال ${giftName}! 🎁`);
    return true;
  };

  return { sendGift };
};
