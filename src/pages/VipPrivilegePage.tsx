import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Crown, Check, Sparkles } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import PageTransition from "@/components/PageTransition";
import CurrencyIcon from "@/components/CurrencyIcon";

// 7-tier VIP system inspired by Yalla / Soulmatch
const VIP_TIERS = [
  { level: 1, price: 1000, color: "from-slate-400 to-slate-600", icon: "🥉", title: "VIP فضي", perks: ["شارة VIP بجانب الاسم", "دخول مميز للغرف", "+5% مكافآت يومية"] },
  { level: 2, price: 5000, color: "from-amber-400 to-amber-600", icon: "🥈", title: "VIP ذهبي", perks: ["كل مزايا VIP 1", "إطار ذهبي حول الصورة", "+10% مكافآت يومية", "إيموجي حصرية في الشات"] },
  { level: 3, price: 15000, color: "from-cyan-400 to-blue-600", icon: "💎", title: "VIP ماسي", perks: ["كل مزايا VIP 2", "إخفاء الزيارات في الملف", "تغيير ID للمستخدم", "تأثير دخول صغير"] },
  { level: 4, price: 50000, color: "from-purple-400 to-pink-600", icon: "✨", title: "VIP أرجواني", perks: ["كل مزايا VIP 3", "فقاعة شات مخصصة", "10 إطارات حصرية", "أولوية في قائمة المتصلين"] },
  { level: 5, price: 150000, color: "from-rose-400 to-red-600", icon: "🌹", title: "VIP ملكي", perks: ["كل مزايا VIP 4", "دخول صامت للغرف", "تأثير دخول كامل بالصوت", "إطار ملكي متحرك"] },
  { level: 6, price: 500000, color: "from-orange-400 to-amber-600", icon: "👑", title: "VIP إمبراطوري", perks: ["كل مزايا VIP 5", "تاج إمبراطوري متحرك", "دخول مميز في كل الغرف", "هدايا حصرية شهرية"] },
  { level: 7, price: 2000000, color: "from-yellow-300 via-amber-400 to-orange-500", icon: "🔱", title: "VIP أسطوري", perks: ["كل مزايا VIP 6", "إعلان عالمي عند الدخول", "صوت دخول مخصص قابل للتعديل", "تأثير Lottie كامل الشاشة", "شارة \"أسطورة NOVA\" دائمة"] },
];

export default function VipPrivilegePage() {
  const navigate = useNavigate();
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase.from("profiles").select("vip_level, vip_expiry, coins").eq("id", user.id).single();
      setProfile(data);
    })();
  }, []);

  const currentLevel = profile?.vip_level || 0;

  return (
    <PageTransition>
      <div className="min-h-screen pb-24" style={{ background: "linear-gradient(180deg, hsl(260 35% 8%), hsl(280 40% 12%))" }}>
        {/* Header */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-background/60 border-b border-border/30">
          <div className="px-4 py-3 max-w-lg mx-auto flex items-center justify-between">
            <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/60 flex items-center justify-center">
              <ArrowRight className="w-4 h-4" />
            </button>
            <h1 className="text-base font-black flex items-center gap-1.5">
              <Crown className="w-5 h-5 text-accent" />
              مركز VIP
            </h1>
            <div className="w-9" />
          </div>
        </header>

        {/* Hero */}
        <div className="px-4 pt-4 max-w-lg mx-auto">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="relative rounded-3xl overflow-hidden p-5 mb-5"
            style={{ background: "linear-gradient(135deg, hsl(45 90% 25%), hsl(35 100% 35%), hsl(280 60% 25%))" }}
          >
            <div className="absolute inset-0 opacity-30">
              {[...Array(20)].map((_, i) => (
                <motion.span key={i} className="absolute text-xs"
                  style={{ left: `${(i * 17) % 100}%`, top: `${(i * 23) % 100}%` }}
                  animate={{ y: [0, -15, 0], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 3 + (i % 3), delay: i * 0.2, repeat: Infinity }}
                >✨</motion.span>
              ))}
            </div>
            <div className="relative text-center">
              <div className="text-5xl mb-2">{currentLevel > 0 ? VIP_TIERS[currentLevel - 1]?.icon : "👑"}</div>
              <h2 className="text-xl font-black text-foreground mb-1">
                {currentLevel > 0 ? `أنت ${VIP_TIERS[currentLevel - 1]?.title}` : "اشترك في VIP"}
              </h2>
              <p className="text-xs text-foreground/80">
                {currentLevel > 0 && profile?.vip_expiry
                  ? `ينتهي في ${new Date(profile.vip_expiry).toLocaleDateString("ar-EG")}`
                  : "افتح مزايا حصرية ومذهلة في NOVA"}
              </p>
            </div>
          </motion.div>

          {/* Tiers */}
          <div className="space-y-3">
            {VIP_TIERS.map((tier, idx) => {
              const isActive = currentLevel === tier.level;
              const isLocked = currentLevel < tier.level && currentLevel > 0;
              return (
                <motion.div
                  key={tier.level}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: idx * 0.05 }}
                  className={`relative rounded-2xl overflow-hidden border-2 ${
                    isActive ? "border-accent shadow-[0_0_24px_hsl(45_100%_55%/0.5)]" : "border-border/30"
                  }`}
                  style={{ background: "hsl(260 30% 12% / 0.6)", backdropFilter: "blur(12px)" }}
                >
                  {/* Header band */}
                  <div className={`px-4 py-2.5 bg-gradient-to-r ${tier.color} flex items-center justify-between`}>
                    <div className="flex items-center gap-2">
                      <span className="text-2xl">{tier.icon}</span>
                      <div>
                        <p className="text-sm font-black text-foreground">VIP {tier.level} — {tier.title}</p>
                        <p className="text-[10px] text-foreground/80">المستوى {tier.level}</p>
                      </div>
                    </div>
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full bg-background/40 text-[9px] font-black flex items-center gap-1">
                        <Sparkles className="w-3 h-3" /> نشط
                      </span>
                    )}
                  </div>

                  {/* Perks */}
                  <div className="p-3">
                    <ul className="space-y-1.5 mb-3">
                      {tier.perks.map((perk, i) => (
                        <li key={i} className="flex items-start gap-2 text-xs text-muted-foreground">
                          <Check className="w-3.5 h-3.5 text-accent flex-shrink-0 mt-0.5" />
                          <span>{perk}</span>
                        </li>
                      ))}
                    </ul>
                    <button
                      disabled={isActive || isLocked}
                      onClick={() => navigate("/top-up")}
                      className={`w-full py-2.5 rounded-full font-bold text-sm flex items-center justify-center gap-1.5 transition-all ${
                        isActive
                          ? "bg-secondary/40 text-muted-foreground cursor-default"
                          : `bg-gradient-to-r ${tier.color} text-foreground hover:scale-[1.02] active:scale-95`
                      }`}
                    >
                      {isActive ? "مفعّل حالياً" : (
                        <>
                          <CurrencyIcon type="gold" size="xs" />
                          {tier.price.toLocaleString()} للترقية
                        </>
                      )}
                    </button>
                  </div>
                </motion.div>
              );
            })}
          </div>

          <p className="text-center text-[10px] text-muted-foreground mt-4 px-4">
            * كل اشتراكات VIP تدوم 30 يوماً وتتجدد عند الترقية
          </p>
        </div>
      </div>
    </PageTransition>
  );
}
