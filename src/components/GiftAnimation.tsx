import { useState, useEffect, useRef, useMemo, memo } from "react";
import { toast } from "sonner";
import { useGifts } from "@/hooks/useGifts";
import CurrencyIcon from "@/components/CurrencyIcon";
import { Check, CheckCheck } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { logAgora } from "@/lib/agoraDebugLog";
import { useCatalogStore } from "@/stores/catalogStore";
import { useProfileStore } from "@/stores/profileStore";



const MULTIPLIERS = [1, 10, 99, 520, 1314];

const getComboEffect = (mult: number) => {
  if (mult >= 1314) return { label: "💖 LEGENDARY", glow: "0 0 60px hsl(330 100% 60%)", scale: "scale-110" };
  if (mult >= 520) return { label: "❤️ EPIC", glow: "0 0 40px hsl(0 90% 55%)", scale: "scale-105" };
  if (mult >= 99) return { label: "🔥 RARE", glow: "0 0 25px hsl(30 90% 55%)", scale: "" };
  if (mult >= 10) return { label: "✨ COMBO", glow: "0 0 15px hsl(45 90% 55%)", scale: "" };
  return null;
};

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
  lottie_url?: string | null;
  video_url?: string | null;
  tier?: string;
  duration_ms?: number;
  category?: string;
  created_at?: string;
}

const GIFT_TABS: { id: string; label: string; locked?: boolean }[] = [
  { id: "general", label: "عام" },
  { id: "latest", label: "أحدث" },
  { id: "gallery", label: "هدايا المعرض" },
  { id: "lucky", label: "محظوظ" },
  { id: "lover", label: "حبيبي" },
  { id: "locked", label: "🔒", locked: true },
];

interface GiftBroadcastPayload {
  emoji: string;
  giftName: string;
  imageUrl: string | null;
  lottieUrl: string | null;
  videoUrl: string | null;
  durationMs?: number;
  senderName: string;
  recipientName: string;
  amount: number;
  timestamp: number;
}

interface GiftAnimationProps {
  isOpen: boolean;
  onClose: () => void;
  senderId?: string | null;
  receiverId?: string | null;
  receiverName?: string;
  roomMembers?: RoomMemberInfo[];
  onMultiGiftSent?: (emoji: string, count: number, imageUrl?: string | null) => void;
  /**
   * Broadcasts a gift to ALL users currently in the room (sender included).
   * Provided by the parent (e.g. VoiceRoom) via a persistent channel — this
   * guarantees the gift reaches every viewer, even if the modal closes
   * immediately after sending.
   */
  broadcastGift?: (payload: GiftBroadcastPayload) => Promise<void> | void;
  roomId?: string;
}

