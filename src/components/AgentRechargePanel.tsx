import { useState } from "react";
import { Search, Coins as CoinsIcon, Loader2, Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import AgentTransferModal from "./AgentTransferModal";
import RechargeAgentBadge from "./RechargeAgentBadge";

type Props = {
  /** Current coin balance to show in the panel header (will live-update on success). */
  myCoins: number;
  /** Notifies parent (Profile page) so it can update its own state without reload. */
  onBalanceChange?: (newBalance: number) => void;
};

type FoundUser = { id: string; user_id: string; display_name: string; avatar_url: string | null };

/**
 * Panel rendered on the agent's own Profile page that lets them search for any
 * user by their public 6-digit ID and instantly transfer NOVA Coins from their
 * personal balance via the secure `agent_transfer_coins` RPC.
 */
const AgentRechargePanel = ({ myCoins, onBalanceChange }: Props) => {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [found, setFound] = useState<FoundUser | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const search = async () => {
    const code = query.trim();
    if (!code) { toast.error("أدخل ID المستخدم"); return; }
    setSearching(true);
    setFound(null);
    const { data, error } = await supabase
      .from("profiles")
      .select("id,user_id,display_name,avatar_url")
      .eq("user_id", code)
      .maybeSingle();
    setSearching(false);
    if (error || !data) {
      toast.error("لم يتم العثور على مستخدم بهذا المعرف");
      return;
    }
    setFound(data as FoundUser);
  };

  return (
    <div
      className="mt-4 rounded-3xl p-4 border-2 border-yellow-200/30 relative overflow-hidden"
      style={{
        background:
          "linear-gradient(135deg, hsl(0 70% 18% / 0.85), hsl(20 60% 14% / 0.85) 50%, hsl(45 70% 22% / 0.7))",
        boxShadow: "0 8px 32px hsl(0 80% 35% / 0.35)",
      }}
    >
      {/* Magic shimmer */}
      <div
        className="absolute inset-0 opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle at 80% 20%, hsl(45 95% 55% / 0.4), transparent 60%)" }}
      />

      <div className="relative">
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2">
            <RechargeAgentBadge size="sm" />
            <span className="font-black text-sm text-white">شحن العملاء</span>
          </div>
          <div className="flex items-center gap-1 px-2 py-1 rounded-full bg-background/40 border border-yellow-200/30">
            <CoinsIcon className="w-3.5 h-3.5 text-yellow-300" />
            <span className="font-black text-xs text-yellow-300">{myCoins.toLocaleString()}</span>
          </div>
        </div>

        <p className="text-[11px] text-muted-foreground mb-2">
          أدخل ID المستخدم لتحويل عملات من رصيدك مباشرةً.
        </p>

        <div className="flex gap-2">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") search(); }}
            placeholder="ID المستخدم (6 أرقام)"
            inputMode="numeric"
            className="flex-1 rounded-xl bg-background/60 border border-border/40 px-3 py-2 text-foreground text-sm font-bold focus:outline-none focus:border-yellow-300/60"
          />
          <button
            onClick={search}
            disabled={searching}
            className="px-3 rounded-xl font-black text-sm flex items-center justify-center gap-1.5 text-white
              bg-gradient-to-r from-red-600 via-red-500 to-orange-500
              shadow-[0_0_10px_hsl(0_85%_55%/0.5)] disabled:opacity-50"
          >
            {searching ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
          </button>
        </div>

        {found && (
          <div className="mt-3 rounded-2xl bg-background/40 border border-border/30 p-3 flex items-center gap-3">
            <img
              src={found.avatar_url || "https://i.pravatar.cc/100?img=3"}
              alt={found.display_name}
              className="w-10 h-10 rounded-full object-cover border border-border/40"
            />
            <div className="flex-1 min-w-0">
              <p className="font-bold text-sm text-foreground truncate">{found.display_name}</p>
              <p className="text-[10px] text-muted-foreground">ID: {found.user_id}</p>
            </div>
            <button
              onClick={() => setModalOpen(true)}
              className="px-3 py-2 rounded-full text-xs font-black text-white flex items-center gap-1
                bg-gradient-to-r from-red-600 via-red-500 to-orange-500
                shadow-[0_0_10px_hsl(0_85%_55%/0.5)]"
            >
              <Send className="w-3.5 h-3.5" /> تحويل
            </button>
          </div>
        )}
      </div>

      {found && (
        <AgentTransferModal
          open={modalOpen}
          onClose={() => setModalOpen(false)}
          recipientId={found.id}
          recipientName={found.display_name}
          onSuccess={(newBalance) => onBalanceChange?.(newBalance)}
        />
      )}
    </div>
  );
};

export default AgentRechargePanel;
