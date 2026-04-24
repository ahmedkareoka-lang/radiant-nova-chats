// Lightweight in-memory log bus for Agora debug events.
// Subscribe from any component to render them in a debug panel.

export type AgoraLogLevel = "info" | "warn" | "error" | "success";

export interface AgoraLogEntry {
  id: number;
  ts: number;
  level: AgoraLogLevel;
  tag: string;
  message: string;
  data?: any;
}

const MAX_ENTRIES = 200;
let counter = 0;
let entries: AgoraLogEntry[] = [];
const listeners = new Set<(entries: AgoraLogEntry[]) => void>();

function emit() {
  for (const l of listeners) l(entries);
}

export function logAgora(level: AgoraLogLevel, tag: string, message: string, data?: any) {
  const entry: AgoraLogEntry = {
    id: ++counter,
    ts: Date.now(),
    level,
    tag,
    message: typeof message === "string" ? message : String(message),
    data,
  };
  entries = [entry, ...entries].slice(0, MAX_ENTRIES);
  emit();
  // Also mirror to native console for remote logs
  const prefix = `[Agora:${tag}]`;
  if (level === "error") console.error(prefix, message, data ?? "");
  else if (level === "warn") console.warn(prefix, message, data ?? "");
  else console.log(prefix, message, data ?? "");
}

export function subscribeAgoraLogs(cb: (entries: AgoraLogEntry[]) => void): () => void {
  listeners.add(cb);
  cb(entries);
  return () => { listeners.delete(cb); };
}

export function clearAgoraLogs() {
  entries = [];
  emit();
}

export function getAgoraLogsSnapshot(): AgoraLogEntry[] {
  return entries.slice();
}
