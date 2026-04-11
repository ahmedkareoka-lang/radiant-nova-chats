import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import CurrencyIcon from "@/components/CurrencyIcon";
import { RotateCcw } from "lucide-react";

interface HostIncomeCounterProps {
  hostId: string;
  roomOwnerId: string;
  currentUserId: string | null;
  sessionStart: string;
}

const HostIncomeCounter = ({ hostId, roomOwnerId, currentUserId, sessionStart }: HostIncomeCounterProps) => {
  const [income, setIncome] = useState(0);
  const [resetTime, setResetTime] = useState(sessionStart);
  const isOwner = currentUserId === roomOwnerId;

  const fetchIncome = useCallback(async () => {
    const { data } = await supabase
      .from("gift_transactions")
      .select("diamond_amount")
      .eq("receiver_id", hostId)
      .gte("created_at", resetTime);
    const total = data?.reduce((acc, g) => acc + Number(g.diamond_amount), 0) || 0;
    setIncome(total);
  }, [hostId, resetTime]);

  useEffect(() => {
    fetchIncome();
    const channel = supabase
      .channel(`host-income-${hostId}-${Date.now()}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "gift_transactions" }, (payload) => {
        if ((payload.new as any).receiver_id === hostId) fetchIncome();
      })
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [hostId, fetchIncome]);

  const handleReset = () => {
    setResetTime(new Date().toISOString());
    setIncome(0);
  };

  return (
    <div className="flex items-center gap-1 mt-1">
      <span className="text-[9px] font-bold text-accent flex items-center gap-0.5">
        💎 {income.toLocaleString()}
      </span>
      {isOwner && (
        <button onClick={handleReset} className="w-3.5 h-3.5 text-muted-foreground hover:text-destructive transition-colors" title="تصفير العداد">
          <RotateCcw className="w-3 h-3" />
        </button>
      )}
    </div>
  );
};

export default HostIncomeCounter;
