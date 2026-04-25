import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Copy, Check, ExternalLink, Loader2, ShieldCheck, Wallet,
  Lock, Smartphone, QrCode, AlertCircle
} from "lucide-react";
import { toast } from "sonner";

export interface BinancePackage {
  usdt: number;
  coins: number;
  diamonds: number;
  bonus: number;
}

interface Props {
  open: boolean;
  onClose: () => void;
  pkg: BinancePackage | null;
  walletAddress: string;
  network: string; // e.g. TRC20
  qrUrl?: string | null;
  /** Optional: if your backend can mint a Binance Pay deep link */
  payUrl?: string | null;
  submitting: boolean;
  /** parent submits to RPC */
  onSubmit: (orderId: string) => Promise<void> | void;
}

const isMobile = () =>
  typeof navigator !== "undefined" &&
  /android|iphone|ipad|ipod/i.test(navigator.userAgent);

/**
 * Build Binance app deep links.
 * - Universal (https) → opens app if installed, else web
 * - Native scheme    → fallback for older installs
 * Binance officially supports `bnc://app.binance.com/...` and the universal
 * `https://app.binance.com/...` scheme. We attempt universal first, then native.
 */
const buildBinanceLinks = (amount: number, address: string, network: string) => {
  const params = new URLSearchParams({
    asset: "USDT",
    amount: String(amount),
    network, // TRC20 / BSC / etc.
    address,
  }).toString();

  return {
    universal: `https://app.binance.com/payment/secpay?${params}`,
    native: `bnc://app.binance.com/payment/secpay?${params}`,
    web: `https://www.binance.com/en/my/wallet/account/main/withdrawal/crypto/USDT?network=${network}`,
  };
};

