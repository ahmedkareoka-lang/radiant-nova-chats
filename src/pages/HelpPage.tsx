import { useNavigate } from "react-router-dom";
import { ChevronRight, HelpCircle, MessageCircle, Mail, BookOpen, Bug, Star } from "lucide-react";
import { useState } from "react";

const FAQ = [
  { q: "كيف أشحن عملات NOVA؟", a: "اذهب إلى صفحة الشحن من البروفايل، اختر الباقة المناسبة، ثم أكمل الدفع عبر الوكيل أو Telegram Stars." },
  { q: "كيف أصبح VIP؟", a: "افتح متجر VIP من قائمة الإعدادات، اختر المستوى المناسب، وادفع بعملات NOVA. تحصل على إطار، شارة، ومميزات حصرية فوراً." },
  { q: "كيف أحول الماس إلى عملات؟", a: "الماس يُحوّل تلقائياً بنسبة 50% من قيمة الهدية للمستلم. للسحب، تواصل مع وكيل معتمد عبر الدعم." },
  { q: "كيف أنشئ غرفة صوتية؟", a: "من الصفحة الرئيسية اضغط على زر + ثم اختر اسم وغلاف للغرفة. ستفتح الغرفة فوراً." },
  { q: "ما الفرق بين الإطارات العادية والأسطورية؟", a: "الأسطورية تحتوي على تأثيرات متحركة (نار، جليد، تنين) وحصرية لكبار الداعمين." },
  { q: "نسيت كلمة المرور؟", a: "من صفحة تسجيل الدخول اضغط 'نسيت كلمة المرور' وسيصلك رابط آمن على بريدك." },
];

export default function HelpPage() {
  const navigate = useNavigate();
  const [open, setOpen] = useState<number | null>(0);

  const tg = "https://t.me/nova_support";
  const email = "support@nova-app.com";

  return (
    <div dir="rtl" className="min-h-screen bg-background text-foreground pb-20">
      <header className="sticky top-0 z-10 backdrop-blur-xl bg-background/80 border-b border-border/40 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex items-center gap-2">
          <HelpCircle className="w-5 h-5 text-primary" />
          <h1 className="text-lg font-bold">المساعدة والدعم</h1>
        </div>
      </header>

      <div className="p-4 space-y-3 max-w-lg mx-auto">
        <div className="rounded-2xl bg-gradient-to-br from-primary/20 via-accent/10 to-transparent border border-primary/30 p-5">
          <div className="text-lg font-bold mb-1">كيف يمكننا مساعدتك؟ 💜</div>
          <div className="text-xs text-muted-foreground">فريق دعم نوفا متاح 24/7 للإجابة على استفساراتك</div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <a href={tg} target="_blank" rel="noreferrer" className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition">
            <div className="w-12 h-12 rounded-full bg-[#229ED9]/20 flex items-center justify-center">
              <MessageCircle className="w-6 h-6 text-[#229ED9]" />
            </div>
            <div className="text-sm font-bold">دردشة Telegram</div>
            <div className="text-[10px] text-muted-foreground">رد فوري</div>
          </a>
          <a href={`mailto:${email}`} className="flex flex-col items-center gap-2 p-4 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition">
            <div className="w-12 h-12 rounded-full bg-primary/15 flex items-center justify-center">
              <Mail className="w-6 h-6 text-primary" />
            </div>
            <div className="text-sm font-bold">بريد الدعم</div>
            <div className="text-[10px] text-muted-foreground">خلال 24 ساعة</div>
          </a>
        </div>

        <h2 className="text-sm font-bold text-muted-foreground mt-6 px-1 flex items-center gap-2">
          <BookOpen className="w-4 h-4" /> الأسئلة الشائعة
        </h2>
        <div className="space-y-2">
          {FAQ.map((item, i) => (
            <div key={i} className="rounded-2xl border border-border/40 bg-secondary/20 overflow-hidden">
              <button onClick={() => setOpen(open === i ? null : i)} className="w-full p-4 flex items-center justify-between gap-3 text-start">
                <span className="text-sm font-bold flex-1">{item.q}</span>
                <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${open === i ? "-rotate-90" : "rotate-90"}`} />
              </button>
              {open === i && (
                <div className="px-4 pb-4 text-xs text-muted-foreground leading-relaxed border-t border-border/40 pt-3">
                  {item.a}
                </div>
              )}
            </div>
          ))}
        </div>

        <h2 className="text-sm font-bold text-muted-foreground mt-6 px-1">المزيد</h2>
        <button onClick={() => window.open(tg, "_blank")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition">
          <div className="w-10 h-10 rounded-full bg-orange-500/20 flex items-center justify-center"><Bug className="w-5 h-5 text-orange-500" /></div>
          <div className="flex-1 text-start"><div className="font-bold text-sm">الإبلاغ عن مشكلة</div></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>
        <button onClick={() => toast("شكراً لتقييمك! 💜")} className="w-full flex items-center gap-3 p-4 rounded-2xl border border-border/40 bg-secondary/20 hover:bg-secondary/40 transition">
          <div className="w-10 h-10 rounded-full bg-yellow-500/20 flex items-center justify-center"><Star className="w-5 h-5 text-yellow-500" /></div>
          <div className="flex-1 text-start"><div className="font-bold text-sm">قيّم تجربتك</div></div>
          <ChevronRight className="w-4 h-4 text-muted-foreground rotate-180" />
        </button>

        <p className="text-center text-[10px] text-muted-foreground mt-6">NOVA v1.0 • جميع الحقوق محفوظة</p>
      </div>
    </div>
  );
}

function toast(msg: string) {
  import("sonner").then((m) => m.toast.success(msg));
}
