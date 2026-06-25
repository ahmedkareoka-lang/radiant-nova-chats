/**
 * 🛠️ Hidden Admin Bulk Import Dashboard
 * Route: /admin/bulk-import (hidden — only admins who know the URL).
 *
 * Accepts:
 *   1. assets.zip  → /frames /gifts /entrances folders with binary files
 *   2. catalog.csv → columns: type,file_name,name_ar,price_coins,rarity,tier_required
 *
 * Pipeline:
 *   - Parse CSV instantly with papaparse → preview table
 *   - On submit: extract ZIP with JSZip, upload each binary to the `assets`
 *     Supabase Storage bucket under `bulk/{type}/{file_name}`,
 *     then INSERT rows into `gifts` (gifts) or `store_items` (frames/entrances).
 */
import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  ChevronRight, UploadCloud, FileArchive, FileSpreadsheet, Eye, Send, Power,
  CheckCircle2, AlertTriangle, X, Loader2, Sparkles, Image as ImageIcon,
} from "lucide-react";
import Papa from "papaparse";
import JSZip from "jszip";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";

type Rarity = "common" | "rare" | "epic" | "legendary" | "mythic";
interface CsvRow {
  type: "frame" | "gift" | "entrance";
  file_name: string;
  name_ar: string;
  price_coins: number;
  rarity: Rarity;
  tier_required: number;
}

const RARITY_CLR: Record<string, string> = {
  common: "bg-slate-500/20 text-slate-300 border-slate-500/40",
  rare: "bg-blue-500/20 text-blue-300 border-blue-500/40",
  epic: "bg-purple-500/20 text-purple-300 border-purple-500/40",
  legendary: "bg-amber-500/20 text-amber-300 border-amber-500/40",
  mythic: "bg-pink-500/20 text-pink-300 border-pink-500/40",
};

const TYPE_CLR: Record<string, string> = {
  frame: "bg-purple-500/20 text-purple-300",
  gift: "bg-pink-500/20 text-pink-300",
  entrance: "bg-cyan-500/20 text-cyan-300",
};

