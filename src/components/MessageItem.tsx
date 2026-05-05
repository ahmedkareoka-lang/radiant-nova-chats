import { memo } from "react";
import VipName from "@/components/VipName";

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
 * 💬 MessageItem — single chat bubble. Memoized so virtualized lists
 * don't re-render every visible row when the parent updates.
 */
export const MessageItem = memo(function MessageItem({ message, isMine }: Props) {
  return (
    <div className={`flex ${isMine ? "justify-end" : "justify-start"} px-1 py-1`}>
      <div
        className={`max-w-[75%] rounded-2xl px-3 py-2 text-sm ${
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
    </div>
  );
});

export default MessageItem;
