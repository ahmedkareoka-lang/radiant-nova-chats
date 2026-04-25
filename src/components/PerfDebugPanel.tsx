/**
 * 🚀 Performance Debug Panel
 *
 * Shows live Web Vitals (LCP/FCP/CLS/INP/FID/TTFB), realtime broadcast
 * latency (mic / gift / chat) with p50/p95, batcher stats, and current
 * gift-rate / priority tier. Lets the user export a JSON report on demand.
 *
 * Activation: localStorage["nova:perf-debug"]="1" or URL ?perf=1.
 * Floating button appears bottom-left so it doesn't clash with the Agora panel.
 */
import { useEffect, useMemo, useState } from "react";
import { Activity, X, Download, ChevronDown, ChevronUp } from "lucide-react";
import {
  aggregate,
  getSnapshot,
  initWebVitals,
  subscribePerf,
  type PerfSnapshot,
} from "@/lib/perfMetrics";
import { computePriority } from "@/lib/perfPriority";
import { toast } from "sonner";

const STORAGE_KEY = "nova:perf-debug";

const ratingColor = (rating?: string) => {
  if (rating === "good") return "text-green-300 border-green-500/40 bg-green-500/10";
  if (rating === "needs-improvement") return "text-amber-300 border-amber-500/40 bg-amber-500/10";
  if (rating === "poor") return "text-red-300 border-red-500/40 bg-red-500/10";
  return "text-muted-foreground border-border bg-muted/20";
};

const fmtVital = (name: string, value: number) => {
  if (name === "CLS") return value.toFixed(3);
  return `${Math.round(value)}ms`;
};

