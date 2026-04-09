import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Users, Plus, Crown } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";

const AgenciesPage = () => {
  const navigate = useNavigate();
  const [agencies, setAgencies] = useState<any[]>([]);
  const [myAgency, setMyAgency] = useState<any>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [agencyName, setAgencyName] = useState("");
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string>("");

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: all } = await supabase.from("agencies").select("*").eq("is_active", true);
      setAgencies(all || []);

      const { data: membership } = await supabase.from("agency_members").select("agency_id").eq("user_id", user.id).single();
      if (membership) {
        const { data: ag } = await supabase.from("agencies").select("*").eq("id", membership.agency_id).single();
        setMyAgency(ag);
      }
      setLoading(false);
    };
    load();
  }, []);

  const createAgency = async () => {
    if (!agencyName.trim()) return;
    const { data, error } = await supabase.from("agencies").insert({
      name: agencyName,
      owner_id: userId,
    }).select().single();

    if (error) { toast.error("خطأ في إنشاء الوكالة"); return; }

    await supabase.from("agency_members").insert({
      agency_id: data.id,
      user_id: userId,
      role: "owner",
    });

    toast.success("تم إنشاء الوكالة بنجاح! 🏢");
    setShowCreate(false);
    setMyAgency(data);
    setAgencies([...agencies, data]);
  };

  const joinAgency = async (agencyId: string) => {
    if (myAgency) { toast.error("أنت بالفعل في وكالة!"); return; }
    const { error } = await supabase.from("agency_members").insert({
      agency_id: agencyId,
      user_id: userId,
    });
    if (error) { toast.error("خطأ في الانضمام"); return; }
    const ag = agencies.find((a) => a.id === agencyId);
    setMyAgency(ag);
    toast.success("تم الانضمام للوكالة! 🎉");
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
          {/* My agency */}
          {myAgency && (
            <div className="card-nova p-4 border border-primary/30">
              <div className="flex items-center gap-2 mb-2">
                <Crown className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm">وكالتي</h3>
              </div>
              <p className="font-bold text-lg">{myAgency.name}</p>
              <div className="flex gap-2 mt-2 text-[10px] text-muted-foreground">
                <span className={myAgency.broadcast_enabled ? "text-green-400" : "text-destructive"}>
                  البث: {myAgency.broadcast_enabled ? "مفعل" : "معطل"}
                </span>
                <span className={myAgency.recharge_enabled ? "text-green-400" : "text-destructive"}>
                  الشحن: {myAgency.recharge_enabled ? "مفعل" : "معطل"}
                </span>
              </div>
            </div>
          )}

          {/* Create agency */}
          {!myAgency && (
            <button
              onClick={() => setShowCreate(!showCreate)}
              className="w-full py-3 rounded-2xl border border-dashed border-primary/50 text-primary font-bold text-sm flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" /> إنشاء وكالة جديدة
            </button>
          )}

          {showCreate && (
            <div className="card-nova p-4 space-y-3">
              <input
                type="text"
                placeholder="اسم الوكالة"
                value={agencyName}
                onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none"
              />
              <button onClick={createAgency} className="w-full py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">
                إنشاء
              </button>
            </div>
          )}

          {/* All agencies */}
          <h3 className="font-bold text-sm">الوكالات المتاحة</h3>
          <div className="space-y-2">
            {agencies.map((ag) => (
              <div key={ag.id} className="card-nova p-3 flex items-center justify-between">
                <div>
                  <p className="font-bold text-sm">{ag.name}</p>
                  <p className="text-[10px] text-muted-foreground">
                    {ag.broadcast_enabled ? "🟢 نشط" : "🔴 معطل"}
                  </p>
                </div>
                {!myAgency && (
                  <button
                    onClick={() => joinAgency(ag.id)}
                    className="px-3 py-1.5 rounded-xl text-xs font-bold gradient-neon text-primary-foreground btn-nova"
                  >
                    انضمام
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
