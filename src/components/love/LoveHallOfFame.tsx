import { motion } from "framer-motion";
import { Crown, Trophy } from "lucide-react";
import { useLoveLeaderboard } from "@/hooks/useLoveLeaderboard";

const LoveHallOfFame = () => {
  const { rows, loading } = useLoveLeaderboard(20);

  return (
    <div
      className="rounded-3xl p-4 border-2 border-yellow-400/40 backdrop-blur-md"
      style={{ background: "linear-gradient(135deg, hsl(45 70% 20% / 0.45), hsl(330 60% 15% / 0.45))" }}
    >
      <div className="flex items-center gap-2 mb-3">
        <Trophy className="w-5 h-5 text-yellow-300" />
        <h3 className="font-black text-foreground">قاعة المشاهير — أقوى 20 زوج</h3>
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground text-center py-6">جاري التحميل…</p>
      ) : rows.length === 0 ? (
        <p className="text-xs text-muted-foreground text-center py-6">لا توجد بيانات بعد</p>
      ) : (
        <div className="space-y-1.5">
          {rows.map((c, i) => {
            const rank = i + 1;
            const medal = rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : null;
            return (
              <motion.div
                key={c.id}
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.02 }}
                className={`flex items-center gap-2 p-2 rounded-xl ${
                  rank <= 3
                    ? "bg-gradient-to-r from-yellow-500/15 to-transparent border border-yellow-400/30"
                    : "bg-background/25 border border-border/15"
                }`}
              >
                <div className="w-7 text-center text-sm font-black">
                  {medal ?? <span className="text-muted-foreground">#{rank}</span>}
                </div>
                <div className="flex -space-x-2">
                  <img loading="lazy" src={c.user1?.avatar_url || "https://i.pravatar.cc/40?u=" + c.id + "a"}
                    className="w-8 h-8 rounded-full ring-2 ring-pink-400/60 object-cover" alt="" />
                  <img loading="lazy" src={c.user2?.avatar_url || "https://i.pravatar.cc/40?u=" + c.id + "b"}
                    className="w-8 h-8 rounded-full ring-2 ring-purple-400/60 object-cover" alt="" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-foreground truncate">
                    {c.user1?.display_name ?? "?"} <span className="text-pink-300">💞</span> {c.user2?.display_name ?? "?"}
                  </p>
                  <p className="text-[10px] text-yellow-200 font-bold">
                    {c.love_points.toLocaleString()} نقطة · Lv.{c.love_level}
                  </p>
                </div>
                {c.love_level >= 10 && <Crown className="w-4 h-4 text-yellow-400" />}
              </motion.div>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default LoveHallOfFame;
