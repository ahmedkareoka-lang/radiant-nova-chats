import { useState } from "react";
import { Copy, Check, Flame } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  digits: string;
  expiresAt?: string | null;
  className?: string;
  size?: "sm" | "md" | "lg";
}

const SIZE_CLS: Record<NonNullable<Props["size"]>, string> = {
  sm: "px-2.5 py-1 text-[11px] gap-1",
  md: "px-3 py-1.5 text-sm gap-1.5",
  lg: "px-4 py-2 text-base gap-2",
};

/**
 * Luxury fiery-orange glowing 4-digit Special ID pill.
 * Shown on profiles and anywhere a vanity ID needs to stand out.
 */
const VanityIdPill = ({ digits, expiresAt, className = "", size = "md" }: Props) => {
  const [copied, setCopied] = useState(false);
  const active = !expiresAt || new Date(expiresAt).getTime() > Date.now();
  if (!digits || !active) return null;

  const copy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(digits);
      setCopied(true);
      toast({ description: "تم نسخ المعرّف المميز ✨" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ description: "تعذّر النسخ", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      aria-label="نسخ المعرّف المميز"
      className={`relative inline-flex items-center font-black tracking-[0.2em] rounded-full select-none active:scale-95 transition-transform ${SIZE_CLS[size]} ${className}`}
      style={{
        color: "#fff7ed",
        background:
          "linear-gradient(135deg, hsl(20 95% 52%) 0%, hsl(35 100% 55%) 45%, hsl(15 100% 50%) 100%)",
        border: "1.5px solid hsl(35 100% 65% / 0.95)",
        boxShadow: [
          "0 0 0 1px hsl(30 100% 60% / 0.35)",
          "0 0 14px hsl(25 100% 55% / 0.95)",
          "0 0 32px hsl(20 100% 50% / 0.7)",
          "0 0 60px hsl(15 100% 48% / 0.45)",
          "inset 0 1px 0 hsl(45 100% 85% / 0.6)",
          "inset 0 -1px 0 hsl(15 90% 25% / 0.4)",
        ].join(", "),
        textShadow:
          "0 0 6px hsl(40 100% 70% / 0.95), 0 0 14px hsl(20 100% 55% / 0.7), 0 1px 2px hsl(15 90% 20% / 0.6)",
        animation: "vanityGlow 2.4s ease-in-out infinite",
      }}
    >
      <span
        aria-hidden
        className="pointer-events-none absolute inset-x-1 top-0 h-1/2 rounded-t-full opacity-50"
        style={{ background: "linear-gradient(to bottom, hsl(45 100% 90% / 0.65), transparent)" }}
      />
      <Flame className="w-3.5 h-3.5 drop-shadow-[0_0_6px_hsl(40_100%_70%)]" />
      <span className="relative">ID</span>
      <span className="relative">{digits}</span>
      {copied ? (
        <Check className="w-3.5 h-3.5" />
      ) : (
        <Copy className="w-3 h-3 opacity-80" />
      )}
    </button>
  );
};

export default VanityIdPill;