export default function PerfDebugPanel() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [open, setOpen] = useState(false);
  const [snap, setSnap] = useState<PerfSnapshot>(() => getSnapshot());
  const [collapsed, setCollapsed] = useState(false);

  // URL activation + 5-tap top-LEFT corner activation (mirrors Agora panel)
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("perf") === "1") {
        localStorage.setItem(STORAGE_KEY, "1");
        setEnabled(true);
      }
    } catch { /* noop */ }

    let taps = 0;
    let timer: any = null;
    const onTap = (e: TouchEvent | MouseEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
      const y = "touches" in e ? e.touches[0]?.clientY ?? 0 : (e as MouseEvent).clientY;
      if (x <= 80 && y <= 80) {
        taps++;
        clearTimeout(timer);
        timer = setTimeout(() => { taps = 0; }, 2000);
        if (taps >= 5) {
          taps = 0;
          const next = !enabled;
          try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* noop */ }
          setEnabled(next);
          toast.success(next ? "Perf debug ON" : "Perf debug OFF");
        }
      }
    };
    window.addEventListener("touchstart", onTap, { passive: true });
    window.addEventListener("click", onTap);
    return () => {
      window.removeEventListener("touchstart", onTap);
      window.removeEventListener("click", onTap);
      clearTimeout(timer);
    };
  }, [enabled]);

  // Initialize Web Vitals once when the panel is enabled
  useEffect(() => {
    if (!enabled) return;
    initWebVitals();
  }, [enabled]);

  // Subscribe to live updates + tick every second for gift rate
  useEffect(() => {
    if (!enabled) return;
    const update = () => setSnap(getSnapshot());
    update();
    const unsub = subscribePerf(update);
    const id = setInterval(update, 1000);
    return () => { unsub(); clearInterval(id); };
  }, [enabled]);

  const micStats = useMemo(() => aggregate(snap.latencies, "mic"), [snap.latencies]);
  const giftStats = useMemo(() => aggregate(snap.latencies, "gift"), [snap.latencies]);
  const chatStats = useMemo(() => aggregate(snap.latencies, "chat"), [snap.latencies]);
  const batchStats = useMemo(() => {
    if (snap.batches.length === 0) return { avgSize: 0, avgCoalesce: 0, count: 0 };
    const totalSize = snap.batches.reduce((a, b) => a + b.size, 0);
    const totalCoal = snap.batches.reduce((a, b) => a + b.coalesceMs, 0);
    return {
      avgSize: Math.round((totalSize / snap.batches.length) * 10) / 10,
      avgCoalesce: Math.round(totalCoal / snap.batches.length),
      count: snap.batches.length,
    };
  }, [snap.batches]);

  const exportReport = () => {
    const report = {
      generated_at: new Date().toISOString(),
      user_agent: navigator.userAgent,
      viewport: { w: window.innerWidth, h: window.innerHeight, dpr: window.devicePixelRatio },
      vitals: snap.vitals,
      latencies: {
        mic: micStats,
        gift: giftStats,
        chat: chatStats,
      },
      batcher: batchStats,
      gift_rate_per_sec: snap.giftRate,
      priority_tier: computePriority(snap.giftRate),
      raw_samples: snap.latencies,
      raw_batches: snap.batches,
    };
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `nova-perf-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    toast.success("تم تصدير التقرير");
  };

  if (!enabled) return null;

  const priority = computePriority(snap.giftRate);
  const priorityColor =
    priority === "low" ? "text-red-400" : priority === "normal" ? "text-amber-300" : "text-green-300";

  return (
    <>
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 left-3 z-[300] w-12 h-12 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg flex items-center justify-center"
        aria-label="Performance Debug"
      >
        <Activity className={`w-5 h-5 ${priorityColor}`} />
      </button>

      {open && (
        <div className="fixed inset-x-2 bottom-2 z-[301] max-h-[75vh] rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/60">
            <div className="flex items-center gap-2 min-w-0">
              <Activity className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">Performance</span>
              <span className={`text-[10px] font-bold ${priorityColor}`}>· {priority.toUpperCase()}</span>
              <span className="text-[10px] text-muted-foreground">· {snap.giftRate}/s gifts</span>
            </div>
            <div className="flex items-center gap-1">
              <button onClick={() => setCollapsed((c) => !c)} className="p-1.5 rounded-md hover:bg-muted">
                {collapsed ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={exportReport} className="p-1.5 rounded-md hover:bg-muted" aria-label="Export report">
                <Download className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-muted">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {!collapsed && (
            <div className="flex-1 overflow-y-auto p-3 space-y-4 text-[11px]">
              {/* Web Vitals */}
              <section>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Core Web Vitals
                </h3>
                <div className="grid grid-cols-3 gap-1.5">
                  {["LCP", "FCP", "CLS", "INP", "FID", "TTFB"].map((name) => {
                    const v = snap.vitals.find((x) => x.name === name);
                    return (
                      <div
                        key={name}
                        className={`px-2 py-2 rounded-md border text-center ${ratingColor(v?.rating)}`}
                      >
                        <div className="font-bold text-[10px] opacity-80">{name}</div>
                        <div className="font-mono text-[12px]">
                          {v ? fmtVital(name, v.value) : "—"}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </section>

              {/* Realtime Latencies */}
              <section>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Broadcast Latency (p50 / p95)
                </h3>
                <div className="space-y-1.5">
                  {([
                    ["Mic", micStats],
                    ["Gift", giftStats],
                    ["Chat", chatStats],
                  ] as const).map(([label, st]) => (
                    <div key={label} className="flex items-center justify-between px-2 py-1.5 rounded-md border border-border bg-card/40">
                      <span className="font-bold">{label}</span>
                      <div className="flex gap-3 font-mono text-muted-foreground">
                        <span>n={st.count}</span>
                        <span className={st.p50 < 100 ? "text-green-300" : st.p50 < 250 ? "text-amber-300" : "text-red-300"}>
                          p50: {st.p50}ms
                        </span>
                        <span className={st.p95 < 200 ? "text-green-300" : st.p95 < 400 ? "text-amber-300" : "text-red-300"}>
                          p95: {st.p95}ms
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Batcher */}
              <section>
                <h3 className="text-[10px] uppercase tracking-wider text-muted-foreground mb-2">
                  Realtime Batcher
                </h3>
                <div className="px-2 py-2 rounded-md border border-border bg-card/40 flex justify-between font-mono text-muted-foreground">
                  <span>batches: {batchStats.count}</span>
                  <span>avg size: {batchStats.avgSize}</span>
                  <span>coalesce: {batchStats.avgCoalesce}ms</span>
                </div>
              </section>

              <p className="text-[10px] text-muted-foreground text-center">
                اضغط <Download className="inline w-3 h-3" /> لتصدير تقرير JSON كامل عند أي تباطؤ.
              </p>
            </div>
          )}
        </div>
      )}
    </>
  );
}
