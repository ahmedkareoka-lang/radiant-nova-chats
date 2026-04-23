import { useCallback } from "react";

const MODERATE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-moderate`;

export interface ModerationResult {
  category: "safe" | "harassment" | "hate_speech" | "sexual" | "spam";
  confidence: number;
  reason: string;
}

export const useModeration = () => {
  const moderate = useCallback(async (message: string): Promise<ModerationResult> => {
    try {
      const resp = await fetch(MODERATE_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({ message }),
      });
      if (!resp.ok) return { category: "safe", confidence: 0, reason: "unavailable" };
      return await resp.json();
    } catch {
      return { category: "safe", confidence: 0, reason: "error" };
    }
  }, []);

  return { moderate };
};
