import { useEffect, useState } from "react";
import { ArrowLeft, Eye, Lock, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import AvatarImg from "@/components/AvatarImg";
import VipName from "@/components/VipName";
import { isVipActive } from "@/lib/vipConfig";

interface Visitor {
  id: string;
  visitor_id: string;
  visit_count: number;
  last_visited_at: string;
  profile?: {
    id: string;
    display_name: string;
    avatar_url: string | null;
    vip_level: number;
    user_id: string;
  } | null;
}

const timeAgo = (iso: string) => {
  const diff = (Date.now() - new Date(iso).getTime()) / 1000;
  if (diff < 60) return "الآن";
  if (diff < 3600) return `قبل ${Math.floor(diff / 60)} د`;
  if (diff < 86400) return `قبل ${Math.floor(diff / 3600)} س`;
  return `قبل ${Math.floor(diff / 86400)} يوم`;
};

const blurName = (name: string) => {
  if (!name) return "•••••";
  const len = Math.max(3, Math.min(name.length, 8));
  return name[0] + "•".repeat(len - 1);
};

const VisitorsPage = () => {
  const navigate = useNavigate();
  const [visitors, setVisitors] = useState<Visitor[]>([]);
  const [loading, setLoading] = useState(true);
  const [isVip, setIsVip] = useState(false);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: me } = await supabase
        .from("profiles")
        .select("vip_level, vip_expiry")
        .eq("id", user.id)
        .single();
      const vipOk = isVipActive((me as any)?.vip_level, (me as any)?.vip_expiry);
      setIsVip(vipOk);

      const { data: rows } = await supabase
        .from("profile_visits" as any)
        .select("id, visitor_id, visit_count, last_visited_at")
        .eq("profile_id", user.id)
        .order("last_visited_at", { ascending: false })
        .limit(100);

      const list = (rows || []) as any[];
      if (list.length === 0) { setVisitors([]); setLoading(false); return; }

      const ids = list.map((r) => r.visitor_id);
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, display_name, avatar_url, vip_level, user_id")
        .in("id", ids);
      const map = new Map((profs || []).map((p: any) => [p.id, p]));
      setVisitors(list.map((r) => ({ ...r, profile: map.get(r.visitor_id) || null })));
      setLoading(false);
    };
    load();
  }, [navigate]);

  return (
    <PageTransition>
      <div className="min-h-screen pb-10">
        {/* Header */}
        <div className="sticky top-0 z-20 bg-background/80 backdrop-blur-md border-b border-border/40">
          <div className="flex items-center gap-3 p-4 max-w-lg mx-auto">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
              <ArrowLeft className="w-5 h-5" />
            </button>
            <div className="flex-1">
              <h1 className="font-black text-lg flex items-center gap-2">
                <Eye className="w-5 h-5 text-accent" /> زوار ملفي
              </h1>
              <p className="text-[11px] text-muted-foreground">{visitors.length} زيارة مسجلة</p>
            </div>
          </div>
        </div>

        <main className="px-4 max-w-lg mx-auto pt-4">
          {!isVip && (
            <button
              onClick={() => navigate("/vip")}
              className="w-full mb-4 rounded-2xl p-4 text-right relative overflow-hidden border-2"
              style={{
                background: "linear-gradient(135deg, hsl(45 100% 55% / 0.25), hsl(280 80% 30% / 0.35))",
                borderColor: "hsl(45 100% 60% / 0.5)",
                boxShadow: "0 0 24px hsl(45 100% 55% / 0.3)",
              }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "linear-gradient(135deg, hsl(45 100% 55%), hsl(30 100% 50%))" }}>
                  <Crown className="w-6 h-6 text-white" />
                </div>
                <div className="flex-1">
                  <p className="font-black text-sm text-amber-300">اشترك في VIP لكشف الأسماء والصور</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">ادخل لملفهم وشاهد من زارك بالضبط</p>
                </div>
              </div>
            </button>
          )}

          {loading && <div className="text-center py-12 text-muted-foreground">جاري التحميل…</div>}

          {!loading && visitors.length === 0 && (
            <div className="text-center py-16">
              <Eye className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground">لم يزر أحد ملفك بعد</p>
            </div>
          )}

          <div className="space-y-2">
            {visitors.map((v) => {
              const p = v.profile;
              if (isVip && p) {
                return (
                  <button
                    key={v.id}
                    onClick={() => navigate(`/user?id=${p.id}`)}
                    className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-secondary/30 hover:bg-secondary/50 transition-colors text-right"
                  >
                    <AvatarImg src={p.avatar_url} alt={p.display_name} className="w-12 h-12 rounded-full object-cover border-2 border-accent/30" />
                    <div className="flex-1 min-w-0">
                      <VipName name={p.display_name || "User"} level={p.vip_level || 0} size="md" />
                      <p className="text-[10px] text-muted-foreground mt-0.5">
                        {timeAgo(v.last_visited_at)} · {v.visit_count} زيارة
                      </p>
                    </div>
                  </button>
                );
              }
              // Non-VIP: blurred visitor
              return (
                <div
                  key={v.id}
                  className="w-full flex items-center gap-3 p-3 rounded-2xl border border-border/30 bg-secondary/20 text-right relative overflow-hidden"
                >
                  <div className="relative">
                    <div className="w-12 h-12 rounded-full bg-secondary/60 border-2 border-border/40 flex items-center justify-center">
                      {p?.avatar_url ? (
                        <img src={p.avatar_url} alt="" className="w-full h-full rounded-full object-cover" style={{ filter: "blur(10px)" }} />
                      ) : (
                        <Eye className="w-5 h-5 text-muted-foreground" />
                      )}
                    </div>
                    <div className="absolute inset-0 rounded-full flex items-center justify-center bg-background/30">
                      <Lock className="w-4 h-4 text-amber-300" />
                    </div>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm text-foreground/70" style={{ filter: "blur(0px)" }}>
                      {blurName(p?.display_name || "زائر مجهول")}
                    </p>
                    <p className="text-[10px] text-muted-foreground mt-0.5">
                      {timeAgo(v.last_visited_at)} · {v.visit_count} زيارة
                    </p>
                  </div>
                  <button
                    onClick={() => navigate("/vip")}
                    className="text-[10px] font-black px-3 py-1.5 rounded-full text-amber-950"
                    style={{ background: "linear-gradient(135deg, hsl(45 100% 60%), hsl(30 100% 55%))" }}
                  >
                    كشف 👑
                  </button>
                </div>
              );
            })}
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default VisitorsPage;