const BinancePayModal = ({
  open, onClose, pkg, walletAddress, network, qrUrl, payUrl,
  submitting, onSubmit,
}: Props) => {
  const [orderId, setOrderId] = useState("");
  const [copiedField, setCopiedField] = useState<"amount" | "address" | null>(null);
  const [step, setStep] = useState<1 | 2>(1);

  useEffect(() => {
    if (open) {
      setOrderId("");
      setCopiedField(null);
      setStep(1);
    }
  }, [open, pkg?.usdt]);

  const links = useMemo(
    () => (pkg ? buildBinanceLinks(pkg.usdt, walletAddress, network) : null),
    [pkg, walletAddress, network]
  );

  const copyTo = async (value: string, field: "amount" | "address") => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedField(field);
      toast.success(field === "amount" ? "تم نسخ المبلغ" : "تم نسخ عنوان المحفظة");
      setTimeout(() => setCopiedField(null), 1800);
    } catch {
      toast.error("تعذر النسخ");
    }
  };

  const openBinance = () => {
    // Prefer real Binance Pay link if provided (per-package)
    if (payUrl) {
      // Use location.href on mobile for better deep-link handoff to Binance app
      if (isMobile()) {
        window.location.href = payUrl;
      } else {
        window.open(payUrl, "_blank", "noopener,noreferrer");
      }
      return;
    }
    if (!links) return;
    if (isMobile()) {
      // Try universal (opens app if installed). Fallback to native after timeout.
      const t = Date.now();
      window.location.href = links.universal;
      setTimeout(() => {
        if (Date.now() - t < 1600) {
          window.location.href = links.native;
          setTimeout(() => {
            if (Date.now() - t < 3200) window.open(links.web, "_blank");
          }, 800);
        }
      }, 800);
    } else {
      window.open(links.web, "_blank", "noopener,noreferrer");
    }
  };

  const handleSubmit = async () => {
    if (orderId.trim().length < 6) {
      toast.error("أدخل Order ID صحيح من تطبيق باينانس");
      return;
    }
    await onSubmit(orderId.trim());
  };

  if (!pkg) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md p-0 gap-0 border-yellow-500/30 bg-gradient-to-b from-background via-background to-purple-950/30 overflow-hidden">
        <DialogHeader className="p-4 border-b border-yellow-500/20 bg-gradient-to-r from-yellow-500/10 via-amber-500/5 to-purple-500/10">
          <DialogTitle className="flex items-center gap-2 font-extrabold">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-500 flex items-center justify-center">
              <Wallet className="w-4 h-4 text-black" />
            </div>
            <span className="bg-gradient-to-r from-yellow-300 to-amber-200 bg-clip-text text-transparent">
              دفع Binance Pay
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="p-4 space-y-4 max-h-[80vh] overflow-y-auto">
          {/* Step indicators */}
          <div className="flex items-center gap-2">
            <StepDot n={1} active={step >= 1} done={step > 1} label="ادفع" />
            <div className="flex-1 h-0.5 bg-border/50 rounded-full">
              <div className={`h-full bg-gradient-to-r from-yellow-400 to-purple-400 rounded-full transition-all ${step > 1 ? "w-full" : "w-0"}`} />
            </div>
            <StepDot n={2} active={step >= 2} done={false} label="تأكيد" />
          </div>

          {step === 1 && (
            <>
              {/* Locked Amount card */}
              <div className="rounded-2xl p-4 border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-500/15 to-amber-500/5 relative overflow-hidden">
                <div className="absolute top-2 right-2 flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-400/40">
                  <Lock className="w-2.5 h-2.5 text-emerald-300" />
                  <span className="text-[9px] font-black text-emerald-300">مقفل</span>
                </div>
                <p className="text-[10px] text-yellow-200/70 mb-1">المبلغ المطلوب تحويله بدقة</p>
                <div className="flex items-end gap-1.5 mb-3">
                  <span className="text-4xl font-black text-yellow-200 tabular-nums">{pkg.usdt}</span>
                  <span className="text-lg font-bold text-yellow-300/80 mb-1">USDT</span>
                  {pkg.bonus > 0 && (
                    <span className="ml-auto mb-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-purple-500 to-pink-500 text-[10px] font-black text-white">
                      +{pkg.bonus}% بونص
                    </span>
                  )}
                </div>
                <button
                  onClick={() => copyTo(String(pkg.usdt), "amount")}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-yellow-500/20 border border-yellow-400/40 text-yellow-200 text-xs font-bold hover:bg-yellow-500/30 transition"
                >
                  {copiedField === "amount" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === "amount" ? "تم النسخ ✓" : "نسخ المبلغ"}
                </button>
              </div>

              {/* Wallet card */}
              <div className="rounded-2xl p-4 border border-purple-500/30 bg-gradient-to-br from-purple-500/10 to-fuchsia-500/5 space-y-3">
                <div className="flex items-center justify-between">
                  <p className="text-[10px] text-purple-200/80 font-bold">عنوان المحفظة · شبكة {network}</p>
                  <span className="text-[9px] text-emerald-300 flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> رسمي
                  </span>
                </div>
                <p className="font-mono text-[11px] break-all text-purple-100 bg-background/60 rounded-xl p-2.5 border border-purple-500/20" dir="ltr">
                  {walletAddress || "—"}
                </p>
                <button
                  onClick={() => copyTo(walletAddress, "address")}
                  disabled={!walletAddress}
                  className="w-full flex items-center justify-center gap-2 py-2 rounded-xl bg-purple-500/20 border border-purple-400/40 text-purple-200 text-xs font-bold hover:bg-purple-500/30 disabled:opacity-40 transition"
                >
                  {copiedField === "address" ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiedField === "address" ? "تم النسخ ✓" : "نسخ العنوان"}
                </button>

                {qrUrl && (
                  <details className="group">
                    <summary className="cursor-pointer text-[10px] text-purple-300/80 flex items-center gap-1 list-none">
                      <QrCode className="w-3 h-3" />
                      عرض QR Code
                    </summary>
                    <div className="mt-2 flex justify-center">
                      <div className="p-2 rounded-xl bg-white">
                        <img src={qrUrl} alt="USDT QR" loading="lazy" className="w-36 h-36 object-contain" />
                      </div>
                    </div>
                  </details>
                )}
              </div>

              {/* Open Binance buttons */}
              <div className="space-y-2">
                <button
                  onClick={openBinance}
                  disabled={!walletAddress}
                  className="w-full py-3.5 rounded-2xl font-black text-sm flex items-center justify-center gap-2 text-black
                    bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400
                    shadow-[0_8px_30px_hsl(45_95%_55%/0.4)] disabled:opacity-40 disabled:shadow-none active:scale-[0.98] transition"
                >
                  <Smartphone className="w-4 h-4" />
                  ادفع الآن · فتح تطبيق Binance
                </button>
                <button
                  onClick={() => setStep(2)}
                  className="w-full py-2.5 rounded-2xl text-xs font-bold border border-yellow-500/30 text-yellow-200 hover:bg-yellow-500/10 transition flex items-center justify-center gap-2"
                >
                  أكملت الدفع، أدخل Order ID
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              </div>

              <div className="rounded-xl p-2.5 bg-amber-500/10 border border-amber-500/20 text-[10px] text-amber-200/90 flex gap-2">
                <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
                <span>
                  حوّل بالضبط <b className="text-amber-100">{pkg.usdt} USDT</b> عبر شبكة <b className="text-amber-100">{network}</b> فقط.
                  أي مبلغ أو شبكة مختلفة لن يتم اعتمادها.
                </span>
              </div>
            </>
          )}

          {step === 2 && (
            <>
              <div className="rounded-2xl p-4 border-2 border-yellow-400/40 bg-gradient-to-br from-yellow-500/15 to-purple-500/10">
                <p className="text-[10px] text-yellow-200/70 mb-1">المبلغ المحوّل</p>
                <p className="text-2xl font-black text-yellow-200 mb-2 tabular-nums">{pkg.usdt} USDT</p>

                <label className="block text-[11px] font-bold text-purple-200 mb-1.5">
                  Order ID / Transaction ID
                </label>
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  placeholder="ألصق Order ID من تطبيق Binance"
                  className="w-full rounded-xl bg-background/70 border border-purple-500/40 px-3 py-2.5 text-sm font-mono text-foreground placeholder:text-muted-foreground/60 focus:outline-none focus:border-yellow-400 focus:ring-2 focus:ring-yellow-400/30"
                  dir="ltr"
                  autoFocus
                />
                <p className="text-[10px] text-muted-foreground mt-2 flex items-start gap-1">
                  <ShieldCheck className="w-3 h-3 text-emerald-400 mt-0.5 shrink-0" />
                  ستجد Order ID في تفاصيل العملية داخل تطبيق Binance.
                  سيتم اعتماد طلبك وإضافة الرصيد تلقائياً بعد التحقق.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={() => setStep(1)}
                  disabled={submitting}
                  className="py-3 rounded-2xl text-xs font-bold border border-border/50 text-muted-foreground hover:text-foreground hover:border-border transition"
                >
                  رجوع
                </button>
                <button
                  onClick={handleSubmit}
                  disabled={submitting || orderId.trim().length < 6}
                  className="py-3 rounded-2xl font-black text-xs flex items-center justify-center gap-1.5 text-black
                    bg-gradient-to-r from-yellow-400 via-amber-300 to-yellow-400
                    shadow-[0_4px_20px_hsl(45_95%_55%/0.4)] disabled:opacity-40 disabled:shadow-none transition"
                >
                  {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <ShieldCheck className="w-4 h-4" />}
                  تأكيد الطلب
                </button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const StepDot = ({ n, active, done, label }: { n: number; active: boolean; done: boolean; label: string }) => (
  <div className="flex flex-col items-center gap-1">
    <div className={`w-7 h-7 rounded-full flex items-center justify-center text-[11px] font-black transition ${
      done ? "bg-emerald-500 text-white"
        : active ? "bg-gradient-to-br from-yellow-400 to-amber-500 text-black"
        : "bg-secondary text-muted-foreground"
    }`}>
      {done ? <Check className="w-3.5 h-3.5" /> : n}
    </div>
    <span className={`text-[9px] font-bold ${active ? "text-yellow-200" : "text-muted-foreground"}`}>{label}</span>
  </div>
);

export default BinancePayModal;
