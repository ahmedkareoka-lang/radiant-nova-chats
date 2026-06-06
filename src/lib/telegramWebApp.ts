/**
 * 🚀 Telegram Mini App integration
 * Detects Telegram WebView and applies native-feel optimizations:
 * - Expands viewport to full height
 * - Disables vertical swipe-to-close
 * - Syncs theme colors with NOVA dark theme
 * - Exposes viewport height as CSS var --tg-viewport-height for layouts
 * - Enables closing confirmation while inside the app
 *
 * Safe no-op outside Telegram (e.g. normal browser, PWA, Capacitor).
 */

type TelegramWebApp = {
  ready: () => void;
  expand: () => void;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  setHeaderColor: (color: string) => void;
  setBackgroundColor: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableVerticalSwipes?: () => void;
  requestFullscreen?: () => void;
  onEvent: (event: string, handler: () => void) => void;
  platform?: string;
  colorScheme?: "light" | "dark";
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

const NOVA_BG = "#0d0a1a";

export function isTelegramMiniApp(): boolean {
  return typeof window !== "undefined" && !!window.Telegram?.WebApp?.platform &&
    window.Telegram.WebApp.platform !== "unknown";
}

function applyViewportVar(tg: TelegramWebApp) {
  const h = tg.viewportStableHeight || tg.viewportHeight || window.innerHeight;
  document.documentElement.style.setProperty("--tg-viewport-height", `${h}px`);
}

export function initTelegramWebApp(): void {
  const tg = window.Telegram?.WebApp;
  if (!tg) return;

  try {
    tg.ready();
    tg.expand();
    tg.disableVerticalSwipes?.();
    tg.enableClosingConfirmation?.();
    tg.setHeaderColor?.(NOVA_BG);
    tg.setBackgroundColor?.(NOVA_BG);

    // Mark the document so CSS can target Telegram-only tweaks
    document.documentElement.setAttribute("data-tg", "1");
    if (tg.platform) document.documentElement.setAttribute("data-tg-platform", tg.platform);

    applyViewportVar(tg);
    tg.onEvent("viewportChanged", () => applyViewportVar(tg));
  } catch (e) {
    // Never break the app if Telegram SDK behaves unexpectedly
    console.warn("[Telegram] init skipped:", e);
  }
}
