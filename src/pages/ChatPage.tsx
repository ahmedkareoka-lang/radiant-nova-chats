import { Search, ArrowLeft, Send, Bell, ChevronLeft, Bot, Sparkles, Trash2 } from "lucide-react";
import { useState, useEffect, useRef } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useConversations, useChatMessages } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { useAIChat } from "@/hooks/useAIChat";
import { formatDistanceToNow } from "date-fns";
import NovaSpinner from "@/components/NovaSpinner";
import EmptyState from "@/components/EmptyState";
import DualBadge from "@/components/DualBadge";
import ReactMarkdown from "react-markdown";

const ChatPage = () => {
  const { conversations, loading, currentUserId } = useConversations();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("conv"));
  const [showAI, setShowAI] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const conv = searchParams.get("conv");
    if (conv === "nova-ai") {
      setShowAI(true);
    } else if (conv) {
      setActiveConvId(conv);
    }
  }, [searchParams]);

  if (showAI) {
    return <AIChatView onBack={() => setShowAI(false)} />;
  }

  if (activeConvId) {
    return <ChatView conversationId={activeConvId} onBack={() => setActiveConvId(null)} currentUserId={currentUserId} />;
  }

  const filtered = conversations.filter((c) =>
    c.other_user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 border-b border-border/20 px-4 py-3" style={{ background: "hsl(260 28% 6% / 0.9)", backdropFilter: "blur(20px)" }}>
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
                <Search className="w-4 h-4 text-muted-foreground" />
              </button>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-sm font-bold text-muted-foreground/50">جهات الاتصال</span>
              <h1 className="font-black text-lg text-primary glow-neon-text">رسالة</h1>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {/* NOVA AI Assistant - Pinned at top */}
        <div
          onClick={() => setShowAI(true)}
          className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer border-b border-border/20 bg-gradient-to-l from-primary/5 to-transparent"
        >
          <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-primary/60 bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
            <Sparkles className="w-6 h-6 text-white" />
            <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-400 border-2 border-background animate-pulse" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <div className="flex items-center justify-end gap-1.5">
              <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-primary/20 text-primary font-bold">AI</span>
              <span className="font-bold text-sm">NOVA AI ✨</span>
            </div>
            <p className="text-xs text-muted-foreground truncate text-right">مساعدك الذكي — اسألني أي شيء!</p>
          </div>
        </div>

        {/* Join the Party Section */}
        {conversations.length > 0 && (
          <div className="px-4 py-3">
            <p className="text-sm font-bold text-right mb-3">انضم إلى الحفلة</p>
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-none">
              {conversations.slice(0, 6).map((conv) => (
                <div key={conv.id} className="flex flex-col items-center gap-1 flex-shrink-0" onClick={() => setActiveConvId(conv.id)}>
                  <div className="party-avatar-ring">
                    <div className="w-14 h-14 rounded-full overflow-hidden bg-background">
                      <img loading="lazy" decoding="async" src={conv.other_user.avatar_url || "https://i.pravatar.cc/60?img=3"} alt="" className="w-full h-full object-cover" />
                    </div>
                  </div>
                  <span className="text-[9px] text-muted-foreground max-w-[60px] truncate text-center">{conv.other_user.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Notifications Row */}
        <div onClick={() => navigate("/notifications")} className="flex items-center gap-3 px-4 py-3 border-b border-border/20 cursor-pointer hover:bg-secondary/20">
          <div className="w-12 h-12 rounded-full bg-primary/20 flex items-center justify-center flex-shrink-0">
            <Bell className="w-6 h-6 text-primary" />
          </div>
          <div className="flex-1 min-w-0 text-right">
            <p className="font-bold text-sm">إشعارات</p>
            <p className="text-xs text-muted-foreground truncate">اطلع على آخر التنبيهات...</p>
          </div>
          <span className="text-[10px] text-muted-foreground">جديد</span>
        </div>

        {/* Conversations */}
        {loading ? (
          <NovaSpinner text="جارٍ التحميل..." />
        ) : filtered.length === 0 ? (
          <EmptyState icon="💬" title="لا توجد محادثات بعد" subtitle="ابحث عن مستخدمين لبدء محادثة" />
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/20 transition-colors cursor-pointer border-b border-border/20"
            >
              <div className="relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ring-2 ring-border/30">
                <img loading="lazy" decoding="async" src={conv.other_user.avatar_url || "https://i.pravatar.cc/60?img=3"} alt="" className="w-full h-full object-cover" />
                <div className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-green-500 border-2 border-background" />
              </div>
              <div className="flex-1 min-w-0 text-right">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[10px] text-muted-foreground flex-shrink-0">
                    {conv.last_message_at ? formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false }) : ""}
                  </span>
                  <div className="flex items-center gap-1.5 min-w-0 justify-end">
                    <DualBadge novaLevel={conv.other_user.nova_p_level || 0} vipLevel={conv.other_user.vip_level || 0} />
                    <span className="font-bold text-sm truncate">{conv.other_user.display_name}</span>
                  </div>
                </div>
                <p className="text-xs text-muted-foreground truncate text-right">{conv.last_message || "بدء المحادثة..."}</p>
              </div>
              {conv.unread_count > 0 && (
                <div className="min-w-[20px] h-5 rounded-full bg-destructive flex items-center justify-center px-1 flex-shrink-0">
                  <span className="text-[10px] font-bold text-destructive-foreground">{conv.unread_count}</span>
                </div>
              )}
            </div>
          ))
        )}
      </main>

      <BottomNav />
    </div>
  );
};

