import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowRight, ShieldCheck, Search, Crown, Mic2, Coins } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface QARow {
  agency_id: string;
  agency_name: string | null;
  agency_owner_id: string;
  member_id: string;
  member_role: string | null;
  member_name: string | null;
  is_agent: boolean | null;
  is_host: boolean | null;
  support_target_coins: number | null;
  hours_target: number | null;
  joined_at: string | null;
}

const formatNum = (n: number | null | undefined) => {
  const v = Number(n || 0);
  if (v >= 1_000_000) return (v / 1_000_000).toFixed(1) + "M";
  if (v >= 1_000) return (v / 1_000).toFixed(1) + "K";
  return String(v);
};

const AgencyQAPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [allowed, setAllowed] = useState(false);
  const [rows, setRows] = useState<QARow[]>([]);
  const [filter, setFilter] = useState("");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }

      const { data: prof } = await supabase
        .from("profiles")
        .select("is_boss, is_bd, id")
        .eq("id", user.id)
        .single();

      const { data: ownedAgencies } = await supabase
        .from("agencies")
        .select("id")
        .eq("owner_id", user.id)
        .eq("is_active", true);

      const isAuthorized = !!prof?.is_boss || !!prof?.is_bd || ((ownedAgencies?.length ?? 0) > 0);
      if (cancelled) return;
      setAllowed(isAuthorized);
      if (!isAuthorized) { setLoading(false); return; }

      // Fetch QA rows — scoped to owned agencies if user is just an owner.
      let query = supabase.from("agency_target_qa" as any).select("*").order("support_target_coins", { ascending: false });
      if (!prof?.is_boss && !prof?.is_bd) {
        const ids = (ownedAgencies || []).map((a) => a.id);
        if (ids.length === 0) { setRows([]); setLoading(false); return; }
        query = query.in("agency_id", ids);
      }
      const { data, error } = await query;
      if (error) {
        toast.error("تعذر تحميل بيانات QA");
        setLoading(false);
        return;
      }
      if (cancelled) return;
      setRows((data as unknown as QARow[]) || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [navigate]);

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      (r.member_name || "").toLowerCase().includes(q) ||
      (r.agency_name || "").toLowerCase().includes(q) ||
      r.member_id.toLowerCase().includes(q)
    );
  }, [rows, filter]);

  const grouped = useMemo(() => {
    const map = new Map<string, { name: string; rows: QARow[]; totalSupport: number; totalHours: number }>();
    for (const r of filtered) {
      const key = r.agency_id;
      const bucket = map.get(key) || { name: r.agency_name || "وكالة", rows: [], totalSupport: 0, totalHours: 0 };
      bucket.rows.push(r);
      bucket.totalSupport += Number(r.support_target_coins || 0);
      bucket.totalHours += Number(r.hours_target || 0);
      map.set(key, bucket);
    }
    return Array.from(map.entries());
  }, [filtered]);

  if (loading) {
    return <div className="min-h-screen bg-background flex items-center justify-center text-muted-foreground">جارٍ التحميل…</div>;
  }

  if (!allowed) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center p-6 text-center">
        <div className="space-y-3">
          <ShieldCheck className="w-12 h-12 mx-auto text-muted-foreground" />
          <h1 className="text-xl font-bold">صلاحية غير متاحة</h1>
          <p className="text-sm text-muted-foreground">هذه الشاشة مخصصة لـ BOSS و BD ومالكي الوكالات فقط.</p>
          <button onClick={() => navigate(-1)} className="px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm">رجوع</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-20">
      <header className="sticky top-0 z-10 bg-background/90 backdrop-blur border-b border-border px-4 py-3 flex items-center gap-2">
        <button onClick={() => navigate(-1)} className="p-1.5 rounded-lg hover:bg-muted">
          <ArrowRight className="w-5 h-5" />
        </button>
        <ShieldCheck className="w-5 h-5 text-emerald-500" />
        <h1 className="font-bold">QA — تحقق تارجت الوكالات</h1>
      </header>

      <div className="px-4 py-3">
        <div className="relative">
          <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <input
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            placeholder="بحث باسم العضو أو الوكالة أو ID…"
            className="w-full pr-9 pl-3 py-2 rounded-lg bg-muted/40 border border-border text-sm"
          />
        </div>
      </div>

      <div className="px-4 space-y-4">
        {grouped.length === 0 && (
          <p className="text-center text-sm text-muted-foreground py-12">لا توجد بيانات لعرضها.</p>
        )}
        {grouped.map(([id, g]) => (
          <section key={id} className="rounded-2xl border border-border bg-card overflow-hidden">
            <header className="px-4 py-3 bg-muted/40 flex items-center justify-between">
              <div className="font-bold text-sm">{g.name}</div>
              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                <span className="flex items-center gap-1"><Coins className="w-3.5 h-3.5 text-amber-500" /> {formatNum(g.totalSupport)}</span>
                <span className="flex items-center gap-1"><Mic2 className="w-3.5 h-3.5 text-sky-500" /> {g.totalHours.toFixed(1)}h</span>
              </div>
            </header>
            <ul className="divide-y divide-border">
              {g.rows.map((r) => (
                <li key={`${r.agency_id}-${r.member_id}`} className="px-4 py-2.5 flex items-center gap-2 text-sm">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <span className="font-semibold truncate">{r.member_name || r.member_id.slice(0, 6)}</span>
                      {r.is_agent && <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-bold">وكيل</span>}
                      {r.is_host && <span className="text-[9px] px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-0.5"><Crown className="w-2.5 h-2.5" />مضيف</span>}
                      {r.member_role === "owner" && <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 font-bold">مالك</span>}
                    </div>
                    <div className="text-[10px] text-muted-foreground font-mono mt-0.5">{r.member_id.slice(0, 12)}…</div>
                  </div>
                  <div className="text-right tabular-nums">
                    <div className="text-amber-400 font-bold flex items-center gap-1 justify-end">
                      <Coins className="w-3 h-3" /> {formatNum(r.support_target_coins)}
                    </div>
                    <div className="text-sky-400 text-[11px] flex items-center gap-1 justify-end">
                      <Mic2 className="w-3 h-3" /> {Number(r.hours_target || 0).toFixed(1)}h
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
};

export default AgencyQAPage;
