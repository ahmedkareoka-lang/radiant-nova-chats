import { Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const chats = [
  { name: "Ahmed", image: "https://i.pravatar.cc/60?img=11", lastMsg: "See you in the room! 🎵", time: "2m", unread: 3, vip: true },
  { name: "Sara", image: "https://i.pravatar.cc/60?img=5", lastMsg: "Thanks for the gift 🌹", time: "15m", unread: 0, vip: true },
  { name: "Omar", image: "https://i.pravatar.cc/60?img=12", lastMsg: "Let's play tonight", time: "1h", unread: 1, vip: false },
  { name: "Nour", image: "https://i.pravatar.cc/60?img=9", lastMsg: "Hello!", time: "3h", unread: 0, vip: false },
  { name: "Layla", image: "https://i.pravatar.cc/60?img=20", lastMsg: "Amazing voice! 🔥", time: "5h", unread: 0, vip: true },
];

const ChatPage = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <h1 className="font-bold text-lg mb-3">Messages</h1>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search chats..."
              className="w-full bg-secondary rounded-full pl-10 pr-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple"
            />
          </div>
        </div>
      </header>

      <main className="max-w-lg mx-auto">
        {chats.map((chat) => (
          <div key={chat.name} className="flex items-center gap-3 px-4 py-3 hover:bg-secondary/50 transition-colors cursor-pointer border-b border-border/50">
            <div className={`relative w-12 h-12 rounded-full overflow-hidden flex-shrink-0 ${chat.vip ? "ring-2 ring-gold" : "ring-2 ring-border"}`}>
              <img src={chat.image} alt={chat.name} className="w-full h-full object-cover" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="font-bold text-sm">{chat.name}</span>
                <span className="text-[10px] text-muted-foreground">{chat.time}</span>
              </div>
              <p className="text-xs text-muted-foreground truncate">{chat.lastMsg}</p>
            </div>
            {chat.unread > 0 && (
              <div className="w-5 h-5 rounded-full gradient-neon flex items-center justify-center flex-shrink-0">
                <span className="text-[10px] font-bold text-primary-foreground">{chat.unread}</span>
              </div>
            )}
          </div>
        ))}
      </main>

      <BottomNav />
    </div>
  );
};

export default ChatPage;
