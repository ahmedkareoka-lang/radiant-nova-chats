/**
 * 🚀 Telegram Mini App integration
 * Detects Telegram WebView and applies native-feel optimizations:
 * - Expands viewport to full height
 * - Disables vertical swipe-to-close
 * - Syncs theme colors with NOVA dark theme
 * - Exposes viewport height as CSS var --tg-viewport-height for layouts
 * - Enables closing confirmation while inside the app
 * - Extracts user identity (id, first_name, username) from initDataUnsafe
 *
 * Safe no-op outside Telegram (e.g. normal browser, PWA, Capacitor).
 */

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  photo_url?: string;
}

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
  initData?: string;
  initDataUnsafe?: {
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
    start_param?: string;
  };
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

/**
 * Returns the current Telegram user (id, first_name, username, …) if the app
 * is running inside Telegram. Returns null in a regular browser.
 */
export function getTelegramUser(): TelegramUser | null {
  const u = window.Telegram?.WebApp?.initDataUnsafe?.user;
  if (!u || typeof u.id !== "number") return null;
  return u;
}

/**
 * Returns the raw initData string. Send this to your backend to verify
 * authenticity using your bot token (HMAC check) before trusting user.id.
 */
export function getTelegramInitData(): string | null {
  return window.Telegram?.WebApp?.initData || null;
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

    // Cache the Telegram user globally so any component can read it
    // synchronously without re-parsing initDataUnsafe.
    const user = tg.initDataUnsafe?.user;
    if (user?.id) {
      (window as any).__TG_USER__ = user;
      document.documentElement.setAttribute("data-tg-user-id", String(user.id));
    }

    applyViewportVar(tg);
    tg.onEvent("viewportChanged", () => applyViewportVar(tg));
  } catch (e) {
    // Never break the app if Telegram SDK behaves unexpectedly
    console.warn("[Telegram] init skipped:", e);
  }
}