/* ──────────────────── AI Chat View ──────────────────── */
const AIChatView = ({ onBack }: { onBack: () => void }) => {
  const { messages, isLoading, sendMessage, clearChat } = useAIChat();
  const [input, setInput] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  const handleSend = () => {
    if (!input.trim() || isLoading) return;
    sendMessage(input);
    setInput("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/20 px-4 py-3" style={{ background: "hsl(260 28% 6% / 0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2 flex-1">
            <div className="w-8 h-8 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Sparkles className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="font-bold text-sm">NOVA AI ✨</p>
              <p className="text-[10px] text-green-400">متصل دائمًا</p>
            </div>
          </div>
          <button onClick={clearChat} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
            <Trash2 className="w-3.5 h-3.5 text-muted-foreground" />
          </button>
        </div>
      </header>

      <div ref={scrollRef} className="flex-1 overflow-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full gap-4 text-center py-12">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center">
              <Sparkles className="w-10 h-10 text-white" />
            </div>
            <h2 className="font-bold text-lg">مرحبًا بك في NOVA AI! ✨</h2>
            <p className="text-sm text-muted-foreground max-w-xs">
              أنا مساعدك الذكي. اسألني عن أي شيء يخص التطبيق أو أي موضوع تريد الدردشة حوله!
            </p>
            <div className="flex flex-wrap gap-2 justify-center mt-2">
              {["ما هو VIP؟ 💎", "كيف أرسل هدية؟ 🎁", "نصائح للغرف 🎤", "أخبرني نكتة 😄"].map((q) => (
                <button
                  key={q}
                  onClick={() => sendMessage(q)}
                  className="text-xs px-3 py-1.5 rounded-full bg-secondary/60 hover:bg-secondary text-foreground border border-border/30 transition-colors"
                >
                  {q}
                </button>
              ))}
            </div>
          </div>
        )}

        {messages.map((msg) => {
          const isUser = msg.role === "user";
          return (
            <div key={msg.id} className={`flex ${isUser ? "justify-end" : "justify-start"}`}>
              {!isUser && (
                <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center mr-2 mt-1 flex-shrink-0">
                  <Sparkles className="w-3.5 h-3.5 text-white" />
                </div>
              )}
              <div className={`max-w-[80%] rounded-2xl px-3 py-2 text-sm ${
                isUser
                  ? "gradient-neon text-primary-foreground rounded-br-sm"
                  : "bg-secondary/80 text-foreground rounded-bl-sm"
              }`}>
                {isUser ? (
                  <p>{msg.content}</p>
                ) : (
                  <div className="prose prose-sm prose-invert max-w-none [&>p]:m-0 [&>ul]:my-1 [&>ol]:my-1">
                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                  </div>
                )}
                <p className="text-[8px] opacity-50 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}

        {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center flex-shrink-0">
              <Sparkles className="w-3.5 h-3.5 text-white animate-spin" />
            </div>
            <div className="bg-secondary/80 rounded-2xl rounded-bl-sm px-4 py-2">
              <div className="flex gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "0ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "150ms" }} />
                <span className="w-1.5 h-1.5 rounded-full bg-primary animate-bounce" style={{ animationDelay: "300ms" }} />
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="border-t border-border/20 px-4 py-3" style={{ background: "hsl(260 28% 6% / 0.95)" }}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اسأل NOVA AI أي شيء..."
            maxLength={1000}
            className="flex-1 bg-secondary/50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-border/30"
          />
          <button
            onClick={handleSend}
            disabled={isLoading || !input.trim()}
            className="w-10 h-10 rounded-full gradient-neon flex items-center justify-center glow-neon disabled:opacity-50"
          >
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

/* ──────────────────── Regular Chat View ──────────────────── */
const ChatView = ({ conversationId, onBack, currentUserId }: { conversationId: string; onBack: () => void; currentUserId: string | null }) => {
  const { messages, sendMessage } = useChatMessages(conversationId);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/20 px-4 py-3" style={{ background: "hsl(260 28% 6% / 0.95)", backdropFilter: "blur(20px)" }}>
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={onBack} className="w-8 h-8 rounded-full bg-secondary/50 flex items-center justify-center">
            <ArrowLeft className="w-4 h-4" />
          </button>
          <h1 className="font-bold text-sm">Chat</h1>
        </div>
      </header>

      <div className="flex-1 overflow-auto px-4 py-4 max-w-lg mx-auto w-full space-y-3">
        {messages.map((msg) => {
          const isMine = msg.sender_id === currentUserId;
          return (
            <div key={msg.id} className={`flex ${isMine ? "justify-end" : "justify-start"}`}>
              <div className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
                isMine ? "gradient-neon text-primary-foreground rounded-br-sm" : "bg-secondary text-foreground rounded-bl-sm"
              }`}>
                {!isMine && <p className="text-[10px] font-bold text-primary mb-0.5">{msg.sender?.display_name}</p>}
                <p>{msg.content}</p>
                <p className="text-[8px] opacity-60 mt-1 text-right">
                  {new Date(msg.created_at).toLocaleTimeString("ar", { hour: "2-digit", minute: "2-digit" })}
                </p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="border-t border-border/20 px-4 py-3" style={{ background: "hsl(260 28% 6% / 0.95)" }}>
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="اكتب رسالة..."
            maxLength={1000}
            className="flex-1 bg-secondary/50 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary border border-border/30"
          />
          <button onClick={handleSend} className="w-10 h-10 rounded-full gradient-neon flex items-center justify-center glow-neon">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
