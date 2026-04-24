import { useState, useEffect } from "react";
import { ArrowLeft, Building2, Users, Plus, Crown, Check, X, Search, UserPlus, LogOut, Clock, Target, Mic, Gem, DollarSign, Calendar, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import PageTransition from "@/components/PageTransition";
import BottomNav from "@/components/BottomNav";
import CurrencyIcon from "@/components/CurrencyIcon";
import NovaSpinner from "@/components/NovaSpinner";
import EmptyState from "@/components/EmptyState";
import PayrollStructureBanner from "@/components/PayrollStructureBanner";
import SalaryDetailsModal from "@/components/SalaryDetailsModal";

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
  const [isAgent, setIsAgent] = useState(false);
  const [isHost, setIsHost] = useState(false);
  const [agencyEligible, setAgencyEligible] = useState(false);
  const [pendingAgencies, setPendingAgencies] = useState<any[]>([]);
  const [agencyHosts, setAgencyHosts] = useState<any[]>([]);
  const [searchId, setSearchId] = useState("");
  const [searchResult, setSearchResult] = useState<any>(null);
  const [pendingResignations, setPendingResignations] = useState<any[]>([]);
  const [hostStats, setHostStats] = useState<any>(null);
  const [hostDashboard, setHostDashboard] = useState<any>(null);
  const [hasOwnedAgency, setHasOwnedAgency] = useState(false);
  const [hostSalary, setHostSalary] = useState<any>(null);
  const [agencyPayroll, setAgencyPayroll] = useState<any>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsHost, setDetailsHost] = useState<{ id?: string; name?: string }>({});
  const [agencyOverview, setAgencyOverview] = useState<any>(null);
  const [hostEvents, setHostEvents] = useState<any>(null);
  const [showOverview, setShowOverview] = useState(false);
  const [showHostEvents, setShowHostEvents] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any>(null);
  const [sentInvites, setSentInvites] = useState<any[]>([]);
  const [processingInvite, setProcessingInvite] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      setUserId(user.id);

      const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
      setIsBoss(prof?.is_boss || false);
      setIsAgent(prof?.is_agent || false);
      setIsHost(prof?.is_host || false);

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

        if (membership.badge === "agent" || ag?.owner_id === user.id) {
          const { data: hosts } = await supabase.from("agency_members").select("*").eq("agency_id", membership.agency_id);
          if (hosts) {
            const ids = hosts.map(h => h.user_id);
            const { data: profiles } = await supabase.from("profiles").select("id, display_name, user_id, diamonds").in("id", ids);
            setAgencyHosts(hosts.map(h => ({ ...h, profile: profiles?.find(p => p.id === h.user_id) })));
          }

          // Load pending resignations
          const { data: resignations } = await supabase.from("agency_resignations").select("*").eq("agency_id", membership.agency_id).eq("status", "pending");
          if (resignations && resignations.length > 0) {
            const rIds = resignations.map(r => r.host_id);
            const { data: rProfiles } = await supabase.from("profiles").select("id, display_name, user_id").in("id", rIds);
            setPendingResignations(resignations.map(r => ({ ...r, profile: rProfiles?.find(p => p.id === r.host_id) })));
          }
        }

        // Host stats + cycle dashboard (today/cycle 15-day)
        if (membership.badge === "host") {
          const { count: giftCount } = await supabase.from("gift_transactions").select("*", { count: "exact", head: true }).eq("receiver_id", user.id);
          const { data: giftSum } = await supabase.from("gift_transactions").select("diamond_amount").eq("receiver_id", user.id);
          const totalDiamonds = giftSum?.reduce((sum: number, g: any) => sum + (g.diamond_amount || 0), 0) || 0;
          setHostStats({ totalGifts: giftCount || 0, totalDiamonds });

          const { data: dash } = await supabase.rpc("get_host_agency_dashboard" as any);
          if (dash) setHostDashboard(dash);

          // Monthly salary report (current month, day 1 to last)
          const { data: salary } = await supabase.rpc("get_host_monthly_salary" as any, {});
          if (salary) setHostSalary(salary);
        }

        // Agent: load monthly payroll for their agency (their hosts + 15% commission)
        if (membership.badge === "agent" || ag?.owner_id === user.id) {
          const { data: payroll } = await supabase.rpc("get_agency_payroll_report" as any, {});
          if (payroll && (payroll as any).has_agency) setAgencyPayroll(payroll);

          // Full agency overview (hosts + 15-day cycle stats)
          const { data: ov } = await supabase.rpc("get_my_agency_overview" as any);
          if (ov && (ov as any).has_agency) setAgencyOverview(ov);
        }

        // Host: full event log within the 15-day cycle
        if (membership.badge === "host") {
          const { data: ev } = await supabase.rpc("get_my_host_events" as any);
          if (ev && (ev as any).has_agency) setHostEvents(ev);
        }
      }

      // Track if this user already owns an agency (any status) — for the "one agency per agent" rule
      const { data: ownedAgencies } = await supabase.from("agencies").select("id").eq("owner_id", user.id);
      setHasOwnedAgency((ownedAgencies?.length || 0) > 0);

      setLoading(false);
    };
    load();
  }, []);

  const applyForAgency = async () => {
    if (!agencyName.trim()) return;
    if (hasOwnedAgency) { toast.error("لديك وكالة بالفعل — لا يمكن إنشاء وكالة أخرى"); return; }
    if (myMembership) { toast.error("أنت عضو في وكالة بالفعل"); return; }
    const { error } = await supabase.from("agencies").insert({ name: agencyName, owner_id: userId, status: "pending" });
    if (error) {
      if (error.code === "23505") toast.error("لديك وكالة مسجلة مسبقاً");
      else toast.error("فشل التقديم: " + error.message);
      return;
    }
    setHasOwnedAgency(true);
    const { data: boss } = await supabase.from("profiles").select("id").eq("is_boss", true).single();
    if (boss) {
      await supabase.from("notifications").insert({
        user_id: boss.id, title: "طلب وكالة جديد 🏢",
        message: `طلب إنشاء وكالة "${agencyName}" بانتظار الموافقة`, type: "agency",
      });
    }
    toast.success("تم إرسال طلب الوكالة! ⏳");
    setShowCreate(false);
    setAgencyName("");
  };

  const approveAgency = async (agencyId: string) => {
    await supabase.from("agencies").update({ status: "approved" }).eq("id", agencyId);
    const ag = pendingAgencies.find(a => a.id === agencyId);
    if (ag) {
      await supabase.from("agency_members").insert({ agency_id: agencyId, user_id: ag.owner_id, role: "owner", badge: "agent" });
      await supabase.from("notifications").insert({
        user_id: ag.owner_id, title: "تمت الموافقة! ✅",
        message: `تم قبول وكالتك "${ag.name}"!`, type: "agency",
      });
    }
    setPendingAgencies(prev => prev.filter(a => a.id !== agencyId));
    toast.success("تمت الموافقة! ✅");
  };

  const rejectAgency = async (agencyId: string) => {
    await supabase.from("agencies").update({ status: "rejected", is_active: false }).eq("id", agencyId);
    setPendingAgencies(prev => prev.filter(a => a.id !== agencyId));
    toast.info("تم رفض الوكالة");
  };

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase.from("profiles").select("id, display_name, user_id, avatar_url, is_host, agency_id").eq("user_id", searchId.trim()).single();
    setSearchResult(data || null);
    if (!data) toast.error("لم يتم العثور على المستخدم");
  };

  const inviteAsHost = async () => {
    if (!searchResult || !myAgency) return;
    if (searchResult.is_host) { toast.error("هذا المستخدم مضيف بالفعل!"); return; }
    
    await supabase.from("agency_invites").insert({
      agency_id: myAgency.id, agent_id: userId, target_user_id: searchResult.id,
    });
    await supabase.from("notifications").insert({
      user_id: searchResult.id, title: "دعوة وكالة 🏢",
      message: `تم دعوتك للانضمام كمضيف في وكالة "${myAgency.name}"`, type: "agency_invite",
    });
    toast.success("تم إرسال الدعوة! 📨");
    setSearchResult(null);
    setSearchId("");
  };

  const removeHost = async (hostId: string) => {
    if (!myAgency) return;
    const { error } = await supabase.rpc("remove_agency_host", {
      _agent_id: userId, _host_id: hostId, _agency_id: myAgency.id,
    });
    if (error) { toast.error("فشل في إزالة المضيف"); return; }
    setAgencyHosts(prev => prev.filter(h => h.user_id !== hostId));
    toast.success("تم إزالة المضيف");
  };

  const requestResignation = async () => {
    if (!myAgency) return;
    await supabase.from("agency_resignations").insert({ agency_id: myAgency.id, host_id: userId });
    await supabase.from("notifications").insert({
      user_id: myAgency.owner_id, title: "طلب استقالة 📋",
      message: `طلب استقالة من مضيف في وكالتك`, type: "agency",
    });
    toast.success("تم إرسال طلب الاستقالة! ⏳");
  };

  const approveResignation = async (resignationId: string) => {
    const { error } = await supabase.rpc("approve_resignation", {
      _agent_id: userId, _resignation_id: resignationId,
    });
    if (error) { toast.error("فشل"); return; }
    setPendingResignations(prev => prev.filter(r => r.id !== resignationId));
    toast.success("تمت الموافقة على الاستقالة");
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
                  <p className="font-bold text-sm">{ag.name}</p>
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
            <div className="card-nova p-4 border border-primary/30 space-y-3">
              <div className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-accent" />
                <h3 className="font-bold text-sm">وكالتي</h3>
                <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-primary/20 text-primary font-bold">
                  {myMembership?.badge === "agent" ? "وكيل 🏅" : "مضيف 🎤"}
                </span>
              </div>
              <p className="font-bold text-lg">{myAgency.name}</p>

              {/* Inline payroll-policy banner — appears INSIDE the agency system for hosts and agents */}
              <PayrollStructureBanner />

              {/* Agent: button to open agency overview */}
              {(myMembership?.badge === "agent" || myAgency.owner_id === userId) && agencyOverview && (
                <button
                  onClick={() => setShowOverview(!showOverview)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 text-primary text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Users className="w-4 h-4" />
                  {showOverview ? "إخفاء" : "عرض"} وكالتي ({agencyOverview.host_count} مضيف)
                </button>
              )}

              {/* Host: button to open agency events log */}
              {myMembership?.badge === "host" && hostEvents && (
                <button
                  onClick={() => setShowHostEvents(!showHostEvents)}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-primary/20 to-accent/20 border border-primary/40 text-primary text-sm font-bold flex items-center justify-center gap-2"
                >
                  <Calendar className="w-4 h-4" />
                  وكالتي: {hostEvents.agency_name} — {showHostEvents ? "إخفاء" : "عرض"} أحداث الـ15 يوم
                </button>
              )}

              {/* Agent: full agency overview drawer */}
              {showOverview && agencyOverview && (
                <div className="rounded-2xl border border-primary/30 bg-secondary/30 p-3 space-y-3">
                  <div className="flex items-center justify-between">
                    <p className="text-xs font-bold flex items-center gap-1"><Building2 className="w-3 h-3 text-primary" />{agencyOverview.agency_name}</p>
                    <p className="text-[10px] text-muted-foreground">دورة: {agencyOverview.cycle_label}</p>
                  </div>
                  {(agencyOverview.hosts || []).length === 0 ? (
                    <p className="text-[11px] text-muted-foreground text-center py-3">لا يوجد مضيفون بعد — قم بدعوة مضيف من خانة البحث.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {(agencyOverview.hosts || []).map((h: any) => {
                        const meetsTarget = h.cycle_active_days >= 8 && (h.cycle_minutes / 60) >= 20;
                        return (
                          <button
                            key={h.host_id}
                            onClick={() => { setDetailsHost({ id: h.host_id, name: h.display_name }); setDetailsOpen(true); }}
                            className="w-full bg-card/70 hover:bg-card rounded-xl p-2.5 flex items-center gap-2 text-right transition-colors"
                          >
                            <img src={h.avatar_url || "https://i.pravatar.cc/40"} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
                            <div className="flex-1 min-w-0">
                              <p className="text-xs font-bold truncate flex items-center gap-1">
                                {h.display_name || "—"} {meetsTarget ? "✅" : "⚠️"}
                              </p>
                              <p className="text-[9px] text-muted-foreground">ID: {h.friendly_id}</p>
                            </div>
                            <div className="text-left flex-shrink-0">
                              <p className="text-[10px] text-primary font-bold">{Number(h.cycle_diamonds).toLocaleString()} 💎</p>
                              <p className="text-[9px] text-muted-foreground">{(h.cycle_minutes/60).toFixed(1)}h • {h.cycle_active_days}/8 يوم</p>
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Host: events log drawer */}
              {showHostEvents && hostEvents && (
                <div className="rounded-2xl border border-primary/30 bg-secondary/30 p-3 space-y-3">
                  <p className="text-[10px] text-muted-foreground text-center">دورة: {hostEvents.cycle_label}</p>
                  <div className="space-y-1">
                    <p className="text-[11px] font-bold text-muted-foreground">📅 سجل اليومي</p>
                    {(hostEvents.daily_log || []).map((d: any) => (
                      <div key={d.date} className="bg-card/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                        <span className="font-bold">{new Date(d.date).toLocaleDateString("ar-EG", { day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-2">
                          <span className="text-primary">{Number(d.diamonds).toLocaleString()}💎</span>
                          <span className="text-accent">{(d.minutes/60).toFixed(1)}h</span>
                          <span>{d.is_active ? "✅" : "—"}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                  {(hostEvents.recent_gifts || []).length > 0 && (
                    <div className="space-y-1">
                      <p className="text-[11px] font-bold text-muted-foreground">🎁 آخر الهدايا</p>
                      {(hostEvents.recent_gifts || []).slice(0, 8).map((g: any, i: number) => (
                        <div key={i} className="bg-card/60 rounded-lg px-2.5 py-1.5 flex items-center justify-between text-[11px]">
                          <span className="truncate flex-1">{g.gift_name} • <span className="text-muted-foreground">{g.sender_name || "—"}</span></span>
                          <span className="text-primary font-bold flex-shrink-0">+{g.diamond_amount}💎</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}


              {/* Host: today + 15-day cycle banner */}
              {myMembership?.badge === "host" && hostDashboard?.has_agency && (
                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-primary/10 rounded-xl p-3 text-center space-y-1">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Gem className="w-3 h-3" />دعم اليوم</p>
                      <p className="font-extrabold text-base text-primary">{Number(hostDashboard.today_diamonds || 0).toLocaleString()} 💎</p>
                    </div>
                    <div className="bg-accent/10 rounded-xl p-3 text-center space-y-1">
                      <p className="text-[10px] text-muted-foreground flex items-center justify-center gap-1"><Mic className="w-3 h-3" />ساعات اليوم</p>
                      <p className="font-extrabold text-base text-accent">{(Number(hostDashboard.today_minutes || 0) / 60).toFixed(1)}h</p>
                    </div>
                  </div>
                  <div className="bg-secondary/40 rounded-xl p-3 space-y-2 border border-primary/20">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold flex items-center gap-1"><Target className="w-3 h-3 text-primary" />دورة التارجت</p>
                      <p className="text-[10px] text-muted-foreground">{hostDashboard.cycle_label}</p>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-center">
                      <div>
                        <p className="text-[10px] text-muted-foreground">ماس الدورة</p>
                        <p className="text-sm font-extrabold text-primary">{Number(hostDashboard.cycle_diamonds || 0).toLocaleString()} 💎</p>
                      </div>
                      <div>
                        <p className="text-[10px] text-muted-foreground">ساعات الدورة</p>
                        <p className="text-sm font-extrabold text-accent">{(Number(hostDashboard.cycle_minutes || 0) / 60).toFixed(1)}h</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Host stats (lifetime) */}
              {myMembership?.badge === "host" && hostStats && (
                <div className="grid grid-cols-3 gap-2">
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">إجمالي الهدايا</p>
                    <p className="font-bold text-lg text-accent">{hostStats.totalGifts}</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">إجمالي الماس</p>
                    <p className="font-bold text-lg text-primary">{hostStats.totalDiamonds.toLocaleString()} 💎</p>
                  </div>
                  <div className="bg-secondary/50 rounded-xl p-3 text-center">
                    <p className="text-xs text-muted-foreground">ساعات البث</p>
                    <p className="font-bold text-lg text-primary">{Number(myMembership?.mic_hours || 0).toFixed(1)} 🎙️</p>
                  </div>
                </div>
              )}

              {/* Host: monthly salary card */}
              {myMembership?.badge === "host" && hostSalary && (
                <div className="rounded-2xl p-4 space-y-3 border border-primary/40 bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-accent" />
                      <p className="font-bold text-sm">راتب الدورة (15 يوم)</p>
                    </div>
                    <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                      <Calendar className="w-3 h-3" /> {hostSalary.cycle_label || `${hostSalary.month_start} → ${hostSalary.month_end}`}
                    </p>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card/60 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">إجمالي الماس</p>
                      <p className="font-extrabold text-base text-primary">{Number(hostSalary.total_diamonds || 0).toLocaleString()} 💎</p>
                    </div>
                    <div className="bg-card/60 rounded-xl p-3 text-center">
                      <p className="text-[10px] text-muted-foreground">الراتب الأساسي</p>
                      <p className="font-extrabold text-base text-accent">${Number(hostSalary.base_salary_usd || 0).toLocaleString()}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className={`rounded-xl p-2 text-center border ${hostSalary.meets_days ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"}`}>
                      <p className="text-[10px] text-muted-foreground">أيام نشطة</p>
                      <p className="font-bold text-sm">{hostSalary.active_days} / {hostSalary.required_days} {hostSalary.meets_days ? "✅" : "⚠️"}</p>
                    </div>
                    <div className={`rounded-xl p-2 text-center border ${hostSalary.meets_hours ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"}`}>
                      <p className="text-[10px] text-muted-foreground">ساعات البث</p>
                      <p className="font-bold text-sm">{Number(hostSalary.total_hours || 0).toFixed(1)} / {hostSalary.required_hours}h {hostSalary.meets_hours ? "✅" : "⚠️"}</p>
                    </div>
                  </div>

                  {hostSalary.penalty_pct > 0 && (
                    <div className="bg-destructive/10 border border-destructive/30 rounded-xl p-2 flex items-center gap-2 text-[10px] text-destructive">
                      <AlertCircle className="w-3 h-3 flex-shrink-0" />
                      <span>لم يتم استيفاء شروط الالتزام — يتم تطبيق خصم {hostSalary.penalty_pct}%</span>
                    </div>
                  )}

                  <div className="bg-primary/20 rounded-xl p-3 text-center border border-primary/40">
                    <p className="text-[10px] text-muted-foreground">الراتب الصافي للدورة</p>
                    <p className="font-extrabold text-2xl text-primary">${Number(hostSalary.final_salary_usd || 0).toLocaleString()}</p>
                  </div>

                  <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                    💡 معدل التحويل: 100,000 ماسة = $8 • لكل دورة 15 يوم: 8 أيام نشطة + 20 ساعة بث
                  </p>

                  <button
                    onClick={() => { setDetailsHost({ id: userId }); setDetailsOpen(true); }}
                    className="w-full py-2 rounded-xl bg-primary/15 border border-primary/40 text-primary text-xs font-bold flex items-center justify-center gap-2"
                  >
                    📋 عرض تفاصيل الراتب الكاملة
                  </button>
                </div>
              )}
              {myMembership?.badge === "host" && (
                <button onClick={requestResignation}
                  className="w-full py-2 rounded-xl border border-destructive/30 text-destructive text-xs font-bold flex items-center justify-center gap-2">
                  <LogOut className="w-3 h-3" /> طلب استقالة
                </button>
              )}

              {/* Agent: Search & Invite */}
              {(myMembership?.badge === "agent" || myAgency.owner_id === userId) && (
                <>
                  {/* Agent: monthly payroll panel for the whole agency */}
                  {agencyPayroll && (
                    <div className="rounded-2xl p-4 space-y-3 border border-accent/40 bg-gradient-to-br from-accent/10 to-primary/10">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <DollarSign className="w-5 h-5 text-accent" />
                          <p className="font-bold text-sm">رواتب الوكالة (دورة 15 يوم)</p>
                        </div>
                        <p className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Calendar className="w-3 h-3" /> {agencyPayroll.cycle_label || `${agencyPayroll.month_start} → ${agencyPayroll.month_end}`}
                        </p>
                      </div>

                      <div className="grid grid-cols-3 gap-2 text-center">
                        <div className="bg-card/60 rounded-xl p-2">
                          <p className="text-[10px] text-muted-foreground">رواتب المضيفين</p>
                          <p className="font-bold text-sm text-primary">${Number(agencyPayroll.total_salaries_usd).toLocaleString()}</p>
                        </div>
                        <div className="bg-card/60 rounded-xl p-2">
                          <p className="text-[10px] text-muted-foreground">عمولتك (15%)</p>
                          <p className="font-bold text-sm text-accent">${Number(agencyPayroll.agent_commission_usd).toLocaleString()}</p>
                        </div>
                        <div className="bg-primary/20 rounded-xl p-2 border border-primary/40">
                          <p className="text-[10px] text-muted-foreground">المجموع</p>
                          <p className="font-bold text-sm text-primary">${Number(agencyPayroll.grand_total_usd).toLocaleString()}</p>
                        </div>
                      </div>

                      {(agencyPayroll.hosts || []).length > 0 && (
                        <div className="space-y-1.5">
                          <p className="text-[10px] font-bold text-muted-foreground">رواتب المضيفين</p>
                          {(agencyPayroll.hosts || []).map((h: any) => (
                            <button
                              key={h.host_id}
                              onClick={() => { setDetailsHost({ id: h.host_id, name: h.display_name }); setDetailsOpen(true); }}
                              className="w-full bg-card/60 hover:bg-card/80 transition-colors rounded-xl p-2 flex items-center justify-between text-[11px]"
                            >
                              <div className="flex items-center gap-2">
                                <span className="font-bold">{h.display_name || "—"}</span>
                                {h.meets_target ? <span>✅</span> : <span title="لم يستوفِ الشروط">⚠️</span>}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="text-muted-foreground">{Number(h.diamonds).toLocaleString()}💎</span>
                                <span className="font-bold text-primary">${Number(h.final_salary_usd).toLocaleString()}</span>
                                <span className="text-[9px] text-primary/70">›</span>
                              </div>
                            </button>
                          ))}
                        </div>
                      )}
                      <p className="text-[9px] text-muted-foreground/70 text-center">اضغط على اسم المضيف لعرض التفاصيل الكاملة</p>

                      <p className="text-[9px] text-muted-foreground text-center leading-relaxed">
                        💡 100,000 ماس = $8 • شرط: 15 يوم + 40 ساعة • خصم 20% عند المخالفة
                      </p>
                    </div>
                  )}

                  <div className="space-y-2">
                    <h4 className="text-xs font-bold text-muted-foreground">دعوة مضيف جديد</h4>
                    <div className="flex gap-2">
                      <input type="text" placeholder="أدخل ID المستخدم" value={searchId} onChange={(e) => setSearchId(e.target.value)}
                        className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary" />
                      <button onClick={searchUser} className="px-3 py-2 rounded-xl gradient-neon text-primary-foreground">
                        <Search className="w-4 h-4" />
                      </button>
                    </div>
                    {searchResult && (
                      <div className="bg-secondary/50 rounded-xl p-3 flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full overflow-hidden">
                          <img src={searchResult.avatar_url || "https://i.pravatar.cc/60"} alt="" className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-bold">{searchResult.display_name}</p>
                          <p className="text-[10px] text-muted-foreground">ID: {searchResult.user_id}</p>
                        </div>
                        <button onClick={inviteAsHost} className="px-3 py-1.5 rounded-xl text-xs font-bold gradient-neon text-primary-foreground flex items-center gap-1">
                          <UserPlus className="w-3 h-3" /> دعوة
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Pending resignations */}
                  {pendingResignations.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-accent">📋 طلبات استقالة</h4>
                      {pendingResignations.map((r) => (
                        <div key={r.id} className="bg-secondary/50 rounded-xl p-3 flex items-center justify-between">
                          <p className="text-sm font-bold">{r.profile?.display_name || "مضيف"}</p>
                          <button onClick={() => approveResignation(r.id)}
                            className="px-3 py-1 rounded-xl text-xs bg-green-500/20 text-green-400 font-bold">قبول</button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Hosts list */}
                  {agencyHosts.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-muted-foreground">المضيفون ({agencyHosts.length})</h4>
                      {agencyHosts.map((h) => (
                        <div key={h.id} className="flex items-center justify-between bg-secondary/50 rounded-xl p-2">
                          <div>
                            <p className="text-xs font-bold">{h.profile?.display_name || "—"}</p>
                            <p className="text-[9px] text-muted-foreground">ID: {h.profile?.user_id}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <p className="text-[9px] text-muted-foreground">{Number(h.mic_hours || 0).toFixed(1)}h 🎙️</p>
                            <p className="text-xs font-bold text-accent">{(h.total_support || 0).toLocaleString()} 💎</p>
                            {h.badge !== "agent" && (
                              <button onClick={() => removeHost(h.user_id)} className="w-6 h-6 rounded-full bg-destructive/20 flex items-center justify-center">
                                <X className="w-3 h-3 text-destructive" />
                              </button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* Apply for agency — only if not in any agency AND doesn't already own one */}
          {!myAgency && !hasOwnedAgency && (
            <button onClick={() => setShowCreate(!showCreate)}
              className="w-full py-3 rounded-2xl border border-dashed border-primary/50 text-primary font-bold text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> تقديم طلب وكالة جديدة
            </button>
          )}
          {!myAgency && hasOwnedAgency && (
            <div className="card-nova p-3 text-center text-xs text-muted-foreground border border-accent/30">
              ⏳ لديك طلب وكالة قيد المراجعة — لا يمكن إنشاء وكالة أخرى
            </div>
          )}

          {showCreate && !hasOwnedAgency && (
            <div className="card-nova p-4 space-y-3">
              <p className="text-[10px] text-muted-foreground">سيتم مراجعة طلبك من قبل الإدارة. يمكن للوكيل إنشاء وكالة واحدة فقط.</p>
              <input type="text" placeholder="اسم الوكالة" value={agencyName} onChange={(e) => setAgencyName(e.target.value)}
                className="w-full bg-secondary/50 rounded-xl px-3 py-2 text-sm border border-border focus:outline-none" />
              <button onClick={applyForAgency} className="w-full py-2 rounded-xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">تقديم الطلب</button>
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
              </div>
            ))}
            {agencies.length === 0 && !loading && (
              <EmptyState icon="🏢" title="لا توجد وكالات حالياً" subtitle="كن أول من ينشئ وكالة!" />
            )}
          </div>
        </main>

        <BottomNav />

        <SalaryDetailsModal
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          hostId={detailsHost.id}
          hostName={detailsHost.name}
        />
      </div>
    </PageTransition>
  );
};

export default AgenciesPage;
