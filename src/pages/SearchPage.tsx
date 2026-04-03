import { Search } from "lucide-react";
import BottomNav from "@/components/BottomNav";

const trendingUsers = [
  { name: "Ahmed", image: "https://i.pravatar.cc/60?img=11", id: "482917", vip: 7 },
  { name: "Sara", image: "https://i.pravatar.cc/60?img=5", id: "193847", vip: 5 },
  { name: "Omar", image: "https://i.pravatar.cc/60?img=12", id: "284756", vip: 3 },
  { name: "Nour", image: "https://i.pravatar.cc/60?img=9", id: "573920", vip: 0 },
  { name: "Layla", image: "https://i.pravatar.cc/60?img=20", id: "847263", vip: 10 },
  { name: "Youssef", image: "https://i.pravatar.cc/60?img=15", id: "629384", vip: 2 },
];

const SearchPage = () => {
  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              placeholder="Search users or rooms..."
              className="w-full bg-secondary rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-neon-purple"
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <h2 className="text-sm font-bold text-muted-foreground mb-4">🔥 Trending Users</h2>
        <div className="grid grid-cols-2 gap-3">
          {trendingUsers.map((user) => (
            <div key={user.id} className="card-nova p-4 flex flex-col items-center gap-2 hover:border-neon-purple/40 transition-all cursor-pointer">
              <div className={`w-14 h-14 rounded-full overflow-hidden ${user.vip >= 5 ? "ring-2 ring-gold" : "ring-2 ring-border"}`}>
                <img src={user.image} alt={user.name} className="w-full h-full object-cover" />
              </div>
              <span className="font-bold text-sm">{user.name}</span>
              <span className="text-[10px] text-muted-foreground">ID: {user.id}</span>
              {user.vip > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full gradient-vip font-bold text-accent-foreground">
                  VIP {user.vip}
                </span>
              )}
            </div>
          ))}
        </div>
      </main>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
