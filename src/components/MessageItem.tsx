import { memo } from "react";
import { useNavigate } from "react-router-dom";
import VipName from "@/components/VipName";
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
 * 💬 MessageItem — single chat bubble with sender avatar (tap → profile).
 */
export const MessageItem = memo(function MessageItem({ message, isMine }: Props) {
  const navigate = useNavigate();
  const goProfile = () => {
    if (message.sender_id) navigate(`/user?id=${message.sender_id}`);
  };

  const Avatar = (
    <button
      onClick={goProfile}
      className="shrink-0 w-8 h-8 rounded-full overflow-hidden ring-1 ring-border/40"
      aria-label="عرض الملف الشخصي"
    >
      <AvatarImg src={message.sender?.avatar_url} alt={message.sender?.display_name || ""} />
    </button>
  );

  return (
    <div className={`flex items-end gap-2 ${isMine ? "justify-end" : "justify-start"} px-1 py-1`}>
      {!isMine && Avatar}
      <div
        className={`max-w-[70%] rounded-2xl px-3 py-2 text-sm ${
          isMine
            ? "gradient-neon text-primary-foreground rounded-br-sm"
            : "bg-secondary text-foreground rounded-bl-sm"
        }`}
      >
        {!isMine && message.sender?.display_name && (
          <p className="text-[10px] mb-0.5">
            <VipName
              name={message.sender.display_name}
              level={message.sender.vip_level}
              size="sm"
              className="text-primary"
            />
          </p>
        )}
        <p className="whitespace-pre-wrap break-words">{message.content}</p>
        <p className="text-[8px] opacity-60 mt-1 text-right">
          {new Date(message.created_at).toLocaleTimeString("ar", {
            hour: "2-digit",
            minute: "2-digit",
          })}
        </p>
      </div>
      {isMine && Avatar}
    </div>
  );
});

export default MessageItem;
