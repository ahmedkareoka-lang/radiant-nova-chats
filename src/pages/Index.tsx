import { Coins, Diamond, Bell } from "lucide-react";
import { useNavigate } from "react-router-dom";
import RoomCard from "@/components/RoomCard";
import BottomNav from "@/components/BottomNav";
import VipBadge from "@/components/VipBadge";

const mockRooms = [
  { name: "Night Vibes 🎵", hostName: "Ahmed", hostImage: "https://i.pravatar.cc/100?img=11", viewerCount: 24, isVip: true, category: "Music" },
  { name: "Chill Zone", hostName: "Sara", hostImage: "https://i.pravatar.cc/100?img=5", viewerCount: 12, category: "Chat" },
  { name: "Gaming Squad 🎮", hostName: "Omar", hostImage: "https://i.pravatar.cc/100?img=12", viewerCount: 31, category: "Gaming" },
  { name: "VIP Lounge ✨", hostName: "Nour", hostImage: "https://i.pravatar.cc/100?img=9", viewerCount: 8, isVip: true, category: "VIP" },
  { name: "Late Night Talk", hostName: "Youssef", hostImage: "https://i.pravatar.cc/100?img=15", viewerCount: 19, category: "Chat" },
  { name: "DJ Session 🔥", hostName: "Layla", hostImage: "https://i.pravatar.cc/100?img=20", viewerCount: 45, isVip: true, category: "Music" },
];

const Index = () => {
  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border">
        <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
          <div className="flex items-center gap-3">
            <div className="relative w-10 h-10 rounded-full overflow-hidden ring-2 ring-neon-purple">
              <img src="https://i.pravatar.cc/100?img=3" alt="Profile" className="w-full h-full object-cover" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-bold text-sm">Nova User</span>
                <VipBadge level={5} />
              </div>
              <span className="text-[10px] text-muted-foreground">ID: 482917</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
              <Coins className="w-3.5 h-3.5 text-gold" />
              <span className="text-xs font-bold text-gold">14,000</span>
            </div>
            <div className="flex items-center gap-1 bg-secondary rounded-full px-2.5 py-1">
              <Diamond className="w-3.5 h-3.5 text-neon-purple" />
              <span className="text-xs font-bold text-neon-purple">5,000</span>
            </div>
            <button className="relative">
              <Bell className="w-5 h-5 text-muted-foreground" />
              <div className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-destructive" />
            </button>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="px-4 py-4 max-w-lg mx-auto">
        {/* Section Title */}
        <div className="flex items-center justify-between mb-4">
          <h1 className="text-xl font-extrabold">
            <span className="glow-neon-text">LIVE</span>{" "}
            <span className="text-muted-foreground font-normal text-base">Rooms</span>
          </h1>
          <div className="flex gap-2">
            {["All", "Music", "Chat", "Gaming", "VIP"].map((cat, i) => (
              <button
                key={cat}
                className={`text-[10px] px-3 py-1 rounded-full font-semibold transition-all ${
                  i === 0
                    ? "gradient-neon text-primary-foreground glow-neon"
                    : "bg-secondary text-muted-foreground hover:text-foreground"
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Rooms List */}
        <div className="space-y-3">
          {mockRooms.map((room, i) => (
            <div key={i} className="animate-fade-in" style={{ animationDelay: `${i * 0.05}s` }}>
              <RoomCard {...room} />
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default Index;
