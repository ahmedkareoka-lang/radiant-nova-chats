import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import AvatarImg from "@/components/AvatarImg";

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
    vip_level?: number | null;
  } | null;
}

interface Props {
  message: ChatMessage;
  isMine: boolean;
}

/**
 * 💬 MessageItem — bubble + circular tappable avatar (→ profile).
 * Mine: gradient bubble with green check on the inner side.
 * Theirs: dark secondary bubble.
 */
export const MessageItem = memo(function MessageItem({ message, isMine }: Props) {
  const navigate = useNavigate();
  const goProfile = () => {
    if (message.sender_id) navigate(`/user?id=${message.sender_id}`);
  };

  const Avatar = (
    <button
      onClick={goProfile}
      className="shrink-0 w-10 h-10 rounded-full overflow-hidden ring-2 ring-border/40 bg-secondary"
      aria-label="عرض الملف الشخصي"
    >
      <AvatarImg src={message.sender?.avatar_url} alt={message.sender?.display_name || ""} />
    </button>
  );

  return (
    <div className={`flex items-center gap-2 ${isMine ? "justify-end" : "justify-start"} px-2 py-1.5`}>
      {!isMine && Avatar}

      {isMine && (
        <Check className="w-4 h-4 text-green-500 bg-green-500/10 rounded-full p-0.5" strokeWidth={3} />
      )}

      <div
        className={`max-w-[70%] px-4 py-2.5 text-sm leading-relaxed break-words shadow-md ${
          isMine
            ? "text-white rounded-2xl"
            : "bg-secondary/80 text-foreground rounded-2xl"
        }`}
        style={
          isMine
            ? {
                background: "linear-gradient(135deg, hsl(200 90% 65%), hsl(265 85% 70%))",
              }
            : undefined
        }
      >
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
      </div>

      {!isMine && (
        <Check className="w-4 h-4 text-green-500 bg-green-500/10 rounded-full p-0.5" strokeWidth={3} />
      )}

      {isMine && Avatar}
    </div>
  );
});

export default MessageItem;
