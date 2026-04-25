import { memo, useEffect, useRef } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";
import { MessageItem, type ChatMessage } from "./MessageItem";

interface Props {
  messages: ChatMessage[];
  currentUserId: string | null;
  isLoading?: boolean;
  onScrollTop?: () => void; // load older messages when reaching top
}

/**
 * 🚀 VirtualizedMessageList — renders only visible messages using
 * @tanstack/react-virtual. Smooth even with thousands of messages.
 */
export const VirtualizedMessageList = memo(function VirtualizedMessageList({
  messages,
  currentUserId,
  isLoading,
  onScrollTop,
}: Props) {
  const parentRef = useRef<HTMLDivElement>(null);
  const lastCountRef = useRef(0);

  const rowVirtualizer = useVirtualizer({
    count: messages.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 72,
    overscan: 8,
    getItemKey: (index) => messages[index]?.id ?? index,
  });

  // 🔽 Auto-scroll to bottom when a new message arrives
  useEffect(() => {
    if (messages.length === 0) return;
    if (messages.length > lastCountRef.current) {
      const id = requestAnimationFrame(() => {
        rowVirtualizer.scrollToIndex(messages.length - 1, { align: "end" });
      });
      lastCountRef.current = messages.length;
      return () => cancelAnimationFrame(id);
    }
    lastCountRef.current = messages.length;
  }, [messages.length, rowVirtualizer]);

  if (!isLoading && messages.length === 0) {
    return (
      <div className="flex-1 flex items-center justify-center text-sm text-muted-foreground">
        لا توجد رسائل بعد. ابدأ المحادثة! 💬
      </div>
    );
  }

  const virtualItems = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();

  return (
    <div
      ref={parentRef}
      onScroll={(e) => {
        const t = e.currentTarget;
        if (t.scrollTop < 80) onScrollTop?.();
      }}
      className="flex-1 overflow-auto px-4 py-4 max-w-lg mx-auto w-full"
    >
      <div
        style={{ height: `${totalSize}px`, width: "100%", position: "relative" }}
      >
        {virtualItems.map((virtualRow) => {
          const message = messages[virtualRow.index];
          if (!message) return null;
          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={rowVirtualizer.measureElement}
              style={{
                position: "absolute",
                top: 0,
                left: 0,
                width: "100%",
                transform: `translateY(${virtualRow.start}px)`,
              }}
            >
              <MessageItem
                message={message}
                isMine={message.sender_id === currentUserId}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

export default VirtualizedMessageList;
