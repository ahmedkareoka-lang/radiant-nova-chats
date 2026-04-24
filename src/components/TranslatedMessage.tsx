import { Languages } from "lucide-react";
import { useAutoTranslate } from "@/hooks/useAutoTranslate";

interface TranslatedMessageProps {
  text: string;
  enabled: boolean;
}

/**
 * Renders the AI Arabic translation under a chat message,
 * but only if the original text isn't already in Arabic and translation is enabled.
 */
const TranslatedMessage = ({ text, enabled }: TranslatedMessageProps) => {
  const { translation, loading } = useAutoTranslate(text, enabled);

  if (!enabled) return null;
  if (loading) {
    return (
      <span className="block text-[10px] text-muted-foreground/70 italic mt-0.5">
        جاري الترجمة...
      </span>
    );
  }
  if (!translation) return null;

  return (
    <span className="block text-[11px] text-accent/90 mt-0.5 flex items-start gap-1">
      <Languages className="w-3 h-3 mt-0.5 shrink-0" />
      <span>{translation}</span>
    </span>
  );
};

export default TranslatedMessage;
