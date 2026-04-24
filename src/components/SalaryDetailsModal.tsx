import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Calendar, Gem, Mic, AlertCircle, ScrollText, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import NovaSpinner from "./NovaSpinner";

interface Props {
  open: boolean;
  onClose: () => void;
  hostId?: string; // defaults to current user
  hostName?: string;
}

type CycleMode = "standard" | "alt30";

/**
 * Detailed salary screen for a host:
 * - Daily breakdown of diamonds, minutes, and active-day status
 * - Compliance status (days + hours) and penalty if applied
 * - Per-cycle audit log entries (gift unlocks, transfers, target adjustments, policy changes)
 * - Cycle mode toggle: standard (1-15 / 16-end) or alt30 (30-14 / 15-29)
 */
const SalaryDetailsModal = ({ open, onClose, hostId, hostName }: Props) => {
  const [mode, setMode] = useState<CycleMode>("standard");
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      setLoading(true);
      const { data, error } = await supabase.rpc("get_host_salary_details" as any, {
        _host_id: hostId ?? null,
        _cycle_mode: mode,
      });
      if (!error) setData(data);
      setLoading(false);
    };
    load();
  }, [open, mode, hostId]);

  if (!open) return null;

  const fmt = (n: any) => Number(n || 0).toLocaleString();
  const breakdown: any[] = data?.daily_breakdown || [];
  const audit: any[] = data?.audit_log || [];

  const actionLabel = (t: string) => {
    switch (t) {
      case "policy_change": return "تغيير سياسة";
      case "gift_unlock": return "فك هدية";
      case "gift_transfer": return "تحويل ماس";
      case "target_adjustment": return "تعديل تارجت";
      default: return t;
    }
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        className="fixed inset-0 z-[100] bg-background/90 backdrop-blur-sm flex items-end md:items-center justify-center p-0 md:p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ y: 50, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 50, opacity: 0 }}
          className="bg-card border-t md:border border-primary/30 rounded-t-3xl md:rounded-3xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="sticky top-0 bg-card/95 backdrop-blur-xl border-b border-border px-4 py-3 flex items-center gap-2 z-10">
            <Activity className="w-5 h-5 text-primary" />
            <h2 className="font-bold text-base flex-1">تفاصيل راتب {hostName || "المضيف"}</h2>
            <button onClick={onClose} className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center">
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-4 space-y-4">
            {/* Cycle mode toggle */}
            <div className="bg-secondary/40 rounded-xl p-2 flex gap-1">
              <button
                onClick={() => setMode("standard")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "standard" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                دورة 1 → 15 / 16 → نهاية
              </button>
              <button
                onClick={() => setMode("alt30")}
                className={`flex-1 py-2 rounded-lg text-xs font-bold transition-all ${
                  mode === "alt30" ? "bg-primary text-primary-foreground" : "text-muted-foreground"
                }`}
              >
                دورة 30 → 14 / 15 → 29
              </button>
            </div>

            {loading && <div className="py-12 flex justify-center"><NovaSpinner /></div>}

            {!loading && data && (
              <>
                {/* Cycle summary */}
                <div className="rounded-2xl p-3 border border-primary/30 bg-gradient-to-br from-primary/10 to-accent/10">
                  <div className="flex items-center justify-between mb-2">
                    <p className="text-xs font-bold flex items-center gap-1"><Calendar className="w-3 h-3" />{data.cycle_label}</p>
                    {data.penalty_pct > 0 && (
                      <span className="text-[10px] px-2 py-0.5 rounded-full bg-destructive/20 text-destructive font-bold">
                        خصم {data.penalty_pct}%
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-card/60 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">إجمالي الماس</p>
                      <p className="font-extrabold text-sm text-primary">{fmt(data.total_diamonds)} 💎</p>
                    </div>
                    <div className="bg-card/60 rounded-xl p-2 text-center">
                      <p className="text-[9px] text-muted-foreground">الراتب الصافي</p>
                      <p className="font-extrabold text-sm text-accent">${fmt(data.final_salary_usd)}</p>
                    </div>
                    <div className={`rounded-xl p-2 text-center border ${data.meets_days ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"}`}>
                      <p className="text-[9px] text-muted-foreground">أيام نشطة</p>
                      <p className="font-bold text-xs">{data.active_days} / {data.required_days}</p>
                    </div>
                    <div className={`rounded-xl p-2 text-center border ${data.meets_hours ? "border-green-500/40 bg-green-500/10" : "border-destructive/40 bg-destructive/10"}`}>
                      <p className="text-[9px] text-muted-foreground">ساعات البث</p>
                      <p className="font-bold text-xs">{Number(data.total_hours).toFixed(1)} / {data.required_hours}h</p>
                    </div>
                  </div>
                </div>

                {/* Daily breakdown */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-1"><Gem className="w-3 h-3 text-primary" />تفصيل الأيام</h3>
                  <div className="rounded-xl overflow-hidden border border-border">
                    <div className="grid grid-cols-4 gap-1 px-2 py-1.5 bg-secondary/60 text-[10px] font-bold text-muted-foreground">
                      <span>التاريخ</span>
                      <span className="text-center">الماس</span>
                      <span className="text-center">الدقائق</span>
                      <span className="text-center">نشط</span>
                    </div>
                    <div className="max-h-64 overflow-y-auto">
                      {breakdown.map((d) => (
                        <div key={d.date} className="grid grid-cols-4 gap-1 px-2 py-1.5 text-[11px] border-t border-border/50">
                          <span className="text-muted-foreground">{String(d.date).slice(5)}</span>
                          <span className="text-center font-bold text-primary">{fmt(d.diamonds)}</span>
                          <span className="text-center">{d.minutes}</span>
                          <span className="text-center">{d.is_active ? "✅" : "—"}</span>
                        </div>
                      ))}
                      {breakdown.length === 0 && (
                        <p className="text-center text-[10px] text-muted-foreground py-4">لا توجد بيانات</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Audit log */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold flex items-center gap-1"><ScrollText className="w-3 h-3 text-accent" />سجل التدقيق</h3>
                  <div className="space-y-1.5 max-h-64 overflow-y-auto">
                    {audit.map((a) => (
                      <div key={a.id} className="bg-secondary/40 rounded-xl p-2 text-[11px] space-y-0.5">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-accent">{actionLabel(a.action_type)}</span>
                          <span className="text-[9px] text-muted-foreground">{new Date(a.created_at).toLocaleString("ar-EG")}</span>
                        </div>
                        <p className="text-muted-foreground">{a.description}</p>
                        {(a.diamond_amount > 0 || a.coin_amount > 0) && (
                          <div className="flex gap-2 text-[10px]">
                            {a.diamond_amount > 0 && <span>💎 {fmt(a.diamond_amount)}</span>}
                            {a.coin_amount > 0 && <span>🪙 {fmt(a.coin_amount)}</span>}
                          </div>
                        )}
                      </div>
                    ))}
                    {audit.length === 0 && (
                      <p className="text-center text-[10px] text-muted-foreground py-4 flex items-center justify-center gap-1">
                        <AlertCircle className="w-3 h-3" /> لا توجد إدخالات في السجل لهذه الدورة
                      </p>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

export default SalaryDetailsModal;
