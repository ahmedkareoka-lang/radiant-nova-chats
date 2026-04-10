import { Search, MessageCircle } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import BottomNav from "@/components/BottomNav";
import { supabase } from "@/integrations/supabase/client";
import { useConversations } from "@/hooks/useChat";
import { usePresence } from "@/hooks/usePresence";
import { toast } from "sonner";

const SearchPage = () => {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const { startConversation } = useConversations();
  const { onlineUsers } = usePresence();

  useEffect(() => {
    const fetchUsers = async () => {
      if (!query.trim()) {
        // Show all users when no search
        const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false }).limit(20);
        setUsers(data || []);
        return;
      }
      setLoading(true);
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .or(`display_name.ilike.%${query}%,user_id.ilike.%${query}%`)
        .limit(20);
      setUsers(data || []);
      setLoading(false);
    };

    const timer = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timer);
  }, [query]);

  const handleChat = async (userId: string) => {
    const convId = await startConversation(userId);
    if (convId) {
      navigate("/chat");
    } else {
      toast.error("حدث خطأ");
    }
  };

  return (
    <div className="min-h-screen pb-20">
      <header className="sticky top-0 z-40 bg-background/90 backdrop-blur-xl border-b border-border px-4 py-3">
        <div className="max-w-lg mx-auto">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن مستخدم (اسم أو ID)..."
              className="w-full bg-secondary rounded-full pl-10 pr-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
            />
          </div>
        </div>
      </header>

      <main className="px-4 py-4 max-w-lg mx-auto">
        <h2 className="text-sm font-bold text-muted-foreground mb-4">
          {query ? "نتائج البحث" : "🔥 المستخدمون"}
        </h2>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-8 h-8 rounded-full border-4 border-accent border-t-transparent animate-spin" />
          </div>
        ) : users.length === 0 ? (
          <p className="text-center text-muted-foreground text-sm py-10">لا توجد نتائج</p>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {users.map((user) => {
              const isOnline = onlineUsers.includes(user.id);
              return (
                <div key={user.id} className="card-nova p-4 flex flex-col items-center gap-2 hover:border-primary/40 transition-all cursor-pointer relative"
                  onClick={() => navigate(`/user?id=${user.id}`)}>
                  <div className={`relative w-14 h-14 rounded-full overflow-hidden ${user.vip_level >= 5 ? "ring-2 ring-accent" : "ring-2 ring-border"}`}>
                    <img src={user.avatar_url || "https://i.pravatar.cc/60?img=3"} alt="" className="w-full h-full object-cover" />
                    {isOnline && (
                      <div className="absolute bottom-0 right-0 w-3.5 h-3.5 rounded-full bg-green-500 border-2 border-background" />
                    )}
                  </div>
                  <span className={`font-bold text-sm ${user.is_boss ? "boss-fire-text" : ""}`}>{user.display_name}</span>
                  <span className="text-[10px] text-muted-foreground">ID: {user.user_id}</span>
                  {user.vip_level > 0 && (
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-accent/20 font-bold text-accent">
                      VIP {user.vip_level}
                    </span>
                  )}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleChat(user.id); }}
                    className="mt-1 flex items-center gap-1 text-[10px] px-3 py-1 rounded-full gradient-neon text-primary-foreground font-bold"
                  >
                    <MessageCircle className="w-3 h-3" /> محادثة
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </main>

      <BottomNav />
    </div>
  );
};

export default SearchPage;
