/**
 * 🚀 Realtime Batcher — coalesce many small broadcast events into a single
 * payload sent every 100–150ms. Reduces channel chatter dramatically when
 * users spam mic toggles, send gift bursts, or chat rapidly.
 *
 * Usage:
 *   const batcher = createRealtimeBatcher(channel, { intervalMs: 120 });
 *   batcher.queue("mic-update", { user_id, is_on_mic, mic_slot });
 *   batcher.queue("gift", giftPayload);
 *   batcher.flushNow(); // optional manual flush
 *   batcher.dispose();
 *
 * Receiver side: subscribe to event "batch" → payload.events: Array<{event, payload}>
 *
 * Also records send-side latency stats for the perf panel.
 */
import { recordRealtimeBatch } from "./perfMetrics";

type Channel = {
  send: (msg: any, ...rest: any[]) => any;
};

interface BatcherOptions {
  intervalMs?: number; // 100–150ms recommended
  maxBatchSize?: number; // hard cap to avoid huge payloads
}

interface QueuedEvent {
  event: string;
  payload: any;
  enqueuedAt: number;
}

export interface RealtimeBatcher {
  queue: (event: string, payload: any) => void;
  flushNow: () => void;
  dispose: () => void;
}

export function createRealtimeBatcher(
  channel: Channel | null,
  opts: BatcherOptions = {}
): RealtimeBatcher {
  const intervalMs = opts.intervalMs ?? 120;
  const maxBatchSize = opts.maxBatchSize ?? 40;

  let queue: QueuedEvent[] = [];
  let timer: any = null;
  let disposed = false;

  const schedule = () => {
    if (timer || disposed) return;
    timer = setTimeout(flush, intervalMs);
  };

  const flush = () => {
    timer = null;
    if (!channel || queue.length === 0 || disposed) return;
    const batch = queue.splice(0, maxBatchSize);
    const sentAt = Date.now();
    const oldest = batch[0]?.enqueuedAt ?? sentAt;
    try {
      channel.send({
        type: "broadcast",
        event: "batch",
        payload: { events: batch.map((e) => ({ event: e.event, payload: e.payload })), sentAt },
      });
      recordRealtimeBatch({
        size: batch.length,
        coalesceMs: sentAt - oldest,
      });
    } catch {
      // Re-queue on failure (best-effort) — don't block UI
      queue.unshift(...batch);
    }
    if (queue.length > 0) schedule();
  };

  return {
    queue(event, payload) {
      if (disposed) return;
      queue.push({ event, payload, enqueuedAt: Date.now() });
      // Flush immediately when batch is full to avoid huge payloads
      if (queue.length >= maxBatchSize) {
        if (timer) {
          clearTimeout(timer);
          timer = null;
        }
        flush();
      } else {
        schedule();
      }
    },
    flushNow() {
      if (timer) {
        clearTimeout(timer);
        timer = null;
      }
      flush();
    },
    dispose() {
      disposed = true;
      if (timer) clearTimeout(timer);
      timer = null;
      queue = [];
    },
  };
}
