import { useEffect, useState } from "react";
import { ArrowLeft } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import NovaGamesMenu from "@/components/games/NovaGamesMenu";
import BottomNav from "@/components/BottomNav";
import PageTransition from "@/components/PageTransition";

const GamesPage = () => {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => {
      if (!user) { navigate("/login"); return; }
      setUserId(user.id);
    });
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="sticky top-0 z-30 backdrop-blur-xl border-b border-border/20" style={{ background: "hsl(260 28% 6% / 0.9)" }}>
          <div className="flex items-center justify-between px-4 py-3 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-lg font-black text-accent">🎮 مركز الألعاب</h1>
            <div className="w-9" />
          </div>
        </header>

        <main className="px-4 py-8 max-w-lg mx-auto">
          <div className="text-center space-y-6">
            <div className="space-y-2">
              <p className="text-7xl">🎰</p>
              <h2 className="text-2xl font-black glow-gold-text">NOVA Games</h2>
              <p className="text-sm text-muted-foreground">العب، راهن، اربح عملات نوفا!</p>
            </div>

            <div className="rounded-3xl p-6" style={{ background: "linear-gradient(135deg, hsl(45 90% 40% / 0.2), hsl(280 70% 30% / 0.2))", border: "1px solid hsl(45 80% 50% / 0.3)" }}>
              <p className="text-sm mb-4">اضغط على الأيقونة لفتح قائمة الألعاب</p>
              <div className="flex justify-center">
                <NovaGamesMenu currentUserId={userId} />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-right">
              <div className="rounded-2xl p-4 border border-yellow-500/30 bg-gradient-to-br from-yellow-600/10 to-red-900/10">
                <span className="text-3xl block mb-2">🎰</span>
                <p className="font-bold text-sm">روليت بريميوم</p>
                <p className="text-[10px] text-muted-foreground">مضاعفات حتى x36</p>
              </div>
              <div className="rounded-2xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-600/10 to-blue-900/10">
                <span className="text-3xl block mb-2">🦁</span>
                <p className="font-bold text-sm">أسد ضد نمر</p>
                <p className="text-[10px] text-muted-foreground">x30 للتعادل</p>
              </div>
            </div>
          </div>
        </main>
        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default GamesPage;
