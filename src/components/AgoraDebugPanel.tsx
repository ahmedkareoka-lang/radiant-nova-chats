import { useEffect, useState } from "react";
import { Bug, Trash2, X, Copy, ChevronDown, ChevronUp } from "lucide-react";
import { subscribeAgoraLogs, clearAgoraLogs, type AgoraLogEntry } from "@/lib/agoraDebugLog";
import { toast } from "sonner";

const STORAGE_KEY = "nova:agora-debug-enabled";

const levelStyle: Record<string, string> = {
  info: "text-blue-300 bg-blue-500/10 border-blue-500/30",
  warn: "text-amber-300 bg-amber-500/10 border-amber-500/30",
  error: "text-red-300 bg-red-500/10 border-red-500/30",
  success: "text-green-300 bg-green-500/10 border-green-500/30",
};

const formatTime = (ts: number) => {
  const d = new Date(ts);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}.${String(d.getMilliseconds()).padStart(3, "0")}`;
};

const getDeviceInfo = () => {
  const ua = navigator.userAgent;
  const isIOS = /iPad|iPhone|iPod/.test(ua);
  const isAndroid = /Android/.test(ua);
  const platform = isIOS ? "iOS" : isAndroid ? "Android" : "Desktop";
  return { platform, ua };
};

export default function AgoraDebugPanel() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try { return localStorage.getItem(STORAGE_KEY) === "1"; } catch { return false; }
  });
  const [open, setOpen] = useState(false);
  const [entries, setEntries] = useState<AgoraLogEntry[]>([]);
  const [collapsedHeader, setCollapsedHeader] = useState(false);

  useEffect(() => {
    if (!enabled) return;
    return subscribeAgoraLogs(setEntries);
  }, [enabled]);

  // Hidden activation: tap top-right corner 5 times within 2s, OR add ?debug=1 to URL
  useEffect(() => {
    try {
      const params = new URLSearchParams(window.location.search);
      if (params.get("debug") === "1") {
        localStorage.setItem(STORAGE_KEY, "1");
        setEnabled(true);
      }
    } catch { /* noop */ }

    let taps = 0;
    let timer: any = null;
    const onTap = (e: TouchEvent | MouseEvent) => {
      const x = "touches" in e ? e.touches[0]?.clientX ?? 0 : (e as MouseEvent).clientX;
      const y = "touches" in e ? e.touches[0]?.clientY ?? 0 : (e as MouseEvent).clientY;
      // Top-right 80x80 corner
      if (x >= window.innerWidth - 80 && y <= 80) {
        taps++;
        clearTimeout(timer);
        timer = setTimeout(() => { taps = 0; }, 2000);
        if (taps >= 5) {
          taps = 0;
          const next = !enabled;
          try { localStorage.setItem(STORAGE_KEY, next ? "1" : "0"); } catch { /* noop */ }
          setEnabled(next);
          toast.success(next ? "Debug mode ON" : "Debug mode OFF");
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

  if (!enabled) return null;

  const errorCount = entries.filter((e) => e.level === "error").length;
  const warnCount = entries.filter((e) => e.level === "warn").length;
  const { platform, ua } = getDeviceInfo();

  const copyAll = async () => {
    const header = `Device: ${platform}\nUA: ${ua}\n\n`;
    const body = entries
      .slice()
      .reverse()
      .map((e) => `[${formatTime(e.ts)}] ${e.level.toUpperCase()} ${e.tag}: ${e.message}`)
      .join("\n");
    try {
      await navigator.clipboard.writeText(header + body);
      toast.success("Logs copied to clipboard");
    } catch {
      toast.error("Copy failed");
    }
  };

  return (
    <>
      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((o) => !o)}
        className="fixed bottom-24 right-3 z-[300] w-12 h-12 rounded-full bg-card/90 backdrop-blur border border-border shadow-lg flex items-center justify-center"
        aria-label="Agora Debug"
      >
        <Bug className="w-5 h-5 text-primary" />
        {(errorCount > 0 || warnCount > 0) && (
          <span className="absolute -top-1 -right-1 min-w-5 h-5 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-bold flex items-center justify-center">
            {errorCount + warnCount}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed inset-x-2 bottom-2 z-[301] max-h-[70vh] rounded-2xl border border-border bg-background/95 backdrop-blur-xl shadow-2xl flex flex-col overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-3 py-2 border-b border-border bg-card/60">
            <div className="flex items-center gap-2 min-w-0">
              <Bug className="w-4 h-4 text-primary shrink-0" />
              <span className="text-sm font-semibold text-foreground">Agora Debug</span>
              <span className="text-[10px] text-muted-foreground">· {platform} · {entries.length} events</span>
            </div>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCollapsedHeader((c) => !c)}
                className="p-1.5 rounded-md hover:bg-muted"
                aria-label="Toggle device info"
              >
                {collapsedHeader ? <ChevronDown className="w-4 h-4" /> : <ChevronUp className="w-4 h-4" />}
              </button>
              <button onClick={copyAll} className="p-1.5 rounded-md hover:bg-muted" aria-label="Copy logs">
                <Copy className="w-4 h-4" />
              </button>
              <button
                onClick={() => clearAgoraLogs()}
                className="p-1.5 rounded-md hover:bg-muted"
                aria-label="Clear logs"
              >
                <Trash2 className="w-4 h-4" />
              </button>
              <button onClick={() => setOpen(false)} className="p-1.5 rounded-md hover:bg-muted" aria-label="Close">
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Device info */}
          {!collapsedHeader && (
            <div className="px-3 py-2 border-b border-border text-[10px] text-muted-foreground break-all bg-muted/20">
              {ua}
            </div>
          )}

          {/* Stats row */}
          <div className="flex gap-2 px-3 py-2 border-b border-border bg-card/30 text-[11px]">
            <span className="text-red-400">Errors: {errorCount}</span>
            <span className="text-amber-400">Warnings: {warnCount}</span>
            <span className="text-blue-400">Info: {entries.filter((e) => e.level === "info").length}</span>
            <span className="text-green-400">Success: {entries.filter((e) => e.level === "success").length}</span>
          </div>

          {/* Logs */}
          <div className="flex-1 overflow-y-auto p-2 space-y-1.5 font-mono text-[11px]">
            {entries.length === 0 ? (
              <div className="text-center text-muted-foreground py-6">No events yet. Join a voice room to see logs.</div>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className={`px-2 py-1.5 rounded-md border ${levelStyle[e.level]} break-all`}
                >
                  <div className="flex items-center justify-between gap-2 mb-0.5">
                    <span className="font-bold opacity-90">{e.tag}</span>
                    <span className="opacity-60 text-[10px]">{formatTime(e.ts)}</span>
                  </div>
                  <div>{e.message}</div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </>
  );
}
