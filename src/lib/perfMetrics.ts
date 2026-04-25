/**
 * 🚀 Performance Metrics Collector
 *
 * Aggregates Web Vitals (CLS/LCP/INP/FID/FCP/TTFB), realtime broadcast
 * latencies (mic, gift, chat), batch sizes, and gift-rate samples for the
 * Performance Debug Panel. Everything is in-memory and lightweight.
 */

export type WebVitalName = "LCP" | "FCP" | "CLS" | "INP" | "FID" | "TTFB";

export interface WebVitalSample {
  name: WebVitalName;
  value: number;
  rating?: "good" | "needs-improvement" | "poor";
  ts: number;
}

export interface LatencySample {
  channel: "mic" | "gift" | "chat" | "presence";
  ms: number;
  ts: number;
}

export interface BatchSample {
  size: number;
  coalesceMs: number;
  ts: number;
}

const MAX_SAMPLES = 200;
const vitals: Map<WebVitalName, WebVitalSample> = new Map();
const latencies: LatencySample[] = [];
const batches: BatchSample[] = [];
let giftEventsLastSec: number[] = []; // timestamps

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((l) => l());

export function recordVital(name: WebVitalName, value: number, rating?: WebVitalSample["rating"]) {
  vitals.set(name, { name, value, rating, ts: Date.now() });
  notify();
}

export function recordLatency(channel: LatencySample["channel"], ms: number) {
  latencies.push({ channel, ms, ts: Date.now() });
  if (latencies.length > MAX_SAMPLES) latencies.splice(0, latencies.length - MAX_SAMPLES);
  notify();
}

export function recordRealtimeBatch(sample: { size: number; coalesceMs: number }) {
  batches.push({ ...sample, ts: Date.now() });
  if (batches.length > MAX_SAMPLES) batches.splice(0, batches.length - MAX_SAMPLES);
  notify();
}

export function recordGiftEvent() {
  const now = Date.now();
  giftEventsLastSec.push(now);
  // Trim older than 1s
  giftEventsLastSec = giftEventsLastSec.filter((t) => now - t < 1000);
  notify();
}

export function getGiftRate(): number {
  const now = Date.now();
  giftEventsLastSec = giftEventsLastSec.filter((t) => now - t < 1000);
  return giftEventsLastSec.length;
}

export interface PerfSnapshot {
  vitals: WebVitalSample[];
  latencies: LatencySample[];
  batches: BatchSample[];
  giftRate: number;
  collectedAt: number;
}

export function getSnapshot(): PerfSnapshot {
  return {
    vitals: Array.from(vitals.values()),
    latencies: latencies.slice(-50),
    batches: batches.slice(-50),
    giftRate: getGiftRate(),
    collectedAt: Date.now(),
  };
}

export function subscribePerf(cb: () => void): () => void {
  listeners.add(cb);
  return () => { listeners.delete(cb); };
}

/** Compute p50/p95/avg for a set of latencies filtered by channel */
export function aggregate(samples: LatencySample[], channel?: LatencySample["channel"]) {
  const list = channel ? samples.filter((s) => s.channel === channel) : samples;
  if (list.length === 0) return { count: 0, avg: 0, p50: 0, p95: 0, max: 0 };
  const sorted = list.map((s) => s.ms).sort((a, b) => a - b);
  const sum = sorted.reduce((a, b) => a + b, 0);
  const idx = (p: number) => sorted[Math.min(sorted.length - 1, Math.floor((sorted.length - 1) * p))];
  return {
    count: sorted.length,
    avg: Math.round(sum / sorted.length),
    p50: Math.round(idx(0.5)),
    p95: Math.round(idx(0.95)),
    max: sorted[sorted.length - 1],
  };
}

/** Initialize Web Vitals collection (call once at app boot, deferred). */
export async function initWebVitals() {
  try {
    // Use the standard `web-vitals` package shipped with most modern bundlers.
    // Fallback gracefully if it's not available.
    const wv: any = await import(/* @vite-ignore */ "web-vitals").catch(() => null);
    if (!wv) return;
    const send = (m: any) => recordVital(m.name as WebVitalName, m.value, m.rating);
    wv.onLCP?.(send);
    wv.onFCP?.(send);
    wv.onCLS?.(send);
    wv.onINP?.(send);
    wv.onFID?.(send);
    wv.onTTFB?.(send);
  } catch {
    /* silent — vitals are an enhancement */
  }
}
