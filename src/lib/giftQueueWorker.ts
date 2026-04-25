/**
 * 🎁 Gift Queue Worker Client
 *
 * Thin wrapper around the gift-queue Web Worker. Falls back to a synchronous
 * in-thread implementation if Web Workers are unavailable (e.g. very old
 * browsers, SSR).
 */

export interface RawGift {
  sender_id: string;
  gift_id: string;
  gift_name?: string;
  tier?: string;
  gold?: number;
  created_at?: number;
}

export interface ProcessedGift extends RawGift {
  combo: number;
  total_gold: number;
  last_at: number;
}

let workerInstance: Worker | null = null;
let nextId = 0;
const pending = new Map<number, (q: ProcessedGift[]) => void>();

function getWorker(): Worker | null {
  if (workerInstance) return workerInstance;
  if (typeof window === "undefined" || typeof Worker === "undefined") return null;
  try {
    workerInstance = new Worker("/workers/giftQueue.worker.js");
    workerInstance.onmessage = (e) => {
      const { type, queue, _id } = e.data || {};
      if (type === "processed" && _id != null) {
        const cb = pending.get(_id);
        if (cb) {
          pending.delete(_id);
          cb(queue);
        }
      }
    };
    return workerInstance;
  } catch {
    return null;
  }
}

export function processGiftQueue(gifts: RawGift[]): Promise<ProcessedGift[]> {
  const w = getWorker();
  if (!w) {
    // Synchronous fallback (very small payloads only)
    return Promise.resolve(syncProcess(gifts));
  }
  return new Promise((resolve) => {
    const id = ++nextId;
    pending.set(id, resolve);
    // Listen for matching id
    const handler = (e: MessageEvent) => {
      if (e.data?._id === id) {
        w.removeEventListener("message", handler);
      }
    };
    w.addEventListener("message", handler);
    w.postMessage({ type: "process", gifts, now: Date.now(), _id: id });
  });
}

function syncProcess(gifts: RawGift[]): ProcessedGift[] {
  const now = Date.now();
  const map = new Map<string, ProcessedGift>();
  for (const g of gifts) {
    const key = `${g.sender_id}:${g.gift_id}`;
    const ex = map.get(key);
    if (ex && now - ex.last_at < 3000) {
      ex.combo += 1;
      ex.total_gold += g.gold || 0;
      ex.last_at = g.created_at || now;
    } else {
      map.set(key, { ...g, combo: 1, total_gold: g.gold || 0, last_at: g.created_at || now });
    }
  }
  return Array.from(map.values());
}
