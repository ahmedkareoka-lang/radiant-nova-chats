import { memo, useEffect, useRef } from "react";
import { MessageItem, type ChatMessage } from "./MessageItem";

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null;
  isLoading?: boolean;
  onScrollTop?: () => void;
}

export const VirtualizedMessageList = memo(function VirtualizedMessageList({
  messages,
  currentUserId,
  isLoading,
  onScrollTop,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = parentRef.current;
    if (!el || messages.length === 0) return;
    el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [messages.length]);

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        لا توجد رسائل بعد. ابدأ المحادثة! 💬
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      onScroll={(e) => {
        if (e.currentTarget.scrollTop < 80) onScrollTop?.();
      }}
      className="flex-1 overflow-auto px-3 py-4 max-w-lg mx-auto w-full space-y-2.5"
    >
      {messages.map((message) => (
        <MessageItem
          key={message.id}
          message={message}
          isMine={message.sender_id === currentUserId}
        />
      ))}
    </div>
  );
});

export default VirtualizedMessageList;