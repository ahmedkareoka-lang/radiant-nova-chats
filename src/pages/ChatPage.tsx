import { Search, ArrowLeft, Send, Bell } from "lucide-react";
import { useState, useEffect } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { useConversations, useChatMessages } from "@/hooks/useChat";
import { useNotifications } from "@/hooks/useNotifications";
import { formatDistanceToNow } from "date-fns";

const ChatPage = () => {
  const { conversations, loading, currentUserId } = useConversations();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [activeConvId, setActiveConvId] = useState<string | null>(searchParams.get("conv"));
  const [searchQuery, setSearchQuery] = useState("");
  const { unreadCount } = useNotifications();

  useEffect(() => {
    const conv = searchParams.get("conv");
    if (conv) setActiveConvId(conv);
  }, [searchParams]);

  if (activeConvId) {
    return <ChatView conversationId={activeConvId} onBack={() => setActiveConvId(null)} currentUserId={currentUserId} />;
  }

  const filtered = conversations.filter((c) =>
    c.other_user.display_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="flex items-center justify-between mb-3">
            <h1 className="font-bold text-lg">الرسائل</h1>
            <button onClick={() => navigate("/notifications")} className="relative w-9 h-9 rounded-full bg-secondary flex items-center justify-center">
              <Bell className="w-4 h-4" />
              {unreadCount > 0 && (
                <div className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-destructive flex items-center justify-center">
                  <span className="text-[7px] font-bold text-destructive-foreground">{unreadCount > 9 ? "9+" : unreadCount}</span>
                </div>
              )}
            </button>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search chats..."
              className="w-full bg-secondary rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-muted-foreground">
            <p className="text-sm">لا توجد محادثات بعد</p>
            <p className="text-xs mt-1">ابحث عن مستخدمين لبدء محادثة</p>
          </div>
        ) : (
          filtered.map((conv) => (
            <div
              key={conv.id}
              onClick={() => setActiveConvId(conv.id)}
              className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer border-b border-border/50"
            >
              <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${conv.other_user.vip_level >= 5 ? "ring-2 ring-accent" : "ring-2 ring-border"}`}>
                <img src={conv.other_user.avatar_url || "https://i.pravatar.cc/60?img=3"} alt="" className="w-full h-full object-cover" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-sm">{conv.other_user.display_name}</span>
                  {conv.last_message_at && (
                    <span className="text-[10px] text-muted-foreground">
                      {formatDistanceToNow(new Date(conv.last_message_at), { addSuffix: false })}
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground truncate">{conv.last_message || "بدء المحادثة..."}</p>
              </div>
              {conv.unread_count > 0 && (
                <div className="w-5 h-5 rounded-full gradient-neon flex items-center justify-center flex-shrink-0">
                  <span className="text-[10px] font-bold text-primary-foreground">{conv.unread_count}</span>
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

const ChatView = ({ conversationId, onBack, currentUserId }: { conversationId: string; onBack: () => void; currentUserId: string | null }) => {
  const { messages, sendMessage } = useChatMessages(conversationId);
  const [input, setInput] = useState("");

  const handleSend = async () => {
    if (!input.trim()) return;
    await sendMessage(input);
    setInput("");
  };

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="flex items-center gap-3 max-w-lg mx-auto">
          <button onClick={onBack} className="text-muted-foreground">
            <ArrowLeft className="w-5 h-5" />
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

      <div className="bg-card/95 backdrop-blur-xl border-t border-border px-4 py-3">
        <div className="flex gap-2 max-w-lg mx-auto">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSend()}
            placeholder="Type a message..."
            maxLength={1000}
            className="flex-1 bg-secondary rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
          />
          <button onClick={handleSend} className="w-10 h-10 rounded-full gradient-neon flex items-center justify-center">
            <Send className="w-4 h-4 text-primary-foreground" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