const GiftAnimation = memo(({ isOpen, onClose, senderId, receiverId, receiverName, roomMembers, onMultiGiftSent, broadcastGift, roomId }: GiftAnimationProps) => {
  const [selectedGift, setSelectedGift] = useState<number | null>(null);
  const [burst, setBurst] = useState(false);
  const [sending, setSending] = useState(false);
  const [selectedRecipients, setSelectedRecipients] = useState<Set<string>>(new Set());
  const [showMulti, setShowMulti] = useState(false);
  const [multiplier, setMultiplier] = useState(1);
  const [activeTab, setActiveTab] = useState<string>("general");
  const { sendGift } = useGifts();

  // 🚀 Read gifts from cached Zustand store (instant — no network wait)
  const cachedGifts = useCatalogStore((s) => s.gifts);
  const fetchGifts = useCatalogStore((s) => s.fetchGifts);

  // Adapt cached gifts to local GiftItem shape (memoized — no re-compute on every render)
  const gifts: GiftItem[] = useMemo(
    () =>
      cachedGifts.map((g) => ({
        name: g.name,
        price: g.price,
        image_url: g.image_url,
        lottie_url: g.lottie_url,
        video_url: g.video_url,
        tier: g.tier,
        duration_ms: g.duration_ms || undefined,
        category: g.category,
        created_at: g.created_at,
        emoji: g.image_url || g.lottie_url || g.video_url ? undefined : "🎁",
      })),
    [cachedGifts],
  );

  // Ensure catalog is hydrated (instant if persisted)
  useEffect(() => {
    if (cachedGifts.length === 0) fetchGifts();
  }, [cachedGifts.length, fetchGifts]);

  // 🚀 Read balance from profile store (instant) — sync to local state for UX
  const cachedProfile = useProfileStore((s) => s.profile);
  const balance = cachedProfile?.coins ?? 0;

  // Cache sender display name so handleSend doesn't have to await a profile fetch.
  const cachedSenderNameRef = useRef<string>("مستخدم");

  useEffect(() => {
    if (cachedProfile?.display_name) {
      cachedSenderNameRef.current = cachedProfile.display_name;
    }
  }, [cachedProfile?.display_name]);

  useEffect(() => {
    if (!senderId || !isOpen) return;
    // Background SWR refresh — keeps balance fresh without blocking UI
    useProfileStore.getState().fetchProfile(senderId);
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

  // Big-gift announcement (room ticker for amounts ≥ 1000) — kept separate from
  // the main gift broadcast which is now driven by the parent's persistent channel.
  const sendBigGiftAnnounce = async (
    giftEmoji: string,
    giftName: string,
    senderName: string,
    amount: number,
    recipientName: string,
    imageUrl: string | null,
  ) => {
    if (!roomId || amount < 1000) return;
    const announceChannel = supabase.channel(`gift-announce-${roomId}`);
    await announceChannel.subscribe();
    await announceChannel.send({
      type: "broadcast",
      event: "big-gift",
      payload: { senderName, receiverName: recipientName, giftName, giftEmoji, imageUrl, amount },
    });
    setTimeout(() => supabase.removeChannel(announceChannel), 1500);
  };

  const handleSend = async () => {
    if (selectedGift === null) return;
    setSending(true);
    const gift = gifts[selectedGift];
    const giftCost = gift.price * multiplier;
    const giftEmoji = gift.emoji || "🎁";
    const giftImageUrl = gift.image_url || null;
    const giftLottieUrl = gift.lottie_url || null;
    const giftVideoUrl = gift.video_url || null;
    const giftDurationMs = gift.duration_ms || undefined;

    // Use cached sender name immediately (avoid blocking on profile fetch).
    const senderName = cachedSenderNameRef.current || "مستخدم";

    // Optimistic balance check first (non-blocking UX)
    const totalNeeded = giftCost * (isMultiMode ? Math.max(selectedRecipients.size, 1) : 1);
    if (balance > 0 && balance < totalNeeded) {
      toast.error("رصيدك غير كافٍ!");
      setSending(false);
      return;
    }

    if (isMultiMode && selectedRecipients.size > 0) {
      const totalAmount = giftCost * selectedRecipients.size;
      const recipientLabel = `${selectedRecipients.size} أشخاص`;
      // Single broadcast through the parent's persistent room channel —
      // every user in the room (sender included) receives this and renders
      // the fullscreen gift via the listener in VoiceRoom.
      logAgora("info", "Gift", `→ broadcasting multi gift '${gift.name}' x${totalAmount}`, { recipients: selectedRecipients.size });
      await broadcastGift?.({
        emoji: giftEmoji,
        giftName: gift.name,
        imageUrl: giftImageUrl,
        lottieUrl: giftLottieUrl,
        videoUrl: giftVideoUrl,
        durationMs: giftDurationMs,
        senderName,
        recipientName: recipientLabel,
        amount: totalAmount,
        timestamp: Date.now(),
      });
      sendBigGiftAnnounce(giftEmoji, gift.name, senderName, totalAmount, recipientLabel, giftImageUrl);
      onMultiGiftSent?.(giftEmoji, selectedRecipients.size * multiplier, giftImageUrl);
      setBurst(false); setSelectedGift(null); setSending(false); setSelectedRecipients(new Set()); setShowMulti(false); setMultiplier(1);
      onClose();
      (async () => {
        for (const rid of selectedRecipients) {
          await sendGift(senderId!, rid, gift.name, giftCost, { giftEmoji, imageUrl: giftImageUrl });
        }
      })();
    } else if (receiverId) {
      const recipientLabel = receiverName || "مستخدم";
      logAgora("info", "Gift", `→ broadcasting gift '${gift.name}' x${giftCost}`, { recipient: recipientLabel });
      await broadcastGift?.({
        emoji: giftEmoji,
        giftName: gift.name,
        imageUrl: giftImageUrl,
        lottieUrl: giftLottieUrl,
        videoUrl: giftVideoUrl,
        durationMs: giftDurationMs,
        senderName,
        recipientName: recipientLabel,
        amount: giftCost,
        timestamp: Date.now(),
      });
      sendBigGiftAnnounce(giftEmoji, gift.name, senderName, giftCost, recipientLabel, giftImageUrl);
      onMultiGiftSent?.(giftEmoji, multiplier, giftImageUrl);
      setBurst(false); setSelectedGift(null); setSending(false); setMultiplier(1);
      onClose();
      sendGift(senderId!, receiverId, gift.name, giftCost, { giftEmoji, imageUrl: giftImageUrl });
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
                    <img src={m.avatar_url || 'https://i.pravatar.cc/100'} className="w-8 h-8 rounded-full object-cover" alt="" loading="lazy" decoding="async" />
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

        {/* Category tabs (BOSS-controlled categories) */}
        <div className="flex items-center gap-1.5 overflow-x-auto pb-2 mb-2 scrollbar-thin -mx-1 px-1">
          {GIFT_TABS.map((tab) => {
            const isActive = activeTab === tab.id;
            const count =
              tab.id === "latest"
                ? gifts.filter((g) => {
                    if (!g.created_at) return false;
                    return Date.now() - new Date(g.created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
                  }).length
                : gifts.filter((g) => (g.category || "general") === tab.id).length;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`shrink-0 px-3 py-1.5 rounded-full text-[11px] font-bold transition-all flex items-center gap-1 ${
                  isActive
                    ? "bg-gradient-to-r from-fuchsia-500 to-purple-600 text-white shadow-[0_2px_10px_-2px_hsl(280_85%_55%/0.6)]"
                    : "bg-secondary/60 text-muted-foreground hover:text-foreground"
                }`}
              >
                <span>{tab.label}</span>
                {count > 0 && !tab.locked && (
                  <span className={`text-[9px] px-1.5 py-px rounded-full ${isActive ? "bg-white/25" : "bg-foreground/10"}`}>
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* Gift grid (filtered by active tab; we keep original `i` index so selectedGift stays valid) */}
        <div className="grid grid-cols-4 gap-3 mb-3 max-h-48 overflow-auto">
          {gifts
            .map((gift, i) => ({ gift, i }))
            .filter(({ gift }) => {
              if (activeTab === "latest") {
                if (!gift.created_at) return false;
                return Date.now() - new Date(gift.created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
              }
              return (gift.category || "general") === activeTab;
            })
            .map(({ gift, i }) => (
              <button key={i} onClick={() => setSelectedGift(i)}
                className={`relative flex flex-col items-center gap-1 p-3 rounded-2xl transition-all duration-200 ${
                  selectedGift === i ? "bg-primary/20 border border-primary glow-neon scale-105" : "bg-secondary hover:bg-secondary/80"
                }`}>
                {/* "New" badge for gifts added in the last 7 days */}
                {gift.created_at && Date.now() - new Date(gift.created_at).getTime() < 7 * 24 * 60 * 60 * 1000 && (
                  <span className="absolute top-1 left-1 text-[8px] font-black bg-orange-500 text-white px-1 rounded">New</span>
                )}
                {gift.image_url ? (
                  <img src={gift.image_url} alt={gift.name} className="w-8 h-8 object-contain" loading="lazy" decoding="async" />
                ) : (
                  <span className="text-2xl">{gift.emoji}</span>
                )}
                <span className="text-[9px] text-muted-foreground truncate max-w-full">{gift.name}</span>
                <span className="text-[10px] text-muted-foreground flex items-center gap-0.5">
                  <CurrencyIcon type="gold" size="xs" />{gift.price}
                </span>
              </button>
            ))}
          {gifts
            .map((gift, i) => ({ gift, i }))
            .filter(({ gift }) => {
              if (activeTab === "latest") {
                if (!gift.created_at) return false;
                return Date.now() - new Date(gift.created_at).getTime() < 14 * 24 * 60 * 60 * 1000;
              }
              return (gift.category || "general") === activeTab;
            }).length === 0 && (
            <div className="col-span-4 text-center py-6 text-[11px] text-muted-foreground">
              لا توجد هدايا في هذه الخانة بعد
            </div>
          )}
        </div>

        {/* Multiplier with combo effects */}
        <div className="mb-3">
          <div className="flex items-center justify-between mb-1.5">
            <p className="text-[10px] text-muted-foreground">العدد (Combo)</p>
            {getComboEffect(multiplier) && (
              <span className="text-[10px] font-black px-2 py-0.5 rounded-full gradient-neon text-primary-foreground animate-pulse">
                {getComboEffect(multiplier)!.label}
              </span>
            )}
          </div>
          <div className="flex gap-1.5">
            {MULTIPLIERS.map(m => {
              const fx = getComboEffect(m);
              return (
                <button key={m} onClick={() => setMultiplier(m)}
                  style={multiplier === m && fx ? { boxShadow: fx.glow } : undefined}
                  className={`flex-1 py-2 rounded-xl text-xs font-black transition-all ${
                    multiplier === m
                      ? `gradient-neon text-primary-foreground ${fx?.scale || ""}`
                      : "bg-secondary text-muted-foreground"
                  }`}>
                  ×{m}
                </button>
              );
            })}
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
