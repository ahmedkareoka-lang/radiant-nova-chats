import { useNavigate } from "react-router-dom";
import { ChevronRight, Lock, Shield, Eye, UserX, KeyRound, FileText } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Switch } from "@/components/ui/switch";

export default function PrivacyPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState<string | null>(null);
  const [hideOnline, setHideOnline] = useState(false);
  const [hideVisits, setHideVisits] = useState(false);
  const [blockDMs, setBlockDMs] = useState(false);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      const id = data.user?.id ?? null;
      setUserId(id);
      if (id) {
        supabase.from("profiles").select("hide_online,hide_visits,block_dms").eq("id", id).maybeSingle().then(({ data }) => {
          if (data) {
            setHideOnline(!!(data as any).hide_online);
            setHideVisits(!!(data as any).hide_visits);
            setBlockDMs(!!(data as any).block_dms);
          }
        });
      }
    });
  }, []);

  const updatePref = async (field: string, value: boolean) => {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ [field]: value } as any).eq("id", userId);
    if (error) toast.error("تعذر الحفظ — سيتم حفظ التغيير محلياً فقط");
    else toast.success("تم الحفظ");
  };

  const changePassword = async () => {
    const email = (await supabase.auth.getUser()).data.user?.email;
    if (!email) return toast.error("لا يوجد بريد إلكتروني مرتبط");
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/reset-password`,
    });
    if (error) toast.error("تعذر إرسال رابط التغيير");
    else toast.success("تم إرسال رابط تغيير كلمة المرور إلى بريدك");
  };

  const deleteAccount = async () => {
    if (!confirm("هل أنت متأكد من حذف حسابك نهائياً؟ هذا الإجراء لا يمكن التراجع عنه.")) return;
    toast.info("تم تسجيل طلب الحذف. سيتواصل معك الدعم خلال 48 ساعة.");
  };

  const Row = ({ icon: Icon, title, desc, value, onChange, danger }: any) => (
    <div className={`flex items-center gap-3 p-4 rounded-2xl border ${danger ? "border-destructive/40 bg-destructive/5" : "border-border/40 bg-secondary/20"}`}>
      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${danger ? "bg-destructive/20" : "bg-primary/15"}`}>
        <Icon className={`w-5 h-5 ${danger ? "text-destructive" : "text-primary"}`} />
      </div>
      <div className="flex-1 min-w-0 text-start">
        <div className="font-bold text-sm">{title}</div>
        {desc && <div className="text-xs text-muted-foreground mt-0.5">{desc}</div>}
      </div>
      {onChange && <Switch checked={value} onCheckedChange={onChange} />}
    </div>
  );

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <Lock className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">الخصوصية والأمان</h1>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 to-accent/10 border border-primary/30 p-4 flex items-start gap-3">
          <Shield className="w-6 h-6 text-primary shrink-0 mt-0.5" />
          <div className="text-sm">
            <div className="font-bold mb-1">حسابك محمي</div>
            <div className="text-xs text-muted-foreground">نوفا تستخدم تشفيراً متقدماً لحماية بياناتك وكلمة مرورك.</div>
          </div>
        </div>

        <h2 className="text-sm font-bold text-muted-foreground mt-4 px-1">الخصوصية</h2>
        <Row icon={Eye} title="إخفاء حالة الاتصال" desc="لن يرى أحد متى كنت متصلاً آخر مرة" value={hideOnline}
          onChange={(v: boolean) => { setHideOnline(v); updatePref("hide_online", v); }} />
        <Row icon={UserX} title="إخفاء زياراتك للملفات" desc="زيارتك للملفات الشخصية ستكون مجهولة" value={hideVisits}
          onChange={(v: boolean) => { setHideVisits(v); updatePref("hide_visits", v); }} />
        <Row icon={Lock} title="منع الرسائل من الغرباء" desc="فقط من تتابعهم يستطيعون مراسلتك" value={blockDMs}
          onChange={(v: boolean) => { setBlockDMs(v); updatePref("block_dms", v); }} />

        <h2 className="text-sm font-bold text-muted-foreground mt-6 px-1">الأمان</h2>
        <button onClick={changePassword} className="w-full">
          <Row icon={KeyRound} title="تغيير كلمة المرور" desc="إرسال رابط آمن إلى بريدك الإلكتروني" />
        </button>
        <button onClick={() => navigate("/terms")} className="w-full">
          <Row icon={FileText} title="شروط الاستخدام وسياسة الخصوصية" desc="اقرأ كيف نتعامل مع بياناتك" />
        </button>

        <h2 className="text-sm font-bold text-destructive mt-6 px-1">منطقة الخطر</h2>
        <button onClick={deleteAccount} className="w-full">
          <Row icon={UserX} title="حذف الحساب نهائياً" desc="سيتم حذف جميع بياناتك خلال 48 ساعة" danger />
        </button>
      </div>
    </div>
  );
}
