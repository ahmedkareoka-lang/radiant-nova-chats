import { useState, useMemo } from "react";
import { Sparkles, Languages, FileText, X, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface AIRoomAssistantProps {
  messages: Array<{
    id: string;
    content: string;
    created_at: string;
    sender?: { display_name: string };
  }>;
  translationsEnabled: boolean;
  onToggleTranslations: (enabled: boolean) => void;
}

/**
 * AI Moderator widget for Voice Rooms.
 * - Summarizes the last ~5 minutes of chat for late joiners.
 * - Toggle for live translation of foreign-language messages (handled in chat renderer).
 */
const AIRoomAssistant = ({ messages, translationsEnabled, onToggleTranslations }: AIRoomAssistantProps) => {
  const [open, setOpen] = useState(false);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [summary, setSummary] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const recentMessages = useMemo(() => {
    const cutoff = Date.now() - 5 * 60 * 1000; // last 5 minutes
    return messages
      .filter((m) => new Date(m.created_at).getTime() >= cutoff)
      .filter((m) => !m.content.startsWith("🚪"))
      .slice(-40);
  }, [messages]);

  const handleSummarize = async () => {
    if (recentMessages.length === 0) {
      toast.info("مفيش رسائل في آخر 5 دقايق");
      return;
    }
    setLoading(true);
    setSummaryOpen(true);
    setSummary(null);

    const transcript = recentMessages
      .map((m) => `${m.sender?.display_name || "User"}: ${m.content}`)
      .join("\n");

    try {
      const { data, error } = await supabase.functions.invoke("ai-room-tools", {
        body: { mode: "summarize", transcript },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSummary((data as any)?.summary || "مفيش ملخص متاح.");
    } catch (e: any) {
      toast.error(e?.message || "فشل تجهيز الملخص");
      setSummary("حصلت مشكلة، حاول تاني بعد شوية.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* Floating AI bubble — bottom-left, above bottom controls */}
      <motion.div
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        className="fixed left-3 bottom-24 z-30"
      >
        <button
          onClick={() => setOpen((v) => !v)}
          className="relative w-12 h-12 rounded-full bg-gradient-to-br from-primary via-accent to-primary shadow-[0_0_20px_hsl(var(--primary)/0.5)] flex items-center justify-center hover:scale-105 transition-transform"
          aria-label="مساعد NOVA الذكي"
        >
          <Sparkles className="w-5 h-5 text-primary-foreground" />
          {translationsEnabled && (
            <span className="absolute -top-1 -right-1 w-3 h-3 rounded-full bg-emerald-500 border-2 border-background" />
          )}
        </button>

        <AnimatePresence>
          {open && (
            <motion.div
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              className="absolute bottom-14 left-0 w-64 card-glass rounded-2xl p-3 space-y-2 shadow-2xl"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-bold text-foreground flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-accent" /> مساعد NOVA
                </p>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <button
                onClick={() => {
                  setOpen(false);
                  handleSummarize();
                }}
                className="w-full flex items-center gap-2 p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-right"
              >
                <FileText className="w-4 h-4 text-primary shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold">ملخص آخر 5 دقايق</p>
                  <p className="text-[10px] text-muted-foreground">
                    {recentMessages.length} رسالة
                  </p>
                </div>
              </button>

              <button
                onClick={() => onToggleTranslations(!translationsEnabled)}
                className="w-full flex items-center gap-2 p-2 rounded-xl bg-secondary/60 hover:bg-secondary transition-colors text-right"
              >
                <Languages className="w-4 h-4 text-accent shrink-0" />
                <div className="flex-1">
                  <p className="text-xs font-bold">
                    ترجمة فورية {translationsEnabled ? "✅" : ""}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {translationsEnabled ? "مُفعّلة — أي لغة → عربي" : "اضغط للتفعيل"}
                  </p>
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* Summary Dialog */}
      <Dialog open={summaryOpen} onOpenChange={setSummaryOpen}>
        <DialogContent className="card-glass max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-accent" />
              ملخص الشات
            </DialogTitle>
            <DialogDescription>
              آخر {recentMessages.length} رسالة من 5 دقايق فاتت
            </DialogDescription>
          </DialogHeader>
          <div className="min-h-[120px] p-4 rounded-xl bg-secondary/40 border border-border/40">
            {loading ? (
              <div className="flex items-center justify-center gap-2 text-muted-foreground py-6">
                <Loader2 className="w-5 h-5 animate-spin" />
                <span className="text-sm">جاري التلخيص...</span>
              </div>
            ) : (
              <p className="text-sm leading-relaxed whitespace-pre-wrap text-foreground">
                {summary}
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default AIRoomAssistant;
