/**
 * 🚀 Service Worker Registration
 *
 * Registers /sw.js for asset CDN caching. Safe in dev (silently no-ops if
 * the SW file is unreachable). Skips registration in non-secure contexts.
 */
export function registerServiceWorker() {
  if (typeof window === "undefined") return;
  if (!("serviceWorker" in navigator)) return;
  // Only register in production-like contexts (served over https or localhost)
  const isLocal = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  if (!isLocal && window.location.protocol !== "https:") return;

  // Defer until idle so it never competes with first paint
  const register = () => {
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => {
        /* silent — SW is a progressive enhancement */
      });
  };

  if ("requestIdleCallback" in window) {
    (window as any).requestIdleCallback(register, { timeout: 4000 });
  } else {
    setTimeout(register, 2000);
  }
}
