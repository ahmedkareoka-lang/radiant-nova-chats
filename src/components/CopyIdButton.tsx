import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface Props {
  id: string | null | undefined;
  /** Optional label prefix, defaults to "ID" */
  label?: string;
  className?: string;
}

/**
 * Inline pill showing "ID: xxxx" with a copy-to-clipboard action.
 * Used on own profile and other users' profiles.
 */
const CopyIdButton = ({ id, label = "ID", className = "" }: Props) => {
  const [copied, setCopied] = useState(false);
  if (!id) return null;

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await navigator.clipboard.writeText(id);
      setCopied(true);
      toast({ description: "تم نسخ المعرّف" });
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast({ description: "تعذّر النسخ", variant: "destructive" });
    }
  };

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`inline-flex items-center gap-1.5 text-[11px] text-muted-foreground bg-secondary/40 hover:bg-secondary/70 border border-border/40 rounded-full px-2.5 py-1 transition-colors active:scale-95 ${className}`}
      aria-label="نسخ المعرّف"
    >
      <span className="font-medium">{label}: {id}</span>
      {copied ? (
        <Check className="w-3 h-3 text-emerald-400" />
      ) : (
        <Copy className="w-3 h-3 opacity-70" />
      )}
    </button>
  );
};

export default CopyIdButton;
