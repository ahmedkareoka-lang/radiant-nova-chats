import { memo } from "react";
import { useNavigate } from "react-router-dom";
import { CheckCheck } from "lucide-react";
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

export const MessageItem = memo(function MessageItem({ message, isMine }: Props) {
  const navigate = useNavigate();
  const goProfile = () => {
    if (message.sender_id) navigate(`/user?id=${message.sender_id}`);
  };

  const Avatar = (
    <button
      onClick={goProfile}
      className="relative shrink-0 w-11 h-11 rounded-full overflow-hidden ring-2 ring-border/60 bg-secondary shadow-md"
      aria-label="عرض الملف الشخصي"
    >
      <AvatarImg src={message.sender?.avatar_url} alt={message.sender?.display_name || ""} />
    </button>
  );

  return (
    <div className={`flex items-end gap-2.5 ${isMine ? "justify-end" : "justify-start"} px-1 py-1.5`} dir="ltr">
      {!isMine && Avatar}

      <div
        className={`relative max-w-[72%] min-w-12 px-3.5 py-2.5 text-[14px] leading-6 break-words shadow-lg ${
          isMine
            ? "gradient-neon text-primary-foreground rounded-[18px] rounded-br-md"
            : "bg-secondary/90 text-foreground rounded-[18px] rounded-bl-md border border-border/40"
        }`}
      >
        <span
          className={`absolute bottom-1.5 h-3.5 w-3.5 rotate-45 ${
            isMine
              ? "-right-1.5 gradient-neon rounded-br-sm"
              : "-left-1.5 bg-secondary border-l border-b border-border/40 rounded-bl-sm"
          }`}
          aria-hidden="true"
        />
        <p className={`relative z-10 whitespace-pre-wrap break-words ${isMine ? "text-right" : "text-left"}`} dir="auto">
          {message.content}
        </p>
        <div className={`relative z-10 mt-0.5 flex items-center ${isMine ? "justify-start" : "justify-end"}`}>
          <CheckCheck className="h-3.5 w-3.5 text-accent" strokeWidth={2.6} />
        </div>
      </div>

      {isMine && Avatar}
    </div>
  );
});

export default MessageItem;
