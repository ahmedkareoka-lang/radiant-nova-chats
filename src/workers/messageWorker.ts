// 🎯 Message Worker — offloads heavy text work off the main thread.
// Loaded via <new Worker(new URL("./messageWorker.ts", import.meta.url), { type: "module" })>
// Tasks: format markdown, filter, fuzzy search.

type MessageTask = {
  id: string;
  type: "format" | "filter" | "search";
  data: any;
};

// HTML escape to prevent XSS when injecting formatted output
const escapeHtml = (s: string): string =>
  s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const formatMessageContent = (content: string): string => {
  // Escape first, then apply safe markdown subset
  const safe = escapeHtml(content);
  return safe
    .replace(/```([\s\S]*?)```/g, "<pre><code>$1</code></pre>")
    .replace(/`([^`]+)`/g, "<code>$1</code>")
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/\*([^*]+)\*/g, "<em>$1</em>")
    .replace(/\n/g, "<br/>");
};

const filterMessages = (messages: any[], keyword: string): any[] => {
  const k = keyword.toLowerCase();
  return messages.filter((msg) =>
    (msg.content || "").toLowerCase().includes(k),
  );
};

const fuzzySearch = (messages: any[], query: string): any[] => {
  const q = query.toLowerCase();
  return messages.filter((msg) => {
    const content = (msg.content || "").toLowerCase();
    const name = (msg.sender?.display_name || "").toLowerCase();
    return content.includes(q) || name.includes(q);
  });
};

self.onmessage = (e: MessageEvent<MessageTask>) => {
  const { id, type, data } = e.data;
  try {
    let result: any;
    switch (type) {
      case "format":
        result = formatMessageContent(data.content);
        break;
      case "filter":
        result = filterMessages(data.messages, data.keyword);
        break;
      case "search":
        result = fuzzySearch(data.messages, data.query);
        break;
      default:
        throw new Error(`Unknown task type: ${type}`);
    }
    (self as any).postMessage({ id, success: true, result });
  } catch (error: any) {
    (self as any).postMessage({
      id,
      success: false,
      error: error?.message || "Processing failed",
    });
  }
};

export {};
