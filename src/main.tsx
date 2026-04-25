import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { Capacitor } from "@capacitor/core";
import { registerServiceWorker } from "./lib/registerServiceWorker";
import { ErrorBoundary } from "./components/ErrorBoundary";

// 🌐 Respect user's data-saving preferences before doing any preloading work
const shouldPreload = () => {
  const conn = (navigator as any).connection;
  if (!conn) return true;
  if (conn.saveData) return false;
  if (conn.effectiveType === "2g" || conn.effectiveType === "slow-2g") return false;
  return true;
};
// Exposed for future preload helpers (images, routes, etc.)
(window as any).__shouldPreload = shouldPreload;

// 🛡️ Global recovery for stale chunk imports after redeploys.
// When a dynamic import fails (old hash no longer on CDN), reload once.
const CHUNK_RELOAD_KEY = "nova-chunk-reload";
const isChunkLoadError = (msg: string) =>
  /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);

window.addEventListener("error", (e) => {
  if (isChunkLoadError(String(e?.message || "")) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});
window.addEventListener("unhandledrejection", (e) => {
  const msg = String((e?.reason as any)?.message || e?.reason || "");
  if (isChunkLoadError(msg) && !sessionStorage.getItem(CHUNK_RELOAD_KEY)) {
    sessionStorage.setItem(CHUNK_RELOAD_KEY, "1");
    window.location.reload();
  }
});
// Clear the reload guard once the app boots successfully.
window.addEventListener("load", () => {
  setTimeout(() => sessionStorage.removeItem(CHUNK_RELOAD_KEY), 4000);
});

// Capacitor native status bar
if (Capacitor.isNativePlatform()) {
  import("@capacitor/status-bar").then(({ StatusBar, Style }) => {
    StatusBar.setStyle({ style: Style.Dark });
    StatusBar.setBackgroundColor({ color: "#0d0a1a" });
  });
  import("@capacitor/keyboard").then(({ Keyboard }) => {
    Keyboard.setAccessoryBarVisible({ isVisible: false });
  });
}

createRoot(document.getElementById("root")!).render(
  <ErrorBoundary>
    <App />
  </ErrorBoundary>,
);

// 🚀 Activate Edge asset caching after app boot (web only — Capacitor uses native cache)
if (!Capacitor.isNativePlatform()) {
  registerServiceWorker();
}
