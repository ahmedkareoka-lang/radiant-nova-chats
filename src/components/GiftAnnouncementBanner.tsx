import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";

interface GiftAnnouncement {
  id: string;
  senderName: string;
  receiverName: string;
  giftName: string;
  giftEmoji: string;
  amount: number;
}

interface GiftAnnouncementBannerProps {
  roomId: string;
}

const GiftAnnouncementBanner = ({ roomId }: GiftAnnouncementBannerProps) => {
  const [announcements, setAnnouncements] = useState<GiftAnnouncement[]>([]);

  useEffect(() => {
    if (!roomId) return;
    const channel = supabase.channel(`gift-announce-${roomId}-${Date.now()}`)
      .on("broadcast", { event: "big-gift" }, (payload) => {
        const data = payload.payload as GiftAnnouncement;
        const id = `${Date.now()}-${Math.random()}`;
        setAnnouncements(prev => [...prev, { ...data, id }]);
        setTimeout(() => {
          setAnnouncements(prev => prev.filter(a => a.id !== id));
        }, 5000);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [roomId]);

  return (
    <div className="fixed top-0 left-0 right-0 z-[9998] pointer-events-none">
      <AnimatePresence>
        {announcements.map((a) => (
          <motion.div
            key={a.id}
            initial={{ y: -60, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -60, opacity: 0 }}
            className="mx-auto max-w-lg px-4 mt-2"
          >
            <div
              className="rounded-2xl px-4 py-3 flex items-center gap-3 pointer-events-auto"
              style={{
                background: "linear-gradient(135deg, hsl(35 80% 30% / 0.95), hsl(45 90% 40% / 0.95), hsl(25 70% 25% / 0.95))",
                backdropFilter: "blur(12px)",
                border: "1px solid hsl(45 80% 50% / 0.3)",
                boxShadow: "0 4px 20px hsl(45 80% 50% / 0.3)",
              }}
            >
              <span className="text-3xl">{a.giftEmoji}</span>
              <div className="flex-1 min-w-0">
                <p className="text-xs font-black text-accent truncate">
                  🎉 {a.senderName} أرسل {a.giftName} إلى {a.receiverName}
                </p>
                <p className="text-[10px] text-foreground/70">
                  💰 {a.amount.toLocaleString()} عملة ذهبية
                </p>
              </div>
              <span className="text-2xl animate-bounce">🎁</span>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
};

export default GiftAnnouncementBanner;
