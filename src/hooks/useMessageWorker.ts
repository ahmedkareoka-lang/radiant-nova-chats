import { useEffect, useRef, useCallback } from "react";

type WorkerTaskType = "format" | "filter" | "search";

type WorkerResponse<T = any> = {
  id: string;
  success: boolean;
  result?: T;
  error?: string;
};

type PendingTask = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
  timeout: ReturnType<typeof setTimeout>;
};

/**
 * 🎯 useMessageWorker — runs message-heavy work in a Web Worker.
 *
 * Tasks:
 * - format(content)            → safe HTML markdown
 * - filter(messages, keyword)  → simple keyword filter
 * - search(messages, query)    → fuzzy search across content + sender name
 *
 * Each task auto-times-out (default 10s) to prevent hung promises.
 */
export function useMessageWorker(defaultTimeoutMs = 10_000) {
  const workerRef = useRef<Worker | null>(null);
  const pendingRef = useRef<Map<string, PendingTask>>(new Map());

  useEffect(() => {
    let worker: Worker | null = null;
    try {
      worker = new Worker(
        new URL("../workers/messageWorker.ts", import.meta.url),
        { type: "module" },
      );
      workerRef.current = worker;

      worker.onmessage = (e: MessageEvent<WorkerResponse>) => {
        const { id, success, result, error } = e.data;
        const pending = pendingRef.current.get(id);
        if (!pending) return;
        clearTimeout(pending.timeout);
        pendingRef.current.delete(id);
        if (success) pending.resolve(result);
        else pending.reject(new Error(error || "Worker error"));
      };

      worker.onerror = (err) => {
        console.error("❌ messageWorker error:", err);
        pendingRef.current.forEach((p) => {
          clearTimeout(p.timeout);
          p.reject(err);
        });
        pendingRef.current.clear();
      };
    } catch (err) {
      console.warn("⚠️ Web Worker unsupported, falling back to main thread.", err);
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
      pendingRef.current.forEach((p) => clearTimeout(p.timeout));
      pendingRef.current.clear();
    };
  }, []);

  const postTask = useCallback(
    <T = any>(
      type: WorkerTaskType,
      data: any,
      timeoutMs = defaultTimeoutMs,
    ): Promise<T> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("Worker not initialized"));
          return;
        }
        const id = `${type}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

        const timeout = setTimeout(() => {
          pendingRef.current.delete(id);
          reject(new Error(`Task ${id} timed out after ${timeoutMs}ms`));
        }, timeoutMs);

        pendingRef.current.set(id, { resolve, reject, timeout });
        worker.postMessage({ id, type, data });
      });
    },
    [defaultTimeoutMs],
  );

  return {
    ready: !!workerRef.current,
    run: postTask,
    formatMessage: (content: string) =>
      postTask<string>("format", { content }),
    filterMessages: (messages: any[], keyword: string) =>
      postTask<any[]>("filter", { messages, keyword }),
    searchMessages: (messages: any[], query: string) =>
      postTask<any[]>("search", { messages, query }),
  };
}
