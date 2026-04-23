import { useCallback, useRef } from "react";

const AI_CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-chat`;

export const useWelcomeBot = () => {
  const recentlyWelcomed = useRef<Set<string>>(new Set());

  const getWelcomeMessage = useCallback(async (userName: string): Promise<string> => {
    // Prevent duplicate welcomes
    if (recentlyWelcomed.current.has(userName)) return "";
    recentlyWelcomed.current.add(userName);

    // Clean up after 5 minutes
    setTimeout(() => recentlyWelcomed.current.delete(userName), 5 * 60 * 1000);

    try {
      const resp = await fetch(AI_CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: [{ role: "user", content: userName }],
          mode: "welcome",
        }),
      });

      if (!resp.ok || !resp.body) return `أهلاً ${userName}! نورت الغرفة ✨`;

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let result = "";
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        let nlIdx: number;
        while ((nlIdx = buffer.indexOf("\n")) !== -1) {
          const line = buffer.slice(0, nlIdx).trim();
          buffer = buffer.slice(nlIdx + 1);
          if (!line.startsWith("data: ")) continue;
          const json = line.slice(6).trim();
          if (json === "[DONE]") break;
          try {
            const parsed = JSON.parse(json);
            const text = parsed.choices?.[0]?.delta?.content;
            if (text) result += text;
          } catch { /* skip */ }
        }
      }

      return result || `أهلاً ${userName}! نورت الغرفة ✨`;
    } catch {
      return `أهلاً ${userName}! نورت الغرفة ✨`;
    }
  }, []);

  return { getWelcomeMessage };
};
