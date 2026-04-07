import { useState, useEffect } from "react";
import { Shield, Ban, Coins, Users, Crown, Search, UserPlus, Zap } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { motion } from "framer-motion";
import PageTransition from "@/components/PageTransition";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [isBoss, setIsBoss] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchId, setSearchId] = useState("");
  const [targetUser, setTargetUser] = useState<any>(null);
  const [coinAmount, setCoinAmount] = useState("");

  useEffect(() => {
    const checkBoss = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { navigate("/login"); return; }
      const { data } = await supabase.from("profiles").select("is_boss").eq("id", user.id).single();
      if (!data?.is_boss) { navigate("/"); return; }
      setIsBoss(true);
      setLoading(false);
    };
    checkBoss();
  }, [navigate]);

  const searchUser = async () => {
    if (!searchId.trim()) return;
    const { data } = await supabase.from("profiles").select("*").eq("user_id", searchId.trim()).single();
    if (data) {
      setTargetUser(data);
    } else {
      toast.error("المستخدم غير موجود");
      setTargetUser(null);
    }
  };

  const promoteUser = async (role: "admin" | "super_admin", vipLevel: number) => {
    if (!targetUser) return;
    const { error } = await supabase.from("user_roles").upsert({
      user_id: targetUser.id,
      role,
    }, { onConflict: "user_id,role" });
    
    if (!error) {
      await supabase.from("profiles").update({ vip_level: vipLevel }).eq("id", targetUser.id);
      toast.success(`تمت الترقية إلى ${role === "super_admin" ? "سوبر أدمن" : "أدمن"}`);
    }
  };

  const distributeCoins = async () => {
    if (!targetUser || !coinAmount) return;
    const amount = parseInt(coinAmount);
    if (isNaN(amount) || amount <= 0) return;

    const newCoins = (targetUser.coins || 0) + amount;
    await supabase.from("profiles").update({ coins: newCoins }).eq("id", targetUser.id);
    toast.success(`تم إضافة ${amount.toLocaleString()} عملة`);
    setTargetUser({ ...targetUser, coins: newCoins });
    setCoinAmount("");
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 rounded-full border-4 border-accent border-t-transparent animate-spin" />
      </div>
    );
  }

  if (!isBoss) return null;

  return (
    <PageTransition>
      <div className="min-h-screen pb-8">
        <header className="bg-card/90 backdrop-blur-xl border-b border-border px-4 py-4">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Shield className="w-6 h-6 text-accent" />
              <h1 className="font-black text-lg boss-fire-text">لوحة الآلهة</h1>
            </div>
            <button onClick={() => navigate("/profile")} className="text-sm text-muted-foreground">
              رجوع
            </button>
          </div>
        </header>

        <main className="px-4 max-w-lg mx-auto mt-6 space-y-4">
          {/* Search user */}
          <div className="card-nova p-4">
            <h3 className="font-bold text-sm mb-3 flex items-center gap-2">
              <Search className="w-4 h-4 text-primary" /> بحث بالمعرف
            </h3>
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="أدخل ID المستخدم"
                value={searchId}
                onChange={(e) => setSearchId(e.target.value)}
                className="flex-1 bg-secondary/50 rounded-2xl px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-primary border border-border"
              />
              <button onClick={searchUser} className="px-4 py-2 rounded-2xl gradient-neon text-primary-foreground font-bold text-sm btn-nova">
                بحث
              </button>
            </div>
          </div>

          {/* Target user card */}
          {targetUser && (
            <motion.div
              className="card-nova p-4 space-y-4"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full overflow-hidden ring-2 ring-accent">
                  <img src={targetUser.avatar_url || "https://i.pravatar.cc/100"} alt="" className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="font-bold text-sm">{targetUser.display_name}</p>
                  <p className="text-xs text-muted-foreground">ID: {targetUser.user_id} • VIP {targetUser.vip_level}</p>
                </div>
              </div>

              {/* Promote buttons */}
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => promoteUser("super_admin", 6)}
                  className="py-3 rounded-2xl text-xs font-bold border border-destructive/50 text-destructive hover:bg-destructive/10 transition-all admin-frame-red"
                >
                  <Crown className="w-4 h-4 inline mr-1" /> سوبر أدمن
                </button>
                <button
                  onClick={() => promoteUser("admin", 5)}
                  className="py-3 rounded-2xl text-xs font-bold border border-blue-500/50 text-blue-400 hover:bg-blue-500/10 transition-all admin-frame-blue"
                >
                  <Shield className="w-4 h-4 inline mr-1" /> أدمن
                </button>
              </div>

              {/* Coin distribution */}
              <div>
                <h4 className="text-xs font-bold mb-2 flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-accent" /> توزيع عملات
                </h4>
                <div className="flex gap-2">
                  <input
                    type="number"
                    placeholder="الكمية"
                    value={coinAmount}
                    onChange={(e) => setCoinAmount(e.target.value)}
                    className="flex-1 bg-secondary/50 rounded-xl px-3 py-2 text-sm focus:outline-none border border-border"
                  />
                  <button onClick={distributeCoins} className="px-4 py-2 rounded-xl gradient-gold text-accent-foreground font-bold text-sm btn-nova">
                    إرسال
                  </button>
                </div>
              </div>

              {/* Ban button */}
              <button className="w-full py-3 rounded-2xl bg-destructive/20 text-destructive font-bold text-sm flex items-center justify-center gap-2 btn-nova">
                <Ban className="w-4 h-4" /> طرد نهائي (Ban)
              </button>
            </motion.div>
          )}

          {/* Quick actions */}
          <div className="grid grid-cols-2 gap-3">
            <div className="card-nova p-4 text-center">
              <Users className="w-6 h-6 text-primary mx-auto mb-2" />
              <p className="text-xs font-bold">المستخدمين النشطين</p>
              <p className="text-lg font-black text-primary">--</p>
            </div>
            <div className="card-nova p-4 text-center">
              <Zap className="w-6 h-6 text-accent mx-auto mb-2" />
              <p className="text-xs font-bold">إجمالي العملات</p>
              <p className="text-lg font-black text-accent">∞</p>
            </div>
          </div>
        </main>
      </div>
    </PageTransition>
  );
};

export default AdminDashboard;
