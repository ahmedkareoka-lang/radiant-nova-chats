import { useEffect, useRef, useCallback } from "react";

type WorkerTaskType = "format" | "filter" | "search";

type PendingTask = {
  resolve: (value: any) => void;
  reject: (reason?: any) => void;
};

/**
 * 🎯 useMessageWorker — runs message-heavy work in a Web Worker.
 *
 * Usage:
 *   const { run, ready } = useMessageWorker();
 *   const html = await run("format", { content: "**hi**" });
 */
export function useMessageWorker() {
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

      worker.onmessage = (
        e: MessageEvent<{ id: string; success: boolean; result?: any; error?: string }>,
      ) => {
        const { id, success, result, error } = e.data;
        const pending = pendingRef.current.get(id);
        if (!pending) return;
        pendingRef.current.delete(id);
        if (success) pending.resolve(result);
        else pending.reject(new Error(error || "Worker error"));
      };

      worker.onerror = (err) => {
        console.error("❌ messageWorker error:", err);
        pendingRef.current.forEach((p) => p.reject(err));
        pendingRef.current.clear();
      };
    } catch (err) {
      console.warn("⚠️ Web Worker unsupported, falling back to main thread.", err);
    }

    return () => {
      worker?.terminate();
      workerRef.current = null;
      pendingRef.current.clear();
    };
  }, []);

  const run = useCallback(
    <T = any>(type: WorkerTaskType, data: any): Promise<T> => {
      return new Promise((resolve, reject) => {
        const worker = workerRef.current;
        if (!worker) {
          reject(new Error("Worker not initialized"));
          return;
        }
        const id = `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
        pendingRef.current.set(id, { resolve, reject });
        worker.postMessage({ id, type, data });
      });
    },
    [],
  );

  return { run, ready: !!workerRef.current };
}