export default function NovaBulkImportPage() {
  const navigate = useNavigate();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [zipFile, setZipFile] = useState<File | null>(null);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [rows, setRows] = useState<CsvRow[]>([]);
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [progress, setProgress] = useState({ done: 0, total: 0, label: "" });
  const [results, setResults] = useState<{ ok: number; fail: number; log: string[] } | null>(null);

  // 🔒 Admin gate
  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setIsAdmin(false); return; }
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", user.id);
      const admin = (data || []).some((r: any) => r.role === "admin" || r.role === "boss");
      setIsAdmin(admin);
    })();
  }, []);

  const parseCsv = useCallback((file: File) => {
    Papa.parse<CsvRow>(file, {
      header: true,
      skipEmptyLines: true,
      transformHeader: (h) => h.trim().toLowerCase(),
      complete: (res) => {
        const errs: string[] = [];
        const cleaned: CsvRow[] = [];
        res.data.forEach((r: any, i: number) => {
          const type = String(r.type || "").trim().toLowerCase();
          if (!["frame", "gift", "entrance"].includes(type)) {
            errs.push(`صف ${i + 2}: نوع غير صالح "${r.type}"`); return;
          }
          if (!r.file_name) { errs.push(`صف ${i + 2}: file_name مفقود`); return; }
          if (!r.name_ar) { errs.push(`صف ${i + 2}: name_ar مفقود`); return; }
          cleaned.push({
            type: type as any,
            file_name: String(r.file_name).trim(),
            name_ar: String(r.name_ar).trim(),
            price_coins: Number(r.price_coins) || 0,
            rarity: (String(r.rarity || "common").trim().toLowerCase() as Rarity) || "common",
            tier_required: Number(r.tier_required) || 0,
          });
        });
        setRows(cleaned);
        setErrors(errs);
        toast.success(`تم تحليل ${cleaned.length} صف${errs.length ? ` (${errs.length} خطأ)` : ""}`);
      },
      error: (err) => toast.error(`فشل تحليل CSV: ${err.message}`),
    });
  }, []);

  const onCsvChange = (f: File | null) => {
    setCsvFile(f); setRows([]); setErrors([]); setPreview(false); setResults(null);
    if (f) parseCsv(f);
  };

  const stats = useMemo(() => ({
    frames: rows.filter(r => r.type === "frame").length,
    gifts: rows.filter(r => r.type === "gift").length,
    entrances: rows.filter(r => r.type === "entrance").length,
  }), [rows]);

  const submit = async () => {
    if (!enabled) return toast.error("فعّل Bulk Import أولاً");
    if (!zipFile || !csvFile || !rows.length) return toast.error("ارفع ZIP و CSV أولاً");
    setSubmitting(true);
    setResults(null);
    const log: string[] = [];
    let ok = 0, fail = 0;

    try {
      // 1. Extract ZIP
      setProgress({ done: 0, total: rows.length, label: "فك الضغط..." });
      const zip = await JSZip.loadAsync(zipFile);
      const fileMap = new Map<string, JSZip.JSZipObject>();
      Object.values(zip.files).forEach((entry) => {
        if (entry.dir) return;
        const base = entry.name.split("/").pop()!;
        fileMap.set(base, entry);
      });

      // 2. Process each row
      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        setProgress({ done: i, total: rows.length, label: `${row.file_name}` });
        const folder = row.type === "frame" ? "frames" : row.type === "gift" ? "gifts" : "entrances";
        const zipEntry = fileMap.get(row.file_name) || zip.file(`${folder}/${row.file_name}`);
        if (!zipEntry) { log.push(`❌ ${row.file_name}: ملف غير موجود في ZIP`); fail++; continue; }

        try {
          const blob = await (zipEntry as JSZip.JSZipObject).async("blob");
          const ext = row.file_name.split(".").pop()?.toLowerCase() || "bin";
          const mime = ext === "png" ? "image/png" : ext === "jpg" || ext === "jpeg" ? "image/jpeg"
            : ext === "svg" ? "image/svg+xml" : ext === "json" ? "application/json"
            : ext === "mp4" ? "video/mp4" : ext === "webm" ? "video/webm" : "application/octet-stream";
          const path = `bulk/${folder}/${Date.now()}_${row.file_name}`;
          const { error: upErr } = await supabase.storage.from("assets").upload(path, blob, {
            contentType: mime, upsert: true,
          });
          if (upErr) throw upErr;
          const { data: { publicUrl } } = supabase.storage.from("assets").getPublicUrl(path);

          if (row.type === "gift") {
            const isVid = ext === "mp4" || ext === "webm";
            const isLottie = ext === "json";
            const { error: insErr } = await supabase.from("gifts").insert({
              name: row.name_ar,
              price: row.price_coins,
              tier: row.rarity,
              image_url: !isVid && !isLottie ? publicUrl : null,
              video_url: isVid ? publicUrl : null,
              lottie_url: isLottie ? publicUrl : null,
              category: "imported",
              is_active: true,
              duration_ms: 3000,
            });
            if (insErr) throw insErr;
          } else {
            // frame or entrance → store_items
            const { error: insErr } = await supabase.from("store_items").insert({
              name: row.name_ar,
              type: row.type,
              price_coins: row.price_coins,
              price_diamonds: 0,
              tier_type: row.rarity,
              tier_required: row.tier_required,
              image_url: publicUrl,
              is_active: true,
              data: { file_name: row.file_name, rarity: row.rarity },
            });
            if (insErr) throw insErr;
          }
          log.push(`✅ ${row.type}: ${row.name_ar}`);
          ok++;
        } catch (e: any) {
          log.push(`❌ ${row.file_name}: ${e.message || e}`);
          fail++;
        }
      }
      setProgress({ done: rows.length, total: rows.length, label: "اكتمل" });
      setResults({ ok, fail, log });
      toast.success(`اكتمل الاستيراد: ${ok} نجاح، ${fail} فشل`);
    } catch (e: any) {
      toast.error(`فشل: ${e.message}`);
    } finally {
      setSubmitting(false);
    }
  };

  if (isAdmin === null) {
    return <div className="min-h-screen flex items-center justify-center bg-background"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>;
  }
  if (!isAdmin) {
    return (
      <div dir="rtl" className="min-h-screen flex flex-col items-center justify-center bg-background text-foreground gap-4 p-6">
        <AlertTriangle className="w-12 h-12 text-destructive" />
        <h1 className="text-xl font-bold">صلاحيات غير كافية</h1>
        <p className="text-sm text-muted-foreground text-center">هذه الصفحة مخصصة للمشرفين فقط.</p>
        <Button onClick={() => navigate("/")}>عودة</Button>
      </div>
    );
  }

  return (
    <div dir="rtl" className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 text-foreground pb-32">
      {/* Header */}
      <header className="sticky top-0 z-20 backdrop-blur-xl bg-background/80 border-b border-primary/20 px-4 py-3 flex items-center gap-3">
        <button onClick={() => navigate(-1)} className="w-9 h-9 rounded-full bg-secondary/50 flex items-center justify-center">
          <ChevronRight className="w-5 h-5 rotate-180" />
        </button>
        <div className="flex items-center gap-2 flex-1">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <Sparkles className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base font-bold">NovaBulkImport</h1>
            <p className="text-[10px] text-muted-foreground">لوحة الاستيراد الجماعي</p>
          </div>
        </div>
        <span className={`text-[10px] px-2 py-1 rounded-full border ${enabled ? "bg-emerald-500/20 text-emerald-300 border-emerald-500/40" : "bg-muted/30 text-muted-foreground border-border/40"}`}>
          {enabled ? "● نشط" : "○ غير مفعّل"}
        </span>
      </header>

      <div className="p-4 max-w-5xl mx-auto space-y-4">
        {/* Drop zones */}
        <div className="grid md:grid-cols-2 gap-4">
          <DropZone
            label="رفع ملف الأصول (assets.zip)"
            hint="يجب أن يحتوي على مجلدات: /frames /gifts /entrances"
            icon={FileArchive}
            accept=".zip"
            file={zipFile}
            onChange={setZipFile}
            color="from-purple-500/20 to-pink-500/10"
            iconColor="text-purple-400"
          />
          <DropZone
            label="رفع ملف الفهرس (catalog.csv)"
            hint="الأعمدة: type, file_name, name_ar, price_coins, rarity, tier_required"
            icon={FileSpreadsheet}
            accept=".csv"
            file={csvFile}
            onChange={onCsvChange}
            color="from-cyan-500/20 to-blue-500/10"
            iconColor="text-cyan-400"
          />
        </div>

        {/* Stats */}
        {rows.length > 0 && (
          <div className="grid grid-cols-4 gap-2">
            <StatCard label="إجمالي" value={rows.length} color="text-primary" />
            <StatCard label="إطارات" value={stats.frames} color="text-purple-400" />
            <StatCard label="هدايا" value={stats.gifts} color="text-pink-400" />
            <StatCard label="دخوليات" value={stats.entrances} color="text-cyan-400" />
          </div>
        )}

        {/* Errors */}
        {errors.length > 0 && (
          <div className="rounded-2xl border border-destructive/40 bg-destructive/10 p-4">
            <div className="flex items-center gap-2 mb-2 text-destructive font-bold text-sm">
              <AlertTriangle className="w-4 h-4" /> أخطاء في CSV ({errors.length})
            </div>
            <ul className="text-xs text-destructive/90 space-y-1 max-h-32 overflow-y-auto">
              {errors.slice(0, 20).map((e, i) => <li key={i}>• {e}</li>)}
            </ul>
          </div>
        )}

        {/* Preview table */}
        {preview && rows.length > 0 && (
          <div className="rounded-2xl border border-border/40 bg-secondary/10 overflow-hidden">
            <div className="px-4 py-3 border-b border-border/40 flex items-center justify-between">
              <div className="font-bold text-sm">معاينة ({rows.length})</div>
              <button onClick={() => setPreview(false)} className="w-7 h-7 rounded-full bg-secondary/60 flex items-center justify-center">
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
            <div className="overflow-x-auto max-h-[400px]">
              <table className="w-full text-xs">
                <thead className="bg-secondary/30 sticky top-0">
                  <tr className="text-muted-foreground">
                    <th className="px-3 py-2 text-start font-bold">#</th>
                    <th className="px-3 py-2 text-start font-bold">type</th>
                    <th className="px-3 py-2 text-start font-bold">file_name</th>
                    <th className="px-3 py-2 text-start font-bold">name_ar</th>
                    <th className="px-3 py-2 text-start font-bold">price_coins</th>
                    <th className="px-3 py-2 text-start font-bold">rarity</th>
                    <th className="px-3 py-2 text-start font-bold">tier</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r, i) => (
                    <tr key={i} className="border-t border-border/20 hover:bg-secondary/20">
                      <td className="px-3 py-2 text-muted-foreground">{i + 1}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${TYPE_CLR[r.type]}`}>{r.type}</span></td>
                      <td className="px-3 py-2 font-mono text-[11px]">{r.file_name}</td>
                      <td className="px-3 py-2 font-bold">{r.name_ar}</td>
                      <td className="px-3 py-2 text-amber-400 font-bold">{r.price_coins.toLocaleString()}</td>
                      <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${RARITY_CLR[r.rarity]}`}>{r.rarity}</span></td>
                      <td className="px-3 py-2">{r.tier_required}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Progress */}
        {submitting && (
          <div className="rounded-2xl border border-primary/40 bg-primary/5 p-4 space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold">{progress.label}</span>
              <span className="text-muted-foreground">{progress.done} / {progress.total}</span>
            </div>
            <div className="h-2 rounded-full bg-secondary/40 overflow-hidden">
              <div className="h-full bg-gradient-to-r from-primary to-accent transition-all" style={{ width: `${(progress.done / Math.max(progress.total, 1)) * 100}%` }} />
            </div>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="rounded-2xl border border-border/40 bg-secondary/10 p-4 space-y-3">
            <div className="flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="font-bold">اكتمل الاستيراد</div>
                <div className="text-xs text-muted-foreground">
                  <span className="text-emerald-400">{results.ok} نجاح</span> • <span className="text-destructive">{results.fail} فشل</span>
                </div>
              </div>
            </div>
            <div className="max-h-48 overflow-y-auto text-[11px] font-mono space-y-0.5 bg-background/40 rounded-lg p-2">
              {results.log.map((l, i) => <div key={i} className={l.startsWith("❌") ? "text-destructive" : "text-emerald-400"}>{l}</div>)}
            </div>
          </div>
        )}
      </div>

      {/* Sticky action bar */}
      <div className="fixed bottom-0 left-0 right-0 backdrop-blur-xl bg-background/90 border-t border-primary/20 p-3 z-20">
        <div className="max-w-5xl mx-auto grid grid-cols-3 gap-2">
          <Button
            variant={enabled ? "default" : "outline"}
            onClick={() => { setEnabled(!enabled); toast(enabled ? "تم تعطيل الاستيراد" : "تم تفعيل Bulk Import"); }}
            className={enabled ? "bg-gradient-to-r from-emerald-500 to-emerald-600" : ""}
          >
            <Power className="w-4 h-4 ml-1" /> تفعيل
          </Button>
          <Button variant="outline" onClick={() => setPreview(true)} disabled={!rows.length}>
            <Eye className="w-4 h-4 ml-1" /> معاينة
          </Button>
          <Button onClick={submit} disabled={submitting || !enabled || !zipFile || !csvFile || !rows.length}
            className="bg-gradient-to-r from-primary to-accent">
            {submitting ? <Loader2 className="w-4 h-4 ml-1 animate-spin" /> : <Send className="w-4 h-4 ml-1" />}
            قدّم
          </Button>
        </div>
      </div>
    </div>
  );
}

