import { motion } from "framer-motion";
import { Check, X, Clock, Heart } from "lucide-react";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ar } from "date-fns/locale";
import CurrencyIcon from "@/components/CurrencyIcon";
import { RELATIONSHIP_TYPES } from "@/lib/relationshipTypes";
import type { RelationshipRequest } from "@/hooks/useRelationshipRequests";

interface Props {
  request: RelationshipRequest;
  onChanged?: () => void;
}

const RelationshipRequestCard = ({ request, onChanged }: Props) => {
  const [busy, setBusy] = useState(false);
  const meta = RELATIONSHIP_TYPES[request.relationship_type];
  const isIncoming = request.is_incoming;

  const accept = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("accept_relationship_request", { _request_id: request.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.success(`${meta.emoji} تم قبول الطلب! تهانينا`);
    onChanged?.();
  };

  const reject = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("reject_relationship_request", { _request_id: request.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.info("تم رفض الطلب");
    onChanged?.();
  };

  const cancel = async () => {
    setBusy(true);
    const { error } = await supabase.rpc("cancel_relationship_request", { _request_id: request.id });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    toast.info("تم إلغاء الطلب");
    onChanged?.();
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-2xl p-3 border-2 backdrop-blur-md"
      style={{
        borderColor: meta.glow + "60",
        background: `linear-gradient(135deg, ${meta.glow}1a, transparent)`,
      }}
    >
      <div className="flex items-center gap-3 mb-2">
        <div className="relative shrink-0">
          <img
            loading="lazy" decoding="async"
            src={request.other_party?.avatar_url || "https://i.pravatar.cc/100"}
            alt=""
            className="w-12 h-12 rounded-full object-cover ring-2"
            style={{ borderColor: meta.glow }}
          />
          <div
            className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full flex items-center justify-center text-xs"
            style={{ background: meta.gradient }}
          >
            {meta.emoji}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-bold text-sm text-foreground truncate">
            {request.other_party?.display_name || "..."}
          </p>
          <p className="text-[11px] text-muted-foreground flex items-center gap-1">
            <Heart className="w-3 h-3" />
            {isIncoming ? `يطلب ${meta.label}` : `طلب ${meta.label} مُرسَل`}
          </p>
          <p className="text-[10px] text-muted-foreground flex items-center gap-1 mt-0.5">
            <Clock className="w-3 h-3" />
            {formatDistanceToNow(new Date(request.created_at), { addSuffix: true, locale: ar })}
          </p>
        </div>
        <div className="flex items-center gap-1 text-xs font-black text-foreground">
          {meta.cost.toLocaleString()} <CurrencyIcon type="gold" size="xs" />
        </div>
      </div>

      {request.message && (
        <p className="text-xs text-muted-foreground p-2 rounded-lg bg-background/40 mb-2 italic">
          "{request.message}"
        </p>
      )}

      <div className="flex gap-2">
        {isIncoming ? (
          <>
            <button
              onClick={accept}
              disabled={busy}
              className="flex-1 py-2 rounded-full font-bold text-white text-xs flex items-center justify-center gap-1 disabled:opacity-50"
              style={{ background: meta.gradient }}
            >
              <Check className="w-4 h-4" /> قبول
            </button>
            <button
              onClick={reject}
              disabled={busy}
              className="flex-1 py-2 rounded-full font-bold text-foreground text-xs flex items-center justify-center gap-1 bg-secondary border border-border/30 disabled:opacity-50"
            >
              <X className="w-4 h-4" /> رفض
            </button>
          </>
        ) : (
          <button
            onClick={cancel}
            disabled={busy}
            className="flex-1 py-2 rounded-full font-bold text-destructive text-xs flex items-center justify-center gap-1 bg-destructive/10 border border-destructive/30 disabled:opacity-50"
          >
            <X className="w-4 h-4" /> إلغاء الطلب
          </button>
        )}
      </div>
    </motion.div>
  );
};

export default RelationshipRequestCard;
