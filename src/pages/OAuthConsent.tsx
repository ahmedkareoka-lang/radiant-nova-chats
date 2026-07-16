import { useEffect, useState } from "react";
import { useSearchParams, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

/**
 * Managed Supabase OAuth 2.1 consent route.
 * External MCP clients (ChatGPT, Claude, Codex, Cursor…) are redirected here
 * by the Supabase authorization server. The user approves or denies the
 * client, and we send them back to the provider-supplied redirect URL.
 */

// Beta @supabase/supabase-js OAuth surface — local typed wrapper.
type OAuthApi = {
  getAuthorizationDetails: (id: string) => Promise<{ data: any; error: any }>;
  approveAuthorization: (id: string) => Promise<{ data: any; error: any }>;
  denyAuthorization: (id: string) => Promise<{ data: any; error: any }>;
};
const oauth = (supabase.auth as unknown as { oauth: OAuthApi }).oauth;

const REDIRECT_KEY = "nova-redirect-after-login";

export default function OAuthConsent() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const authorizationId = params.get("authorization_id") ?? "";
  const [details, setDetails] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let active = true;
    (async () => {
      if (!authorizationId) {
        setError("Missing authorization_id");
        setReady(true);
        return;
      }
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) {
        // Preserve the full consent URL so login returns the user here.
        try {
          sessionStorage.setItem(
            REDIRECT_KEY,
            window.location.pathname + window.location.search,
          );
        } catch {}
        navigate("/login", { replace: true });
        return;
      }
      if (!oauth?.getAuthorizationDetails) {
        setError("This project's Supabase client does not expose the OAuth API. Please redeploy.");
        setReady(true);
        return;
      }
      const { data, error: err } = await oauth.getAuthorizationDetails(authorizationId);
      if (!active) return;
      if (err) {
        setError(err.message || "Could not load authorization request");
        setReady(true);
        return;
      }
      const immediate = data?.redirect_url ?? data?.redirect_to;
      if (immediate && !data?.client) {
        window.location.href = immediate;
        return;
      }
      setDetails(data);
      setReady(true);
    })();
    return () => {
      active = false;
    };
  }, [authorizationId, navigate]);

  async function decide(approve: boolean) {
    setBusy(true);
    const { data, error: err } = approve
      ? await oauth.approveAuthorization(authorizationId)
      : await oauth.denyAuthorization(authorizationId);
    if (err) {
      setBusy(false);
      setError(err.message || "Authorization failed");
      return;
    }
    const target = data?.redirect_url ?? data?.redirect_to;
    if (!target) {
      setBusy(false);
      setError("No redirect returned by the authorization server.");
      return;
    }
    window.location.href = target;
  }

  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-background p-6" dir="rtl">
        <div className="max-w-md w-full rounded-3xl border border-border/40 bg-card/60 backdrop-blur p-6 text-center">
          <h1 className="text-xl font-black text-foreground mb-2">تعذّر تحميل طلب التخويل</h1>
          <p className="text-sm text-muted-foreground">{error}</p>
        </div>
      </main>
    );
  }

  const clientName = details?.client?.name ?? details?.client?.client_name ?? "التطبيق الخارجي";
  const requestedScopes: string[] = Array.isArray(details?.scopes)
    ? details.scopes
    : typeof details?.scope === "string"
      ? details.scope.split(/\s+/).filter(Boolean)
      : [];

  return (
    <main
      className="min-h-screen flex items-center justify-center bg-background p-6"
      dir="rtl"
    >
      <div className="max-w-md w-full rounded-3xl border border-border/40 bg-card/70 backdrop-blur-xl p-6 shadow-2xl">
        <h1 className="text-2xl font-black text-foreground mb-1">
          ربط {clientName} بحساب NOVA
        </h1>
        <p className="text-sm text-muted-foreground mb-4">
          هذا سيسمح للتطبيق باستخدام أدوات NOVA نيابةً عنك أثناء تسجيل دخولك.
        </p>

        <div className="rounded-2xl bg-background/40 border border-border/30 p-3 mb-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            <span className="text-muted-foreground">التطبيق:</span>
            <span className="font-bold text-foreground">{clientName}</span>
          </div>
          {details?.client?.redirect_uri && (
            <div className="text-[11px] text-muted-foreground break-all">
              العودة إلى: {details.client.redirect_uri}
            </div>
          )}
          {requestedScopes.length > 0 && (
            <div>
              <div className="text-xs text-muted-foreground mb-1">الصلاحيات المطلوبة:</div>
              <div className="flex flex-wrap gap-1">
                {requestedScopes.map((s) => (
                  <span
                    key={s}
                    className="px-2 py-0.5 rounded-full bg-primary/15 border border-primary/30 text-[11px] font-bold text-foreground"
                  >
                    {s}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>

        <p className="text-[11px] text-muted-foreground mb-4">
          صلاحيات NOVA وسياسات الحماية على الخادم تبقى مفعّلة — هذا التخويل لا يتجاوزها.
        </p>

        <div className="flex gap-2">
          <button
            disabled={busy}
            onClick={() => decide(false)}
            className="flex-1 py-3 rounded-full bg-secondary/60 text-foreground font-bold border border-border/40 disabled:opacity-50"
          >
            إلغاء
          </button>
          <button
            disabled={busy}
            onClick={() => decide(true)}
            className="flex-1 py-3 rounded-full font-black text-white bg-gradient-to-r from-primary to-primary/80 shadow-lg disabled:opacity-50"
          >
            {busy ? <Loader2 className="w-4 h-4 animate-spin mx-auto" /> : "موافقة"}
          </button>
        </div>
      </div>
    </main>
  );
}
