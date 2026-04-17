import { useState, useEffect } from "react";
import { useGifts } from "@/hooks/useGifts";
import CurrencyIcon from "@/components/CurrencyIcon";
import { Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

const FALLBACK_GIFTS = [
  { emoji: "🌹", name: "وردة", price: 10 },
  { emoji: "❤️", name: "قلب", price: 20 },
  { emoji: "🎁", name: "هدية", price: 50 },
  { emoji: "💎", name: "جوهرة", price: 100 },
  { emoji: "🔥", name: "نار", price: 200 },
  { emoji: "🚗", name: "سيارة", price: 500 },
  { emoji: "👑", name: "تاج", price: 1000 },
  { emoji: "🏰", name: "قصر", price: 5000 },
];

const MULTIPLIERS = [1, 10, 50, 77, 100];

interface RoomMemberInfo {
  user_id: string;
  display_name: string;
  avatar_url: string | null;
}

interface GiftItem {
  emoji?: string;
  name: string;
  price: number;
  image_url?: string | null;
}

interface GiftAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  senderId?: string | null;
  receiverId?: string | null;
  receiverName?: string;
  roomMembers?: RoomMemberInfo[];
  onMultiGiftSent?: (emoji: string, count: number) => void;
  roomId?: string;
}

const GiftAnimation = ({ isOpen, onClose, senderId, receiverId, receiverName, roomMembers, onMultiGiftSent, roomId }: GiftAnimationProps) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [showMulti, setShowMulti] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [balance, setBalance] = useState(0);
  const [gifts, setGifts] = useState<GiftItem[]>(FALLBACK_GIFTS);
  const { sendGift } = useGifts();

  useEffect(() => {
    const fetchGifts = async () => {
      const { data } = await supabase.from("gifts").select("*").order("price", { ascending: true });
      if (data && data.length > 0) {
        setGifts(data.map(g => ({
          name: g.name,
          price: Number(g.price),
          image_url: g.image_url,
          emoji: g.image_url ? undefined : "🎁",
        })));
      }
    };
    fetchGifts();
    // Realtime updates for gifts catalog
    const channel = supabase
      .channel("gifts-catalog-live")
      .on("postgres_changes", { event: "*", schema: "public", table: "gifts" }, () => fetchGifts())
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, []);

  useEffect(() => {
    if (!senderId || !isOpen) return;
    const fetchBalance = async () => {
      const { data } = await supabase.from("profiles").select("coins").eq("id", senderId).single();
      if (data) setBalance(data.coins);
    };
    fetchBalance();
  }, [senderId, isOpen]);

  if (!isOpen) return null;

  const isMultiMode = showMulti && roomMembers && roomMembers.length > 0;
  const availableMembers = roomMembers?.filter(m => m.user_id !== senderId) || [];

  const toggleRecipient = (userId: string) => {
    setSelectedRecipients(prev => {
      const next = new Set(prev);
      if (next.has(userId)) next.delete(userId);
      else next.add(userId);
      return next;
    });
  };

  const selectAll = () => {
    if (selectedRecipients.size === availableMembers.length) {
      setSelectedRecipients(new Set());
    } else {
      setSelectedRecipients(new Set(availableMembers.map(m => m.user_id)));
    }
  };

  const recipientCount = isMultiMode ? Math.max(selectedRecipients.size, 1) : 1;
  const totalCost = selectedGift !== null ? gifts[selectedGift].price * multiplier * recipientCount : 0;

  // Broadcast gift to all room members via Realtime (use a stable shared channel)
  const broadcastGift = async (giftEmoji: string, giftName: string, senderName: string, amount: number, recipientName?: string, imageUrl?: string | null) => {
    if (!roomId) return;
    const channel = supabase.channel(`room-gifts-${roomId}`);
    await channel.subscribe();
    await channel.send({
      type: "broadcast",
      event: "gift-sent",
      payload: {
        emoji: giftEmoji,
        giftName,
        imageUrl: imageUrl || null,
        senderName,
        recipientName: recipientName || receiverName || "",
        amount,
        timestamp: Date.now(),
      },
    });

    // Big gift announcement (over 1000 coins)
    if (amount >= 1000) {
      const announceChannel = supabase.channel(`gift-announce-${roomId}`);
      await announceChannel.subscribe();
      await announceChannel.send({
        type: "broadcast",
        event: "big-gift",
        payload: {
          senderName,
          receiverName: recipientName || receiverName || "مستخدم",
          giftName,
          giftEmoji,
          imageUrl: imageUrl || null,
          amount,
        },
      });
      setTimeout(() => supabase.removeChannel(announceChannel), 1000);
    }

    setTimeout(() => supabase.removeChannel(channel), 1000);
  };

  const handleSend = async () => {
    if (selectedGift === null) return;
    setSending(true);
    const gift = gifts[selectedGift];
    const giftCost = gift.price * multiplier;
    const giftEmoji = gift.emoji || "🎁";
    const giftImageUrl = gift.image_url || null;

    // Get sender name for broadcast
    let senderName = "مستخدم";
    if (senderId) {
      const { data: senderProfile } = await supabase.from("profiles").select("display_name").eq("id", senderId).single();
      if (senderProfile) senderName = senderProfile.display_name;
    }

    if (isMultiMode && selectedRecipients.size > 0) {
      let allSuccess = true;
      for (const rid of selectedRecipients) {
        const success = await sendGift(senderId!, rid, gift.name, giftCost);
        if (!success) { allSuccess = false; break; }
      }
      if (allSuccess) {
        setBurst(true);
        onMultiGiftSent?.(giftEmoji, selectedRecipients.size * multiplier);
        broadcastGift(giftEmoji, gift.name, senderName, giftCost * selectedRecipients.size, undefined, giftImageUrl);
        setTimeout(() => { setBurst(false); setSelectedGift(null); setSending(false); setSelectedRecipients(new Set()); setShowMulti(false); setMultiplier(1); onClose(); }, 800);
      } else { setSending(false); }
    } else if (receiverId) {
      const success = await sendGift(senderId!, receiverId, gift.name, giftCost);
      if (success) {
        setBurst(true);
        onMultiGiftSent?.(giftEmoji, multiplier);
        broadcastGift(giftEmoji, gift.name, senderName, giftCost, receiverName, giftImageUrl);
        setTimeout(() => { setBurst(false); setSelectedGift(null); setSending(false); setMultiplier(1); onClose(); }, 800);
      } else { setSending(false); }
    }
  };

  const canSend = selectedGift !== null && (isMultiMode ? selectedRecipients.size > 0 : !!receiverId);

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center" onClick={onClose}>
      {burst && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span className="text-8xl animate-gift-burst">{selectedGift !== null ? (gifts[selectedGift].emoji || "🎁") : "🎁"}</span>
        </div>
      )}
      <div className="w-full max-w-lg bg-card/95 backdrop-blur-xl rounded-t-3xl border-t border-border p-4 pb-8" onClick={(e) => e.stopPropagation()}>
        <div className="w-10 h-1 bg-muted-foreground/30 rounded-full mx-auto mb-4" />
        <h3 className="text-center font-bold text-lg mb-1 glow-neon-text">🎁 الهدايا</h3>

        {availableMembers.length > 0 && (
          <div className="flex items-center justify-center gap-2 mb-2">
            {receiverName && !showMulti && (
              <p className="text-xs text-muted-foreground">إرسال إلى: <span className="text-primary font-bold">{receiverName}</span></p>
            )}
            <button onClick={() => setShowMulti(!showMulti)}
              className={`text-[10px] px-3 py-1 rounded-full font-bold transition-all ${showMulti ? 'gradient-neon text-primary-foreground' : 'bg-secondary text-muted-foreground'}`}>
              {showMulti ? '✓ إرسال جماعي' : '👥 إرسال جماعي'}
            </button>
          </div>
        )}

        {isMultiMode && (
          <div className="mb-3">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] text-muted-foreground">اختر المستلمين ({selectedRecipients.size})</span>
              <button onClick={selectAll} className="text-[10px] text-primary font-bold flex items-center gap-1">
                <CheckCheck className="w-3 h-3" />
                {selectedRecipients.size === availableMembers.length ? 'إلغاء الكل' : 'تحديد الكل'}
              </button>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-thin">
              {availableMembers.map(m => (
                <button key={m.user_id} onClick={() => toggleRecipient(m.user_id)}
                  className={`flex flex-col items-center gap-1 p-2 rounded-xl min-w-[56px] transition-all ${
                    selectedRecipients.has(m.user_id) ? 'bg-primary/20 border border-primary' : 'bg-secondary'
                  }`}>
                  <div className="relative">
                    <img src={m.avatar_url || 'https://i.pravatar.cc/100'} className="w-8 h-8 rounded-full object-cover" alt="" />
                    {selectedRecipients.has(m.user_id) && (
                      <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary flex items-center justify-center">
                        <Check className="w-2.5 h-2.5 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                  <span className="text-[9px] truncate max-w-[48px]">{m.display_name}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Gift grid */}
        <div className="grid grid-cols-4 gap-3 mb-3 max-h-48 overflow-auto">
          {gifts.map((gift, i) => (
            <button key={i} onClick={() => setSelectedGift(i)}
              className={`flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                selectedGift === i ? "bg-primary/20 border border-primary glow-neon scale-105" : "bg-secondary hover:bg-secondary/80"
              }`}>
              {gift.image_url ? (
                <img src={gift.image_url} alt={gift.name} className="w-8 h-8 object-contain" />
              ) : (
                <span className="text-2xl">{gift.emoji}</span>
              )}
              <span className="text-[9px] text-muted-foreground truncate max-w-full">{gift.name}</span>
              <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                <CurrencyIcon type="gold" size="xs" />{gift.price}
              </span>
            </button>
          ))}
        </div>

        {/* Multiplier */}
        <div className="mb-3">
          <p className="text-[10px] text-muted-foreground mb-1.5">العدد</p>
          <div className="flex gap-1.5">
            {MULTIPLIERS.map(m => (
              <button key={m} onClick={() => setMultiplier(m)}
                className={`flex-1 py-2 rounded-xl text-xs font-bold transition-all ${
                  multiplier === m ? "gradient-neon text-primary-foreground" : "bg-secondary text-muted-foreground"
                }`}>
                x{m}
              </button>
            ))}
          </div>
        </div>

        {/* Balance & Total */}
        <div className="flex items-center justify-between mb-3 px-1">
          <p className="text-[10px] text-muted-foreground flex items-center gap-1">
            الرصيد: <CurrencyIcon type="gold" size="xs" /> <span className="font-bold text-foreground">{balance.toLocaleString()}</span>
          </p>
          {selectedGift !== null && (
            <p className="text-xs text-accent font-bold flex items-center gap-1">
              الإجمالي: <CurrencyIcon type="gold" size="xs" /> {totalCost.toLocaleString()}
            </p>
          )}
        </div>

        <button onClick={handleSend} disabled={!canSend || sending || totalCost > balance}
          className="w-full py-3 rounded-full gradient-neon font-bold text-primary-foreground disabled:opacity-40 btn-nova glow-neon">
          {sending ? "جارٍ الإرسال..." : totalCost > balance ? "رصيد غير كافٍ" : !canSend ? "اختر شخصاً وهدية" : isMultiMode ? `إرسال لـ ${selectedRecipients.size} أشخاص (x${multiplier})` : `إرسال الهدية (x${multiplier})`}
        </button>
      </div>
    </div>
  );
};

export default GiftAnimation;