function DropZone({ label, hint, icon: Icon, accept, file, onChange, color, iconColor }: any) {
  const ref = useRef<HTMLInputElement>(null);
  const [drag, setDrag] = useState(false);
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
      onDragLeave={() => setDrag(false)}
      onDrop={(e) => {
        e.preventDefault(); setDrag(false);
        const f = e.dataTransfer.files[0];
        if (f) onChange(f);
      }}
      onClick={() => ref.current?.click()}
      className={`relative cursor-pointer rounded-2xl border-2 border-dashed p-6 transition-all bg-gradient-to-br ${color} ${
        drag ? "border-primary scale-[1.02]" : file ? "border-emerald-500/50" : "border-border/40 hover:border-primary/50"
      }`}
    >
      <input ref={ref} type="file" accept={accept} className="hidden" onChange={(e) => onChange(e.target.files?.[0] || null)} />
      <div className="flex flex-col items-center text-center gap-2">
        <div className={`w-12 h-12 rounded-2xl bg-background/60 flex items-center justify-center ${iconColor}`}>
          {file ? <CheckCircle2 className="w-6 h-6 text-emerald-400" /> : <Icon className="w-6 h-6" />}
        </div>
        <div className="font-bold text-sm">{label}</div>
        {file ? (
          <div className="text-xs text-emerald-400 font-mono">{file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)</div>
        ) : (
          <>
            <div className="text-[11px] text-muted-foreground">{hint}</div>
            <div className="text-[10px] text-primary mt-1 flex items-center gap-1"><UploadCloud className="w-3 h-3" /> اسحب الملف أو اضغط للاختيار</div>
          </>
        )}
      </div>
    </div>
  );
}

function StatCard({ label, value, color }: any) {
  return (
    <div className="rounded-2xl border border-border/40 bg-secondary/20 p-3 text-center">
      <div className={`text-2xl font-black ${color}`}>{value}</div>
      <div className="text-[10px] text-muted-foreground">{label}</div>
    </div>
  );
}
