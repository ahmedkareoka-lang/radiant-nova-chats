import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Users, Plus, Crown, Check, X, Clock } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

const AgenciesPage = () => {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<any[]>([]);
  const [myAgency, setMyAgency] = useState<any>(null);
  const [myMembership, setMyMembership] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState("");
  const [isBoss, setIsBoss] = useState(false);
  const [pendingAgencies, setPendingAgencies] = useState<any[]>([]);
  const [agencyHosts, setAgencyHosts] = useState<any[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase.from("profiles").select("is_boss").eq("id", user.id).single();
      setIsBoss(prof?.is_boss || false);

      const { data: all } = await supabase.from("agencies").select("*").eq("status", "approved").eq("is_active", true);
      setAgencies(all || []);

      if (prof?.is_boss) {
        const { data: pending } = await supabase.from("agencies").select("*").eq("status", "pending");
        setPendingAgencies(pending || []);
      }

      const { data: membership } = await supabase.from("agency_members").select("*").eq("user_id", user.id).single();
      if (membership) {
        setMyMembership(membership);
        const { data: ag } = await supabase.from("agencies").select("*").eq("id", membership.agency_id).single();
        setMyAgency(ag);

        // If agent, load hosts
        if (membership.badge === "agent" || ag?.owner_id === user.id) {
          const { data: hosts } = await supabase.from("agency_members").select("*").eq("agency_id", membership.agency_id);
          // Fetch profiles for hosts
          if (hosts) {
            const ids = hosts.map(h => h.user_id);
            const { data: profiles } = await supabase.from("profiles").select("id, display_name, user_id, diamonds").in("id", ids);
            const enriched = hosts.map(h => ({
              ...h,
              profile: profiles?.find(p => p.id === h.user_id),
            }));
            setAgencyHosts(enriched);
          }
        }
      }
      setLoading(false);
    };
    load();
  }, []);

  const applyForAgency = async () => {
    if (!agencyName.trim()) return;
    const { data, error } = await supabase.from("agencies").insert({
      name: agencyName,
      owner_id: userId,
      status: "pending",
    }).select().single();

    if (error) { toast.error("خطأ في تقديم الطلب"); return; }

    // Notify BOSS
    const { data: boss } = await supabase.from("profiles").select("id").eq("is_boss", true).single();
    if (boss) {
      await supabase.from("notifications").insert({
        user_id: boss.id,
        title: "طلب وكالة جديد 🏢",
        message: `طلب إنشاء وكالة "${agencyName}" بانتظار الموافقة`,
        type: "agency",
      });
    }

    toast.success("تم إرسال طلب الوكالة للمراجعة! ⏳");
    setShowCreate(false);
    setAgencyName("");
  };

  const approveAgency = async (agencyId: string) => {
    await supabase.from("agencies").update({ status: "approved" }).eq("id", agencyId);
    // Add owner as agent
    const ag = pendingAgencies.find(a => a.id === agencyId);
    if (ag) {
      await supabase.from("agency_members").insert({
        agency_id: agencyId,
        user_id: ag.owner_id,
        role: "owner",
        badge: "agent",
      });
      await supabase.from("notifications").insert({
        user_id: ag.owner_id,
        title: "تمت الموافقة! ✅",
        message: `تم قبول وكالتك "${ag.name}"! أصبحت وكيلاً الآن.`,
        type: "agency",
      });
    }
    setPendingAgencies(pendingAgencies.filter(a => a.id !== agencyId));
    toast.success("تمت الموافقة على الوكالة! ✅");
  };

  const rejectAgency = async (agencyId: string) => {
    await supabase.from("agencies").update({ status: "rejected", is_active: false }).eq("id", agencyId);
    const ag = pendingAgencies.find(a => a.id === agencyId);
    if (ag) {
      await supabase.from("notifications").insert({
        user_id: ag.owner_id,
        title: "طلب مرفوض ❌",
        message: `تم رفض طلب وكالة "${ag.name}"`,
        type: "agency",
      });
    }
    setPendingAgencies(pendingAgencies.filter(a => a.id !== agencyId));
    toast.info("تم رفض الوكالة");
  };

  const joinAgency = async (agencyId: string) => {
    if (myAgency) { toast.error("أنت بالفعل في وكالة!"); return; }
    const { error } = await supabase.from("agency_members").insert({
      agency_id: agencyId,
      user_id: userId,
      badge: "host",
    });
    if (error) { toast.error("خطأ في الانضمام"); return; }
    const ag = agencies.find((a) => a.id === agencyId);
    setMyAgency(ag);
    setMyMembership({ agency_id: agencyId, badge: "host" });
    toast.success("تم الانضمام للوكالة كمضيف! 🎉");
  };

  return (
    <PageTransition>
      <div className="min-h-screen pb-24">
        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center gap-3">
            <button onClick={() => navigate(-1)}><ArrowLeft className="w-5 h-5" /></button>
            <Building2 className="w-5 h-5 text-primary" />
            <h1 className="font-bold text-lg">الوكالات</h1>
          </div>
        </header>

        <main className="px-4 py-4 max-w-lg mx-auto space-y-4">
          {/* BOSS: Pending approvals */}
          {isBoss && pendingAgencies.length > 0 && (
            <div className="space-y-2">
              <h3 className="font-bold text-sm text-accent">⏳ طلبات بانتظار الموافقة</h3>
              {pendingAgencies.map((ag) => (
                <div key={ag.id} className="card-nova p-3 flex items-center justify-between border border-accent/30">
                  <div>
                    <p className="font-bold text-sm">{ag.name}</p>
                    <p className="text-[10px] text-muted-foreground">بانتظار الموافقة</p>
                  </div>
                  <div className="flex gap-2">
                    <button onClick={() => approveAgency(ag.id)} className="w-8 h-8 rounded-full bg-green-500/20 flex items-center justify-center">
                      <Check className="w-4 h-4 text-green-400" />
                    </button>
                    <button onClick={() => rejectAgency(ag.id)} className="w-8 h-8 rounded-full bg-destructive/20 flex items-center justify-center">
                      <X className="w-4 h-4 text-destructive" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* My agency */}
          {myAgency && (
            <div className="card-nova p-4 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm">وكالتي</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  {myMembership?.badge === "agent" ? "وكيل 🏅" : "مضيف 🎤"}
                </span>
              </div>
              <p className="font-bold text-lg">{myAgency.name}</p>

              {/* Agent dashboard */}
              {(myMembership?.badge === "agent" || myAgency.owner_id === userId) && agencyHosts.length > 0 && (
                <div className="mt-3 space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground">المضيفون ({agencyHosts.length})</h4>
                  {agencyHosts.map((h) => (
                    <div key={h.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-2">
                      <div>
                        <p className="text-xs font-bold">{h.profile?.display_name || "—"}</p>
                        <p className="text-[9px] text-muted-foreground">ID: {h.profile?.user_id}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-xs font-bold text-accent">{(h.total_support || 0).toLocaleString()} 💎</p>
                        <p className="text-[9px] text-muted-foreground">عمولة: {Math.floor((h.total_support || 0) * 0.15).toLocaleString()}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Apply for agency */}
          {!myAgency && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="w-full py-3 rounded-2xl border border-dashed border-primary/50 text-primary font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> تقديم طلب وكالة جديدة
            </button>
          )}

          {showCreate && (
            <div className="card-nova p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground">سيتم مراجعة طلبك من قبل الإدارة</p>
              <input
                type="text"
                placeholder="اسم الوكالة"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none"
              />
              <button onClick={applyForAgency} className="w-full py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">
                تقديم الطلب
              </button>
            </div>
          )}

          {/* All agencies */}
          <h3 className="font-bold text-sm">الوكالات المعتمدة</h3>
          <div className="space-y-2">
            {agencies.map((ag) => (
              <div key={ag.id} className="card-nova p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{ag.name}</p>
                  <p className="text-[10px] text-muted-foreground">🟢 نشطة</p>
                </div>
                {!myAgency && (
                  <button
                    onClick={() => joinAgency(ag.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold gradient-neon text-primary-foreground btn-nova"
                  >
                    انضمام كمضيف
                  </button>
                )}
              </div>
            ))}
            {agencies.length === 0 && !loading && (
              <p className="text-center text-muted-foreground text-sm py-8">لا توجد وكالات حالياً</p>
            )}
          </div>
        </main>

        <BottomNav />
      </div>
    </PageTransition>
  );
};

export default AgenciesPage;
