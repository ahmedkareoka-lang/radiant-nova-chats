import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Heuristic: if text contains any Arabic letter, skip translation entirely.
const ARABIC_RE = /[\u0600-\u06FF]/;

// In-memory cache so the same message isn't re-translated on every render.
const cache = new Map<string, string | null>(); // text -> translation (null = same lang)

/**
 * Calls the ai-room-tools edge function in 'translate' mode.
 * Returns the Arabic translation, or null if the text is already Arabic / shouldn't be translated.
 */
export function useAutoTranslate(text: string, enabled: boolean) {
  const [translation, setTranslation] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!enabled || !text || text.length < 2) {
      setTranslation(null);
      return;
    }
    // Skip emoji-only / very short messages
    const stripped = text.replace(/[\p{Emoji}\s\d.,!?؟،]/gu, "").trim();
    if (stripped.length < 3) {
      setTranslation(null);
      return;
    }
    // If any Arabic letter present, treat as Arabic — no translation needed
    if (ARABIC_RE.test(text)) {
      setTranslation(null);
      return;
    }
    if (cache.has(text)) {
      setTranslation(cache.get(text) || null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("ai-room-tools", {
          body: { mode: "translate", text },
        });
        if (cancelled) return;
        if (error || (data as any)?.error) {
          cache.set(text, null);
          setTranslation(null);
        } else {
          const t = (data as any)?.translation || null;
          cache.set(text, t);
          setTranslation(t);
        }
      } catch {
        if (!cancelled) {
          cache.set(text, null);
          setTranslation(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [text, enabled]);

  return { translation, loading };
}
