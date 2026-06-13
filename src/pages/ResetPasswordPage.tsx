import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";

const PWD_RE = /^(?:[0-9]{6,12}|[A-Za-z]{6,12}|(?=.*[A-Za-z])(?=.*[0-9])[A-Za-z0-9]{6,12})$/;

const ResetPasswordPage = () => {
  const navigate = useNavigate();
  const [pwd, setPwd] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!PWD_RE.test(pwd)) { toast.error("كلمة السر يجب أن تكون 6-12 حرف/رقم"); return; }
    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: pwd });
    setLoading(false);
    if (error) toast.error(error.message);
    else { toast.success("تم تحديث كلمة السر ✅"); navigate("/", { replace: true }); }
  };

  return (
    <div className="min-h-screen flex items-center justify-center px-6" dir="rtl">
      <form onSubmit={onSubmit} className="w-full max-w-sm space-y-4 bg-card/80 border border-border rounded-2xl p-6 backdrop-blur-xl">
        <div className="flex items-center gap-2 text-lg font-bold">
          <KeyRound className="w-5 h-5 text-primary" />
          إعادة تعيين كلمة السر
        </div>
        <input
          type="password"
          value={pwd}
          onChange={(e) => setPwd(e.target.value)}
          placeholder="كلمة السر الجديدة"
          minLength={6}
          maxLength={12}
          className="w-full bg-secondary/50 rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:ring-1 focus:ring-primary"
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-full gradient-neon text-primary-foreground font-bold disabled:opacity-50"
        >
          {loading ? "جارٍ الحفظ..." : "حفظ"}
        </button>
      </form>
    </div>
  );
};

export default ResetPasswordPage;
