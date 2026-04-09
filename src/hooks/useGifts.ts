import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

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
    const { data: sender } = await supabase.from("profiles").select("coins, wealth_xp, wealth_level").eq("id", senderId).single();
    if (!sender || sender.coins < goldAmount) {
      toast.error("رصيدك غير كافٍ!");
      return false;
    }

    const diamondAmount = Math.floor((goldAmount * rate) / 100);

    // Deduct from sender
    await supabase.from("profiles").update({
      coins: sender.coins - goldAmount,
      wealth_xp: (sender.wealth_xp || 0) + goldAmount,
      wealth_level: Math.floor(((sender.wealth_xp || 0) + goldAmount) / 10000) + 1,
    }).eq("id", senderId);

    // Add to receiver
    const { data: receiver } = await supabase.from("profiles").select("diamonds, charisma_xp, charisma_level").eq("id", receiverId).single();
    if (receiver) {
      await supabase.from("profiles").update({
        diamonds: (receiver.diamonds || 0) + diamondAmount,
        charisma_xp: (receiver.charisma_xp || 0) + diamondAmount,
        charisma_level: Math.floor(((receiver.charisma_xp || 0) + diamondAmount) / 10000) + 1,
      }).eq("id", receiverId);
    }

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

    toast.success(`تم إرسال ${giftName}! 🎁`);
    return true;
  };

  return { sendGift };
};
