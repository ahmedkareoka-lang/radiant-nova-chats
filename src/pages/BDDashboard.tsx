import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, Briefcase, TrendingUp, Target, DollarSign, Users, Search, UserPlus } from "lucide-react";
import { motion } from "framer-motion";
import { supabase } from "@/integrations/supabase/client";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import BDBadge from "@/components/BDBadge";

type FoundUser = { id: string; user_id: string; display_name: string; avatar_url: string | null };

type BDStats = {
  agency_count: number;
  total_support: number;
  total_commission: number;
  qualified_count: number;
  target_per_agency: number;
  commission_rate: number;
};

type BDAgencyRow = {
  id: string;
  agency_id: string;
  total_agency_support: number;
  total_commission_earned: number;
  is_target_reached: boolean;
  created_at: string;
  agency_name?: string;
};

const formatNum = (n: number) => new Intl.NumberFormat("en-US").format(n);

const BDDashboard = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [isBD, setIsBD] = useState(false);
  const [stats, setStats] = useState<BDStats | null>(null);
  const [agencies, setAgencies] = useState<BDAgencyRow[]>([]);

  // Search + activate
  const [searchId, setSearchId] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [activating, setActivating] = useState(false);

  const loadAll = async (uid: string) => {
    const { data: statsData } = await supabase.rpc("get_bd_stats" as any, { _bd_user_id: uid });
    if (statsData) setStats(statsData as unknown as BDStats);

    const { data: rows } = await supabase
      .from("bd_agencies" as any)
      .select("id, agency_id, total_agency_support, total_commission_earned, is_target_reached, created_at")
      .eq("bd_user_id", uid)
      .order("created_at", { ascending: false });

    const enriched: BDAgencyRow[] = [];
    for (const r of (rows as any[]) || []) {
      const { data: ag } = await supabase
        .from("agencies")
        .select("name")
        .eq("id", r.agency_id)
        .maybeSingle();
      enriched.push({ ...r, agency_name: (ag as any)?.name || "—" });
    }
    setAgencies(enriched);
  };

  useEffect(() => {
    (async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) { navigate("/login"); return; }

        const { data: profile } = await supabase
          .from("profiles")
          .select("is_bd")
          .eq("id", user.id)
          .maybeSingle();

        const isBDUser = !!(profile as any)?.is_bd;
        setIsBD(isBDUser);
        if (!isBDUser) { setLoading(false); return; }

        await loadAll(user.id);

      } catch (e: any) {
        toast.error(e.message || "خطأ في تحميل البيانات");
      } finally {
        setLoading(false);
      }
    })();
  }, [navigate]);

  const handleSearch = async () => {
    const id = searchId.trim();
    if (!id) { toast.error("أدخل ID المستخدم"); return; }
    setSearching(true);
    setFound(null);
    try {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, user_id, display_name, avatar_url")
        .eq("user_id", id)
        .maybeSingle();
      if (error) throw error;
      if (!data) { toast.error("لم يتم العثور على المستخدم"); return; }
      setFound(data as FoundUser);
    } catch (e: any) {
      toast.error(e.message || "خطأ في البحث");
    } finally {
      setSearching(false);
    }
  };

  const handleActivate = async () => {
    if (!found) return;
    setActivating(true);
    try {
      const { error } = await supabase.rpc("bd_activate_agency_for_user" as any, {
        _target_public_id: found.user_id,
      });
      if (error) throw error;
      toast.success(`تم تفعيل وكالة ${found.display_name} ✅`);
      setFound(null);
      setSearchId("");
      const { data: { user } } = await supabase.auth.getUser();
      if (user) await loadAll(user.id);
    } catch (e: any) {
      toast.error(e.message || "فشل التفعيل");
    } finally {
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!isBD) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center">
        <Briefcase size={48} className="text-muted-foreground" />
        <h2 className="text-xl font-bold">حساب BD غير مفعّل</h2>
        <p className="text-sm text-muted-foreground max-w-sm">
          لتفعيل حساب Business Developer (BD) يجب التواصل مع الإدارة أو حساب BOSS.
        </p>
        <button
          onClick={() => navigate("/")}
          className="mt-4 px-6 py-2 rounded-full bg-primary text-primary-foreground font-bold"
        >
          العودة للرئيسية
        </button>
      </div>
    );
  }

  const target = stats?.target_per_agency || 500000;

  return (
    <div className="min-h-screen pb-24 bg-gradient-to-b from-background via-background to-orange-950/10">
      {/* Header */}
      <header className="sticky top-0 z-30 bg-background/95 backdrop-blur border-b border-border">
        <div className="flex items-center gap-3 px-4 py-3">
          <button onClick={() => navigate(-1)} className="p-2 -ml-2">
            <ArrowRight size={22} />
          </button>
          <div className="flex-1">
            <h1 className="font-black text-lg flex items-center gap-2">
              لوحة BD <BDBadge size="md" />
            </h1>
            <p className="text-[11px] text-muted-foreground">Business Developer Dashboard</p>
          </div>
        </div>
      </header>

      <main className="p-4 space-y-4 max-w-2xl mx-auto">
        {/* Hero stats */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-3xl p-5 bg-gradient-to-br from-orange-600 via-orange-500 to-amber-500 text-white relative overflow-hidden shadow-[0_0_40px_hsl(25_100%_55%/0.5)]"
        >
          <div className="relative z-10">
            <div className="text-xs opacity-90 mb-1">إجمالي عمولاتك (نسبة {stats?.commission_rate || 10}%)</div>
            <div className="text-4xl font-black tracking-tight">
              {formatNum(stats?.total_commission || 0)} <span className="text-lg">💎</span>
            </div>
            <div className="mt-3 flex items-center gap-2 text-xs opacity-95">
              <Target size={14} />
              التارجت لكل وكالة: {formatNum(target)} ماسة
            </div>
          </div>
          <div className="absolute -right-6 -top-6 w-32 h-32 rounded-full bg-white/10 blur-2xl" />
        </motion.div>

        {/* Quick stat cards */}
        <div className="grid grid-cols-3 gap-3">
          <Card className="p-3 text-center">
            <Users size={18} className="mx-auto text-primary mb-1" />
            <div className="text-2xl font-black">{stats?.agency_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">وكالات</div>
          </Card>
          <Card className="p-3 text-center border-emerald-500/30">
            <TrendingUp size={18} className="mx-auto text-emerald-500 mb-1" />
            <div className="text-2xl font-black">{stats?.qualified_count || 0}</div>
            <div className="text-[10px] text-muted-foreground">حققت التارجت</div>
          </Card>
          <Card className="p-3 text-center">
            <DollarSign size={18} className="mx-auto text-orange-500 mb-1" />
            <div className="text-xl font-black">{formatNum(stats?.total_support || 0)}</div>
            <div className="text-[10px] text-muted-foreground">إجمالي الدعم</div>
          </Card>
        </div>

        {/* Activate agency by user ID */}
        <Card className="p-4 border-orange-500/30 bg-orange-500/5">
          <h3 className="font-bold text-sm mb-2 flex items-center gap-2">
            <UserPlus size={16} className="text-orange-500" /> تفعيل وكالة لمستخدم
          </h3>
          <p className="text-[11px] text-muted-foreground mb-3">
            ابحث عن المستخدم بـ ID المكوّن من 6 أرقام لتفعيل وكالته تحت إشرافك.
          </p>
          <div className="flex gap-2">
            <Input
              value={searchId}
              onChange={(e) => setSearchId(e.target.value.replace(/\D/g, "").slice(0, 6))}
              placeholder="مثال: 123456"
              inputMode="numeric"
              maxLength={6}
              className="flex-1"
            />
            <button
              onClick={handleSearch}
              disabled={searching || !searchId.trim()}
              className="px-4 rounded-lg bg-orange-500 text-white font-bold disabled:opacity-50 flex items-center gap-1"
            >
              <Search size={16} /> بحث
            </button>
          </div>

          {found && (
            <motion.div
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-3 p-3 rounded-xl bg-background border border-orange-500/30 flex items-center gap-3"
            >
              <img
                src={found.avatar_url || "https://i.pravatar.cc/100"}
                alt=""
                className="w-12 h-12 rounded-full object-cover"
              />
              <div className="flex-1 min-w-0">
                <div className="font-bold truncate">{found.display_name}</div>
                <div className="text-[10px] text-muted-foreground">ID: {found.user_id}</div>
              </div>
              <button
                onClick={handleActivate}
                disabled={activating}
                className="px-4 py-2 rounded-full bg-gradient-to-r from-orange-600 to-amber-500 text-white text-xs font-bold shadow-[0_0_14px_hsl(25_100%_55%/0.6)] disabled:opacity-50"
              >
                {activating ? "..." : "تفعيل وكالة"}
              </button>
            </motion.div>
          )}
        </Card>

        {/* Agencies list */}
        <div>
          <h3 className="font-bold text-sm mb-2 px-1">الوكالات تحت إشرافك</h3>
          {agencies.length === 0 ? (
            <Card className="p-6 text-center text-muted-foreground text-sm">
              لا توجد وكالات مسجلة بعد. الإدارة ستربط وكلاءك بحسابك.
            </Card>
          ) : (
            <div className="space-y-2">
              {agencies.map((a) => {
                const progress = Math.min(100, (a.total_agency_support / target) * 100);
                return (
                  <Card key={a.id} className="p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="font-bold text-sm">{a.agency_name}</div>
                      {a.is_target_reached ? (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-500 font-bold">
                          ✓ مؤهلة
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                          {Math.round(progress)}%
                        </span>
                      )}
                    </div>
                    <div className="h-1.5 rounded-full bg-muted overflow-hidden mb-2">
                      <div
                        className="h-full bg-gradient-to-r from-orange-500 to-amber-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[11px] text-muted-foreground">
                      <span>دعم: {formatNum(a.total_agency_support)} 💎</span>
                      <span>عمولتك: {formatNum(a.total_commission_earned)} 💎</span>
                    </div>
                  </Card>
                );
              })}
            </div>
          )}
        </div>

        {/* How it works */}
        <Card className="p-4 bg-orange-500/5 border-orange-500/20">
          <h4 className="font-bold text-sm mb-2 flex items-center gap-2">
            <Briefcase size={16} className="text-orange-500" /> كيف يعمل النظام؟
          </h4>
          <ul className="text-xs text-muted-foreground space-y-1 leading-relaxed">
            <li>• تحصل على <strong className="text-orange-500">20%</strong> من إجمالي دعم كل وكالة تحت إشرافك.</li>
            <li>• شرط الأهلية: تحقيق الوكالة لـ <strong>{formatNum(target)} ماسة</strong> دعم كحد أدنى.</li>
            <li>• الإدارة و BOSS هم من يربطون الوكلاء بحسابك.</li>
          </ul>
        </Card>
      </main>
    </div>
  );
};

export default BDDashboard;
