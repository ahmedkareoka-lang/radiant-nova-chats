import { useState, useEffect, useRef } from "react";
import { ArrowLeft, Building2, Users, Plus, Crown, Check, X, Search, UserPlus, LogOut, Clock, Target, Mic, Gem, DollarSign, Calendar, AlertCircle, Camera, Pencil, Save, ImageIcon } from "lucide-react";
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
  // NEW — search-by-code + join requests
  const [codeQuery, setCodeQuery] = useState("");
  const [searchedAgency, setSearchedAgency] = useState<any>(null);
  const [searchingAgency, setSearchingAgency] = useState(false);
  const [joinRequests, setJoinRequests] = useState<any[]>([]);     // for owner
  const [myJoinRequests, setMyJoinRequests] = useState<any[]>([]); // for applicant
  // Agency profile edit
  const [showEditAgency, setShowEditAgency] = useState(false);
  const [editName, setEditName] = useState("");
  const [savingAgencyName, setSavingAgencyName] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [nowTick, setNowTick] = useState(Date.now());
  const logoInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 60_000);
    return () => clearInterval(id);
  }, []);

  const formatCountdown = (target: string | null | undefined) => {
    if (!target) return null;
    const diff = new Date(target).getTime() - nowTick;
    if (diff <= 0) return null;
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    return `${d}ي ${h}س ${m}د`;
  };

  const saveAgencyName = async () => {
    const trimmed = editName.trim();
    if (!trimmed || trimmed === myAgency?.name) { setShowEditAgency(false); return; }
    setSavingAgencyName(true);
    const { data, error } = await supabase.rpc("update_agency_profile" as any, { _new_name: trimmed, _new_logo_url: null });
    setSavingAgencyName(false);
    if (error) { toast.error(error.message); return; }
    const res = data as any;
    if (!res?.ok) {
      if (res?.error === "name_cooldown") {
        toast.error(`لا يمكن تغيير الاسم الآن — تبقى ${formatCountdown(res.next_name_change_at) || "—"}`);
      } else { toast.error(res?.error || "فشل التحديث"); }
      return;
    }
    toast.success("تم تحديث اسم الوكالة ✨");
    setShowEditAgency(false);
    await loadAll();
  };

  const uploadAgencyLogo = async (file: File) => {
    setUploadingLogo(true);
    try {
      const ext = (file.name.split(".").pop() || "png").toLowerCase();
      // First folder MUST equal auth.uid() for storage RLS to allow the upload.
      const path = `${userId}/agency-logos/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("assets").upload(path, file, { upsert: true, contentType: file.type || undefined });
      if (upErr) throw upErr;
      const { data: urlData } = supabase.storage.from("assets").getPublicUrl(path);
      const { data, error } = await supabase.rpc("update_agency_profile" as any, { _new_name: null, _new_logo_url: urlData.publicUrl });
      if (error) throw error;
      const res = data as any;
      if (!res?.ok) {
        if (res?.error === "logo_cooldown") {
          toast.error(`لا يمكن تغيير الشعار الآن — تبقى ${formatCountdown(res.next_logo_change_at) || "—"}`);
        } else { toast.error(res?.error || "فشل تحديث الشعار"); }
        return;
      }
      toast.success("تم تحديث شعار الوكالة 🖼️");
      await loadAll();
    } catch (e: any) {
      toast.error(e.message || "فشل رفع الصورة");
    } finally {
      setUploadingLogo(false);
    }
  };


  const loadAll = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;
    setUserId(user.id);

    const { data: prof } = await supabase.from("profiles").select("*").eq("id", user.id).single();
    setIsBoss(prof?.is_boss || false);
    setIsAgent(prof?.is_agent || false);
    setIsHost(prof?.is_host || false);
    setAgencyEligible(!!(prof as any)?.agency_eligible);

    const { data: all } = await supabase.from("agencies").select("*").eq("status", "approved").eq("is_active", true);
    setAgencies(all || []);

    if (prof?.is_boss) {
      const { data: pending } = await supabase.from("agencies").select("*").eq("status", "pending");
      setPendingAgencies(pending || []);
    }

    // Pending invites for THIS user (host inbox) — rich preview with own 15-day target stats
    const { data: invData } = await supabase.rpc("get_my_pending_invites" as any);
    if (invData) setPendingInvites(invData);

    // Find the user's agency: either via membership OR direct ownership (owners may not have a membership row)
    const { data: membership } = await supabase.from("agency_members").select("*").eq("user_id", user.id).maybeSingle();
    let activeAgency: any = null;
    let isOwnerView = false;

    if (membership) {
      setMyMembership(membership);
      const { data: ag } = await supabase.from("agencies").select("*").eq("id", membership.agency_id).single();
      activeAgency = ag;
    } else {
      // No membership row — check if this user owns an approved+active agency
      const { data: ownedAg } = await supabase
        .from("agencies").select("*")
        .eq("owner_id", user.id).eq("status", "approved").eq("is_active", true)
        .maybeSingle();
      if (ownedAg) { activeAgency = ownedAg; isOwnerView = true; }
    }

    if (activeAgency) {
      setMyAgency(activeAgency);
      const isAgentView = membership?.badge === "agent" || activeAgency.owner_id === user.id;

      if (isAgentView) {
        const { data: hosts } = await supabase.from("agency_members").select("*").eq("agency_id", activeAgency.id);
        if (hosts) {
          const ids = hosts.map(h => h.user_id);
          const { data: profiles } = ids.length
            ? await supabase.from("profiles").select("id, display_name, user_id, diamonds").in("id", ids)
            : { data: [] as any[] };
          setAgencyHosts(hosts.map(h => ({ ...h, profile: profiles?.find(p => p.id === h.user_id) })));
        }

        // Load pending resignations
        const { data: resignations } = await supabase.from("agency_resignations").select("*").eq("agency_id", activeAgency.id).eq("status", "pending");
        if (resignations && resignations.length > 0) {
          const rIds = resignations.map(r => r.host_id);
          const { data: rProfiles } = await supabase.from("profiles").select("id, display_name, user_id").in("id", rIds);
          setPendingResignations(resignations.map(r => ({ ...r, profile: rProfiles?.find(p => p.id === r.host_id) })));
        }

        // Sent invites status (for agent panel)
        const { data: sent } = await supabase.rpc("get_my_sent_invites" as any);
        if (sent && (sent as any).invites) setSentInvites((sent as any).invites);

        // Agent: monthly payroll + 15-day overview
        const { data: payroll } = await supabase.rpc("get_agency_payroll_report" as any, {});
        if (payroll && (payroll as any).has_agency) setAgencyPayroll(payroll);

        const { data: ov } = await supabase.rpc("get_my_agency_overview" as any);
        if (ov && (ov as any).has_agency) setAgencyOverview(ov);
      }

      // Host stats + cycle dashboard (today/cycle 15-day)
      const isTargetTrackedHost = membership?.badge === "host" || membership?.role === "owner" || activeAgency?.owner_id === user.id;
      if (isTargetTrackedHost) {
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

      // Host: full event log within the 15-day cycle
      if (isTargetTrackedHost) {
        const { data: ev } = await supabase.rpc("get_my_host_events" as any);
        if (ev && (ev as any).has_agency) setHostEvents(ev);
      }
    }

    // Track if this user already owns an agency (any status) — for the "one agency per agent" rule
    const { data: ownedAgencies } = await supabase.from("agencies").select("id").eq("owner_id", user.id);
    setHasOwnedAgency((ownedAgencies?.length || 0) > 0);

    // Load my own join requests (as applicant)
    const { data: myReqs } = await supabase.rpc("get_my_join_requests" as any);
    if (Array.isArray(myReqs)) setMyJoinRequests(myReqs as any[]);

    // Load incoming join requests if I own an agency
    if (activeAgency && activeAgency.owner_id === user.id) {
      const { data: incoming } = await supabase.rpc("get_agency_join_requests" as any);
      if (Array.isArray(incoming)) setJoinRequests(incoming as any[]);
    }

    setLoading(false);
  };

  useEffect(() => { loadAll(); }, []);

  // Realtime: agency target counters depend on gifts + mic minutes + membership totals.
  // Refresh this screen as soon as any of those source tables changes.
  useEffect(() => {
    if (!userId) return;
    let timer: ReturnType<typeof setTimeout> | null = null;
    const scheduleReload = () => {
      if (timer) return;
      timer = setTimeout(() => {
        timer = null;
        loadAll();
      }, 700);
    };

    const channel = supabase
      .channel(`agency-target-live-${userId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "gift_transactions" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "agency_members" }, scheduleReload)
      .on("postgres_changes", { event: "*", schema: "public", table: "daily_tasks" }, scheduleReload)
      .subscribe();

    return () => {
      if (timer) clearTimeout(timer);
      supabase.removeChannel(channel);
    };
  }, [userId]);

  // Realtime: refresh sent/pending invites when statuses change
  useEffect(() => {
    if (!userId) return;
    const channel = supabase
      .channel(`agency-invites-${userId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "agency_invites" },
        async (payload: any) => {
          const row = payload.new || payload.old;
          if (!row) return;
          // Only react if I am involved (as agent or target)
          if (row.agent_id === userId || row.target_user_id === userId) {
            const { data: sent } = await supabase.rpc("get_my_sent_invites" as any);
            if (sent && (sent as any).invites) setSentInvites((sent as any).invites);
            const { data: pend } = await supabase.rpc("get_my_pending_invites" as any);
            if (pend) setPendingInvites(pend);
          }
        },
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [userId]);

  const applyForAgency = async () => {
    if (!agencyName.trim()) return;
    if (hasOwnedAgency) { toast.error("لديك وكالة بالفعل — لا يمكن إنشاء وكالة أخرى"); return; }
    if (myMembership) { toast.error("أنت عضو في وكالة بالفعل"); return; }
    const { error } = await supabase.from("agencies").insert({ name: agencyName, owner_id: userId, status: "pending", agency_code: "" } as any);
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
    if (searchResult.is_agent) { toast.error("هذا المستخدم وكيل بالفعل ولا يمكن دعوته كمضيف!"); return; }
    if (searchResult.id === userId) { toast.error("لا يمكن دعوة نفسك"); return; }

    // Block duplicate pending invites
    const { data: existing } = await supabase
      .from("agency_invites")
      .select("id")
      .eq("agency_id", myAgency.id)
      .eq("target_user_id", searchResult.id)
      .eq("status", "pending")
      .maybeSingle();
    if (existing) { toast.error("لقد أرسلت دعوة بالفعل لهذا المستخدم — في انتظار الرد"); return; }

    const ok = window.confirm(
      `إرسال دعوة لـ "${searchResult.display_name}" (ID: ${searchResult.user_id}) للانضمام إلى وكالة "${myAgency.name}" كمضيف؟`,
    );
    if (!ok) return;

    const { error } = await supabase.from("agency_invites").insert({
      agency_id: myAgency.id, agent_id: userId, target_user_id: searchResult.id,
    });
    if (error) { toast.error("فشل إرسال الدعوة: " + error.message); return; }

    await supabase.from("notifications").insert({
      user_id: searchResult.id, title: "دعوة وكالة 🏢",
      message: `تم دعوتك للانضمام كمضيف في وكالة "${myAgency.name}"`, type: "agency_invite",
    });
    toast.success("تم إرسال الدعوة! 📨");
    setSearchResult(null);
    setSearchId("");

    // Refresh sent-invites panel
    const { data: sent } = await supabase.rpc("get_my_sent_invites" as any);
    if (sent && (sent as any).invites) setSentInvites((sent as any).invites);
  };

  const respondToInvite = async (inviteId: string, action: "accept" | "reject") => {
    setProcessingInvite(inviteId);
    try {
      if (action === "accept") {
        const { error } = await supabase.rpc("accept_agency_invite" as any, {
          _invite_id: inviteId, _user_id: userId,
        });
        if (error) { toast.error("فشل قبول الدعوة: " + error.message); return; }
        toast.success("تم قبول الدعوة! أنت الآن مضيف 🎤");
      } else {
        await supabase.from("agency_invites").update({ status: "rejected" }).eq("id", inviteId);
        toast.info("تم رفض الدعوة");
      }
      // Refresh entire view (membership may have changed)
      await loadAll();
    } finally {
      setProcessingInvite(null);
    }
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

  // NEW — search agency by 4-digit code
  const searchByCode = async () => {
    const c = codeQuery.trim();
    if (!/^\d{4}$/.test(c)) { toast.error("أدخل كود مكون من 4 أرقام"); return; }
    setSearchingAgency(true);
    setSearchedAgency(null);
    try {
      const { data, error } = await supabase.rpc("search_agency_by_code" as any, { _code: c });
      if (error) throw error;
      const r = data as any;
      if (!r?.found) { toast.error("لم يتم العثور على وكالة بهذا الكود"); return; }
      setSearchedAgency(r);
    } catch (e: any) {
      toast.error(e.message || "خطأ في البحث");
    } finally {
      setSearchingAgency(false);
    }
  };

  const applyToJoin = async (agencyId: string) => {
    if (myMembership) { toast.error("أنت بالفعل في وكالة"); return; }
    if (myJoinRequests.some(r => r.agency_id === agencyId && r.status === "pending")) {
      toast.error("لديك طلب معلّق لهذه الوكالة"); return;
    }
    const { error } = await supabase.rpc("apply_to_join_agency" as any, { _agency_id: agencyId, _message: null });
    if (error) { toast.error(error.message); return; }
    toast.success("📨 تم إرسال طلب الانضمام");
    const { data: myReqs } = await supabase.rpc("get_my_join_requests" as any);
    if (Array.isArray(myReqs)) setMyJoinRequests(myReqs as any[]);
  };

  const respondJoinRequest = async (requestId: string, accept: boolean) => {
    const { error } = await supabase.rpc("respond_join_request" as any, { _request_id: requestId, _accept: accept });
    if (error) { toast.error(error.message); return; }
    toast.success(accept ? "تم قبول الطلب ✅" : "تم رفض الطلب");
    await loadAll();
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
          {/* HOST INBOX: pending invites with rich preview (15-day target stats) */}
          {pendingInvites && (pendingInvites.invites || []).length > 0 && (
            <div className="card-nova p-4 space-y-3 border border-primary/40">
              <h3 className="font-bold text-sm flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-primary" />
                دعوات الانضمام ({(pendingInvites.invites || []).length})
              </h3>
              <div className="rounded-xl bg-secondary/40 p-2.5 space-y-1">
                <p className="text-[10px] text-muted-foreground">إحصائياتك في الدورة الحالية ({pendingInvites.cycle_label})</p>
                <div className="grid grid-cols-3 gap-1.5 text-center text-[10px]">
                  <div className="bg-card/60 rounded-lg p-1.5">
                    <p className="text-muted-foreground">ماس الدورة</p>
                    <p className="font-bold text-primary">{Number(pendingInvites.host_cycle_diamonds).toLocaleString()}💎</p>
                  </div>
                  <div className={`rounded-lg p-1.5 ${(pendingInvites.host_cycle_minutes/60) >= pendingInvites.required_hours ? "bg-primary/15" : "bg-card/60"}`}>
                    <p className="text-muted-foreground">ساعات</p>
                    <p className="font-bold">{(pendingInvites.host_cycle_minutes/60).toFixed(1)} / {pendingInvites.required_hours}h</p>
                  </div>
                  <div className={`rounded-lg p-1.5 ${pendingInvites.host_cycle_active_days >= pendingInvites.required_days ? "bg-primary/15" : "bg-card/60"}`}>
                    <p className="text-muted-foreground">أيام نشطة</p>
                    <p className="font-bold">{pendingInvites.host_cycle_active_days} / {pendingInvites.required_days}</p>
                  </div>
                </div>
              </div>
              {(pendingInvites.invites || []).map((inv: any) => (
                <div key={inv.invite_id} className="rounded-xl border border-border bg-secondary/40 p-3 space-y-2">
                  <p className="font-bold text-sm flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5 text-accent" />{inv.agency_name}</p>
                  <p className="text-[10px] text-muted-foreground">من الوكيل: {inv.agent_name || "—"} (ID: {inv.agent_friendly_id || "—"})</p>
                  <p className="text-[10px] text-muted-foreground leading-relaxed">
                    💡 ستحتاج لتحقيق <b>{pendingInvites.required_days} أيام نشطة</b> و <b>{pendingInvites.required_hours} ساعة بث</b> كل 15 يوم.
                  </p>
                  <div className="flex gap-2">
                    <button onClick={() => respondToInvite(inv.invite_id, "accept")} disabled={processingInvite === inv.invite_id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold gradient-neon text-primary-foreground flex items-center justify-center gap-1 disabled:opacity-50">
                      <Check className="w-3.5 h-3.5" /> قبول
                    </button>
                    <button onClick={() => respondToInvite(inv.invite_id, "reject")} disabled={processingInvite === inv.invite_id}
                      className="flex-1 py-2 rounded-xl text-xs font-bold border border-destructive/30 text-destructive flex items-center justify-center gap-1 disabled:opacity-50">
                      <X className="w-3.5 h-3.5" /> رفض
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}

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
              <div className="flex items-center justify-between gap-3 rounded-2xl p-3 bg-gradient-to-br from-purple-700/30 via-fuchsia-600/20 to-purple-900/30 border border-fuchsia-500/40 shadow-[0_0_30px_hsl(280_90%_60%/0.35)]">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="relative shrink-0">
                    {myAgency.logo_url ? (
                      <img src={myAgency.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover border border-fuchsia-400/50 shadow-[0_0_18px_hsl(280_90%_60%/0.6)]" />
                    ) : (
                      <div className="w-14 h-14 rounded-2xl flex items-center justify-center bg-black/40 border border-fuchsia-400/50">
                        <ImageIcon className="w-6 h-6 text-fuchsia-300/70" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0">
                    <p className="font-extrabold text-lg truncate text-foreground">{myAgency.name}</p>
                    <p className="text-[10px] text-fuchsia-300/90">وكالة معتمدة • {agencyHosts.length || 0} مضيف</p>
                  </div>
                </div>
                <div className="text-center px-3 py-1.5 rounded-xl bg-black/40 border border-fuchsia-400/50 shadow-[0_0_18px_hsl(280_90%_60%/0.6)_inset]">
                  <p className="text-[9px] text-fuchsia-300 tracking-wider">AGENCY ID</p>
                  <p className="font-black text-2xl text-fuchsia-200 tracking-[0.3em] tabular-nums">{myAgency.agency_code || "----"}</p>
                </div>
              </div>

              {/* Owner-only: edit agency name & logo with 15-day cooldown */}
              {myAgency.owner_id === userId && (() => {
                const nameNext = myAgency.name_updated_at ? new Date(new Date(myAgency.name_updated_at).getTime() + 15 * 86400000).toISOString() : null;
                const logoNext = myAgency.logo_updated_at ? new Date(new Date(myAgency.logo_updated_at).getTime() + 15 * 86400000).toISOString() : null;
                const nameCd = formatCountdown(nameNext);
                const logoCd = formatCountdown(logoNext);
                return (
                  <div className="rounded-2xl border border-fuchsia-500/30 bg-black/30 p-3 space-y-3">
                    <div className="flex items-center justify-between">
                      <p className="text-xs font-bold flex items-center gap-2 text-fuchsia-200">
                        <Pencil className="w-3.5 h-3.5" /> تعديل بيانات الوكالة
                      </p>
                      <button
                        onClick={() => { setEditName(myAgency.name); setShowEditAgency(v => !v); }}
                        className="text-[10px] px-2 py-1 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 text-fuchsia-200 font-bold"
                      >
                        {showEditAgency ? "إغلاق" : "تعديل"}
                      </button>
                    </div>
                    <p className="text-[10px] text-fuchsia-300/80 leading-relaxed">
                      يمكنك تغيير الاسم والشعار <span className="font-bold text-fuchsia-200">مرتين شهرياً فقط</span> (كل 15 يوم).
                    </p>

                    {showEditAgency && (
                      <div className="space-y-3">
                        {/* Logo */}
                        <div className="flex items-center gap-3">
                          <div className="relative">
                            {myAgency.logo_url ? (
                              <img src={myAgency.logo_url} alt="" className="w-16 h-16 rounded-2xl object-cover border border-fuchsia-400/50" />
                            ) : (
                              <div className="w-16 h-16 rounded-2xl bg-black/50 border border-fuchsia-400/50 flex items-center justify-center"><ImageIcon className="w-6 h-6 text-fuchsia-300/60" /></div>
                            )}
                          </div>
                          <div className="flex-1 min-w-0">
                            <button
                              type="button"
                              onClick={() => logoInputRef.current?.click()}
                              disabled={uploadingLogo || !!logoCd}
                              className="w-full py-2 rounded-xl bg-gradient-to-r from-fuchsia-600/40 to-purple-700/40 border border-fuchsia-400/50 text-fuchsia-100 text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-50"
                            >
                              <Camera className="w-3.5 h-3.5" />
                              {uploadingLogo ? "جاري الرفع..." : logoCd ? `الشعار: متاح بعد ${logoCd}` : "تغيير شعار الوكالة"}
                            </button>
                            <input
                              ref={logoInputRef} type="file" accept="image/*" className="hidden"
                              onChange={(e) => { const f = e.target.files?.[0]; if (f) uploadAgencyLogo(f); e.currentTarget.value = ""; }}
                            />
                          </div>
                        </div>

                        {/* Name */}
                        <div className="space-y-1.5">
                          <label className="text-[10px] text-fuchsia-300/80 font-bold">اسم الوكالة</label>
                          <div className="flex gap-2">
                            <input
                              value={editName}
                              onChange={(e) => setEditName(e.target.value)}
                              disabled={!!nameCd}
                              maxLength={40}
                              className="flex-1 bg-black/50 border border-fuchsia-400/40 rounded-xl px-3 py-2 text-sm text-foreground disabled:opacity-60"
                              placeholder="اسم وكالتك"
                            />
                            <button
                              onClick={saveAgencyName}
                              disabled={savingAgencyName || !!nameCd || !editName.trim() || editName.trim() === myAgency.name}
                              className="px-3 rounded-xl bg-gradient-to-r from-fuchsia-600 to-purple-600 text-white text-xs font-bold flex items-center gap-1 disabled:opacity-50"
                            >
                              <Save className="w-3.5 h-3.5" /> حفظ
                            </button>
                          </div>
                          {nameCd && (
                            <p className="text-[10px] text-amber-300 flex items-center gap-1">
                              <Clock className="w-3 h-3" /> الاسم: متاح بعد {nameCd}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}


              {/* Incoming join requests — owner only */}
              {(myMembership?.badge === "agent" || myAgency.owner_id === userId) && joinRequests.length > 0 && (
                <div className="rounded-2xl border border-fuchsia-500/40 bg-gradient-to-br from-purple-900/40 to-fuchsia-900/20 p-3 space-y-2">
                  <p className="text-xs font-bold flex items-center gap-2 text-fuchsia-200">
                    <UserPlus className="w-3.5 h-3.5" /> طلبات انضمام جديدة ({joinRequests.length})
                  </p>
                  {joinRequests.map((r: any) => (
                    <div key={r.request_id} className="flex items-center gap-2 bg-black/30 rounded-xl p-2">
                      <img src={r.avatar_url || "https://i.pravatar.cc/40"} alt="" className="w-9 h-9 rounded-full object-cover" />
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-bold truncate">{r.display_name || "—"}</p>
                        <p className="text-[9px] text-muted-foreground">ID: {r.friendly_id}</p>
                      </div>
                      <button onClick={() => respondJoinRequest(r.request_id, true)}
                        className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-[10px] font-bold flex items-center gap-1">
                        <Check className="w-3 h-3" /> قبول
                      </button>
                      <button onClick={() => respondJoinRequest(r.request_id, false)}
                        className="px-2.5 py-1 rounded-lg bg-destructive/20 border border-destructive/40 text-destructive text-[10px] font-bold flex items-center gap-1">
                        <X className="w-3 h-3" /> رفض
                      </button>
                    </div>
                  ))}
                </div>
              )}

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
              {(myMembership?.badge === "host" || myMembership?.role === "owner" || myAgency?.owner_id === userId) && hostEvents && (
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
                            <img loading="lazy" decoding="async" src={h.avatar_url || "https://i.pravatar.cc/40"} alt="" className="w-9 h-9 rounded-full object-cover flex-shrink-0" />
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
              {(myMembership?.badge === "host" || myMembership?.role === "owner" || myAgency?.owner_id === userId) && hostDashboard?.has_agency && (
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
              {(myMembership?.badge === "host" || myMembership?.role === "owner" || myAgency?.owner_id === userId) && hostStats && (
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
              {(myMembership?.badge === "host" || myMembership?.role === "owner" || myAgency?.owner_id === userId) && hostSalary && (
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
              {(myMembership?.badge === "host" || myMembership?.role === "owner" || myAgency?.owner_id === userId) && (
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
                          <img loading="lazy" decoding="async" src={searchResult.avatar_url || "https://i.pravatar.cc/60"} alt="" className="w-full h-full object-cover" />
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

                  {/* Sent invites status panel — realtime */}
                  {sentInvites.length > 0 && (
                    <div className="space-y-2">
                      <h4 className="text-xs font-bold text-muted-foreground flex items-center gap-1.5">
                        <UserPlus className="w-3 h-3" /> الدعوات المُرسلة ({sentInvites.length})
                      </h4>
                      <div className="space-y-1.5">
                        {sentInvites.map((s: any) => {
                          const status = s.status as "pending" | "accepted" | "rejected";
                          const statusBadge =
                            status === "accepted"
                              ? { label: "مقبولة ✅", cls: "bg-green-500/15 text-green-400 border-green-500/30" }
                              : status === "rejected"
                                ? { label: "مرفوضة ❌", cls: "bg-destructive/15 text-destructive border-destructive/30" }
                                : { label: "قيد الانتظار ⏳", cls: "bg-accent/15 text-accent border-accent/30" };
                          return (
                            <div key={s.invite_id} className="bg-secondary/40 rounded-xl p-2.5 flex items-center gap-2">
                              <img loading="lazy" decoding="async" src={s.avatar_url || "https://i.pravatar.cc/40"} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0" />
                              <div className="flex-1 min-w-0">
                                <p className="text-xs font-bold truncate">{s.target_name || "—"}</p>
                                <p className="text-[9px] text-muted-foreground">ID: {s.target_friendly_id || "—"}</p>
                              </div>
                              <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${statusBadge.cls}`}>
                                {statusBadge.label}
                              </span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

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

          {/* Apply for agency — only if not in any agency, doesn't already own one, AND eligible */}
          {!myAgency && !hasOwnedAgency && agencyEligible && (
            <button onClick={() => setShowCreate(!showCreate)}
              className="w-full py-3 rounded-2xl border border-dashed border-primary/50 text-primary font-bold text-sm flex items-center justify-center gap-2">
              <Plus className="w-4 h-4" /> تقديم طلب وكالة جديدة
            </button>
          )}
          {!myAgency && !hasOwnedAgency && !agencyEligible && (
            <div className="card-nova p-3 text-center text-xs text-muted-foreground border border-border">
              🔒 لإنشاء وكالة، يجب الحصول على موافقة الإدارة (BOSS) أولاً
            </div>
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

          {/* 🔮 Premium: Search agency by 4-digit code */}
          <div className="rounded-3xl p-4 space-y-3 bg-gradient-to-br from-purple-900/60 via-fuchsia-900/40 to-purple-900/60 border border-fuchsia-500/40 shadow-[0_0_40px_hsl(280_90%_60%/0.35)]">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center shadow-[0_0_14px_hsl(280_90%_60%/0.6)]">
                <Search className="w-4 h-4 text-fuchsia-200" />
              </div>
              <div className="flex-1">
                <p className="font-extrabold text-sm text-fuchsia-100">البحث عن وكالة</p>
                <p className="text-[10px] text-fuchsia-300/80">أدخل كود الوكالة المكوّن من 4 أرقام</p>
              </div>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                inputMode="numeric"
                maxLength={4}
                placeholder="مثال: 1024"
                value={codeQuery}
                onChange={(e) => setCodeQuery(e.target.value.replace(/\D/g, "").slice(0, 4))}
                className="flex-1 bg-black/40 rounded-2xl px-4 py-3 text-center text-2xl font-black tracking-[0.5em] tabular-nums text-fuchsia-100 border border-fuchsia-400/30 focus:outline-none focus:border-fuchsia-300 focus:ring-2 focus:ring-fuchsia-500/40 placeholder:text-fuchsia-500/30 placeholder:tracking-normal placeholder:text-sm"
              />
              <button
                onClick={searchByCode}
                disabled={searchingAgency || codeQuery.length !== 4}
                className="px-5 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-700 text-white font-bold shadow-[0_0_24px_hsl(280_90%_60%/0.6)] disabled:opacity-50"
              >
                <Search className="w-5 h-5" />
              </button>
            </div>

            {searchedAgency && (
              <div className="rounded-2xl p-3 bg-black/40 border border-fuchsia-400/40 space-y-3">
                <div className="flex items-center gap-3">
                  {searchedAgency.logo_url ? (
                    <img src={searchedAgency.logo_url} alt="" className="w-14 h-14 rounded-2xl object-cover border border-fuchsia-400/50" />
                  ) : (
                    <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-fuchsia-500 to-purple-700 flex items-center justify-center text-2xl">🏢</div>
                  )}
                  <div className="flex-1 min-w-0">
                    <p className="font-extrabold text-base truncate text-fuchsia-100">{searchedAgency.name}</p>
                    <p className="text-[10px] text-fuchsia-300/80">المالك: {searchedAgency.owner_name || "—"}</p>
                  </div>
                  <div className="text-center px-2 py-1 rounded-lg bg-fuchsia-500/15 border border-fuchsia-400/40">
                    <p className="text-[8px] text-fuchsia-300">ID</p>
                    <p className="font-black text-sm text-fuchsia-100 tracking-widest tabular-nums">{searchedAgency.agency_code}</p>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-2 text-center">
                  <div className="bg-black/40 rounded-xl p-2">
                    <p className="text-[9px] text-fuchsia-300/80">عدد المضيفين</p>
                    <p className="font-extrabold text-lg text-fuchsia-100">{searchedAgency.host_count}</p>
                  </div>
                  <div className="bg-black/40 rounded-xl p-2">
                    <p className="text-[9px] text-fuchsia-300/80">إنجاز الدورة</p>
                    <p className="font-extrabold text-lg text-fuchsia-100">{Number(searchedAgency.cycle_diamonds).toLocaleString()} 💎</p>
                  </div>
                </div>
                {myMembership || hasOwnedAgency ? (
                  <p className="text-[10px] text-center text-muted-foreground">{myMembership ? "أنت بالفعل عضو في وكالة" : "لديك وكالة خاصة بك"}</p>
                ) : myJoinRequests.some(r => r.agency_id === searchedAgency.id && r.status === "pending") ? (
                  <div className="w-full py-2.5 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs font-bold text-center flex items-center justify-center gap-2">
                    <Clock className="w-3.5 h-3.5" /> طلبك قيد المراجعة
                  </div>
                ) : (
                  <button
                    onClick={() => applyToJoin(searchedAgency.id)}
                    className="w-full py-3 rounded-xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-fuchsia-600 text-white font-extrabold text-sm shadow-[0_0_24px_hsl(280_90%_60%/0.65)] flex items-center justify-center gap-2"
                  >
                    <UserPlus className="w-4 h-4" /> طلب الانضمام كمضيف
                  </button>
                )}
              </div>
            )}
          </div>

          {/* My pending join requests */}
          {myJoinRequests.length > 0 && (
            <div className="card-nova p-3 space-y-2 border border-fuchsia-500/30">
              <p className="text-xs font-bold flex items-center gap-2"><Clock className="w-3.5 h-3.5 text-fuchsia-300" /> طلبات الانضمام الخاصة بي</p>
              {myJoinRequests.map((r: any) => (
                <div key={r.request_id} className="flex items-center gap-2 bg-secondary/40 rounded-xl p-2">
                  <div className="w-9 h-9 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/30 flex items-center justify-center text-lg">🏢</div>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-bold truncate">{r.agency_name}</p>
                    <p className="text-[9px] text-muted-foreground">كود: {r.agency_code}</p>
                  </div>
                  <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                    r.status === "accepted" ? "bg-emerald-500/15 text-emerald-400 border-emerald-500/30" :
                    r.status === "rejected" ? "bg-destructive/15 text-destructive border-destructive/30" :
                    "bg-amber-500/15 text-amber-400 border-amber-500/30"
                  }`}>
                    {r.status === "accepted" ? "مقبول ✅" : r.status === "rejected" ? "مرفوض ❌" : "قيد الانتظار ⏳"}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* All agencies */}
          <h3 className="font-bold text-sm flex items-center gap-2"><Building2 className="w-4 h-4 text-fuchsia-300" /> الوكالات المعتمدة</h3>
          <div className="space-y-2">
            {agencies.map((ag) => (
              <div key={ag.id} className="card-nova p-3 flex items-center justify-between border border-fuchsia-500/20">
                <div className="flex items-center gap-2 min-w-0">
                  {ag.logo_url ? (
                    <img src={ag.logo_url} alt="" className="w-10 h-10 rounded-xl object-cover" />
                  ) : (
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-fuchsia-500/40 to-purple-700/40 flex items-center justify-center">🏢</div>
                  )}
                  <div className="min-w-0">
                    <p className="font-bold text-sm truncate">{ag.name}</p>
                    <p className="text-[10px] text-muted-foreground">🟢 نشطة</p>
                  </div>
                </div>
                <div className="text-center px-2 py-1 rounded-lg bg-fuchsia-500/10 border border-fuchsia-400/30 flex-shrink-0">
                  <p className="text-[8px] text-fuchsia-300">ID</p>
                  <p className="font-black text-sm text-fuchsia-200 tracking-widest tabular-nums">{ag.agency_code || "----"}</p>
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
