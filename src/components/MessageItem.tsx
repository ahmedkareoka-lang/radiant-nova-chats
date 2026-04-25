import { memo } from "react";

export interface ChatMessage {
  id: string;
  sender_id: string;
  content: string;
  created_at: string;
  sender?: {
    id?: string;
    display_name?: string;
    avatar_url?: string | null;
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
          <p className="text-[10px] font-bold text-primary mb-0.5">
            {message.sender.display_name}
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
