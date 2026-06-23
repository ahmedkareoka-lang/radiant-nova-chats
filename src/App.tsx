import { QueryClientProvider } from "@tanstack/react-query";
import { createQueryClient } from "@/lib/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActiveRoomProvider } from "@/contexts/ActiveRoomContext";
import { AgoraVoiceProvider } from "@/contexts/AgoraVoiceProvider";
import { LanguageProvider } from "@/i18n/LanguageContext";
import FloatingRoomBubble from "@/components/FloatingRoomBubble";
import GlobalGiftTicker from "@/components/GlobalGiftTicker";
import LegendaryGiftExplosion from "@/components/LegendaryGiftExplosion";
import AgoraDebugPanel from "@/components/AgoraDebugPanel";
import PerfDebugPanel from "@/components/PerfDebugPanel";
import LevelUpEvent from "@/components/LevelUpEvent";
import { useLevelUpDetector } from "@/hooks/useLevelUpDetector";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import SplashScreen from "./pages/SplashScreen";
import LoginPage from "./pages/LoginPage";
import ResetPasswordPage from "./pages/ResetPasswordPage";
import Index from "./pages/Index";
import { useCatalogStore } from "@/stores/catalogStore";

/**
 * 🛡️ Resilient lazy import — auto-recovers from "Importing a module script failed"
 * which happens when the browser holds an old chunk hash after a redeploy/HMR.
 * We retry once, then trigger a one-time hard reload to fetch fresh chunks.
 */
const RELOAD_KEY = "nova-chunk-reload";
const lazyWithRetry = <T extends React.ComponentType<any>>(
  factory: () => Promise<{ default: T }>
) =>
  lazy(async () => {
    try {
      return await factory();
    } catch (err: any) {
      const msg = String(err?.message || err);
      const isChunkError =
        /Importing a module script failed|Failed to fetch dynamically imported module|ChunkLoadError|Loading chunk \d+ failed/i.test(msg);
      if (isChunkError && !sessionStorage.getItem(RELOAD_KEY)) {
        sessionStorage.setItem(RELOAD_KEY, "1");
        window.location.reload();
        // Return a placeholder while the page reloads
        return { default: (() => null) as unknown as T };
      }
      throw err;
    }
  });

// 🚀 Code-splitting: routes load only when visited (smaller initial bundle, faster TTI)
const NotFound = lazyWithRetry(() => import("./pages/NotFound"));
const TopUpPage = lazyWithRetry(() => import("./pages/TopUpPage"));
const CreateRoom = lazyWithRetry(() => import("./pages/CreateRoom"));
const VoiceRoom = lazyWithRetry(() => import("./pages/VoiceRoom"));
const Profile = lazyWithRetry(() => import("./pages/Profile"));
const SearchPage = lazyWithRetry(() => import("./pages/SearchPage"));
const ChatPage = lazyWithRetry(() => import("./pages/ChatPage"));
const AdminDashboard = lazyWithRetry(() => import("./pages/AdminDashboard"));
const StorePage = lazyWithRetry(() => import("./pages/StorePage"));
const WalletPage = lazyWithRetry(() => import("./pages/WalletPage"));
const InventoryPage = lazyWithRetry(() => import("./pages/InventoryPage"));
const AgenciesPage = lazyWithRetry(() => import("./pages/AgenciesPage"));
const NotificationsPage = lazyWithRetry(() => import("./pages/NotificationsPage"));
const NotificationsChatPage = lazyWithRetry(() => import("./pages/NotificationsChatPage"));
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const EditProfile = lazyWithRetry(() => import("./pages/EditProfile"));
const LeaderboardPage = lazyWithRetry(() => import("./pages/LeaderboardPage"));
const DailyTasksPage = lazyWithRetry(() => import("./pages/DailyTasksPage"));
const PostsFeedPage = lazyWithRetry(() => import("./pages/PostsFeedPage"));
const GamesPage = lazyWithRetry(() => import("./pages/GamesPage"));

const VipPrivilegePage = lazyWithRetry(() => import("./pages/VipPrivilegePage"));
const VipPreviewPage = lazyWithRetry(() => import("./pages/VipPreviewPage"));
const NovaPassPage = lazyWithRetry(() => import("./pages/NovaPassPage"));
const LuckyBoxPage = lazyWithRetry(() => import("./pages/LuckyBoxPage"));
const StreakPage = lazyWithRetry(() => import("./pages/StreakPage"));
const InvitePage = lazyWithRetry(() => import("./pages/InvitePage"));
const LoversPage = lazyWithRetry(() => import("./pages/LoversPage"));
const LoveHistoryPage = lazyWithRetry(() => import("./pages/LoveHistoryPage"));
const FramePreviewPage = lazyWithRetry(() => import("./pages/FramePreviewPage"));
const BDDashboard = lazyWithRetry(() => import("./pages/BDDashboard"));

// 🚀 Singleton QueryClient — full config lives in `@/lib/react-query`
const queryClient = createQueryClient();

// 🛠️ Devtools — lazy-loaded so they're stripped from production bundles
const ReactQueryDevtools = import.meta.env.DEV
  ? lazy(() =>
      import("@tanstack/react-query-devtools").then((m) => ({
        default: m.ReactQueryDevtools,
      })),
    )
  : null;

const RouteFallback = () => (
  <div className="min-h-screen flex flex-col items-center justify-center bg-transparent gap-3 animate-fade-in">
    <div className="relative w-14 h-14">
      <div className="absolute inset-0 rounded-full border-2 border-primary/20" />
      <div className="absolute inset-0 rounded-full border-2 border-t-primary border-r-accent border-transparent animate-spin" />
    </div>
    <span className="text-xs text-muted-foreground tracking-wider">NOVA</span>
  </div>
);

/** Save the current URL so we can redirect back after login */
const REDIRECT_KEY = "nova-redirect-after-login";

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(undefined);
  const location = useLocation();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) {
    // Save deep link destination before redirecting to login
    const fullPath = location.pathname + location.search;
    if (fullPath !== "/" && fullPath !== "/login") {
      sessionStorage.setItem(REDIRECT_KEY, fullPath);
    }
    return <Navigate to="/login" replace />;
  }
  return <>{children}</>;
};

/** Deep link handler: after login, navigate to saved destination (no full reload) */
const DeepLinkRedirector = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    setChecked(true);
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    if (saved && location.pathname === "/") {
      sessionStorage.removeItem(REDIRECT_KEY);
      // 🚀 Soft navigation — instant, no full page reload
      navigate(saved, { replace: true });
    }
  }, [location.pathname, checked, navigate]);

  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Suspense fallback={<RouteFallback />}>
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/" element={<AuthGate><DeepLinkRedirector /><Index /></AuthGate>} />
        <Route path="/create-room" element={<AuthGate><CreateRoom /></AuthGate>} />
        <Route path="/voice-room" element={<AuthGate><VoiceRoom /></AuthGate>} />
        <Route path="/profile" element={<AuthGate><Profile /></AuthGate>} />
        <Route path="/search" element={<AuthGate><SearchPage /></AuthGate>} />
        <Route path="/chat" element={<AuthGate><ChatPage /></AuthGate>} />
        <Route path="/top-up" element={<AuthGate><TopUpPage /></AuthGate>} />
        <Route path="/admin" element={<AuthGate><AdminDashboard /></AuthGate>} />
        <Route path="/store" element={<AuthGate><StorePage /></AuthGate>} />
        <Route path="/wallet" element={<AuthGate><WalletPage /></AuthGate>} />
        <Route path="/inventory" element={<AuthGate><InventoryPage /></AuthGate>} />
        <Route path="/agencies" element={<AuthGate><AgenciesPage /></AuthGate>} />
        <Route path="/notifications" element={<AuthGate><NotificationsPage /></AuthGate>} />
        <Route path="/notifications/chat" element={<AuthGate><NotificationsChatPage /></AuthGate>} />
        <Route path="/user" element={<AuthGate><UserProfile /></AuthGate>} />
        <Route path="/edit-profile" element={<AuthGate><EditProfile /></AuthGate>} />
        <Route path="/leaderboard" element={<AuthGate><LeaderboardPage /></AuthGate>} />
        <Route path="/daily-tasks" element={<AuthGate><DailyTasksPage /></AuthGate>} />
        <Route path="/posts" element={<AuthGate><PostsFeedPage /></AuthGate>} />
        <Route path="/games" element={<AuthGate><GamesPage /></AuthGate>} />
        
        <Route path="/vip" element={<AuthGate><VipPrivilegePage /></AuthGate>} />
        <Route path="/vip/preview" element={<AuthGate><VipPreviewPage /></AuthGate>} />
        <Route path="/nova-pass" element={<AuthGate><NovaPassPage /></AuthGate>} />
        <Route path="/lucky-box" element={<AuthGate><LuckyBoxPage /></AuthGate>} />
        <Route path="/streak" element={<AuthGate><StreakPage /></AuthGate>} />
        <Route path="/invite-friends" element={<AuthGate><InvitePage /></AuthGate>} />
        <Route path="/lovers" element={<AuthGate><LoversPage /></AuthGate>} />
        <Route path="/love-history" element={<AuthGate><LoveHistoryPage /></AuthGate>} />
        <Route path="/dev/frames" element={<AuthGate><FramePreviewPage /></AuthGate>} />
        <Route path="/bd" element={<AuthGate><BDDashboard /></AuthGate>} />
        {/* Deep link routes */}
        <Route path="/room" element={<AuthGate><RoomRedirect /></AuthGate>} />
        <Route path="/invite" element={<AuthGate><InviteRedirect /></AuthGate>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
      </Suspense>
    </AnimatePresence>
  );
};

/** /room?id=XYZ → redirect to /voice-room?id=XYZ */
const RoomRedirect = () => {
  const [params] = useSearchParams();
  const id = params.get("id");
  if (id) return <Navigate to={`/voice-room?id=${id}`} replace />;
  return <Navigate to="/" replace />;
};

/** /invite?id=XYZ → redirect to /agencies with invite param */
const InviteRedirect = () => {
  const [params] = useSearchParams();
  const id = params.get("id");
  if (id) return <Navigate to={`/agencies?invite=${id}`} replace />;
  return <Navigate to="/" replace />;
};

const LevelUpRoot = () => {
  const { event, clear } = useLevelUpDetector();
  return (
    <LevelUpEvent
      show={!!event}
      type={event?.type || "wealth"}
      newLevel={event?.newLevel || 1}
      onClose={clear}
    />
  );
};

/**
 * 🚀 Pre-fetch & cache catalog data once at app start.
 * Gifts/store items are loaded into Zustand (persisted to localStorage),
 * so opening the gift sheet later is instant — no spinners, no waiting.
 * Realtime channels keep the cache fresh in the background.
 */
const CatalogPrefetcher = () => {
  useEffect(() => {
    let unsub: (() => void) | undefined;
    const run = () => {
      const { fetchGifts, fetchStoreItems, subscribeRealtime } = useCatalogStore.getState();
      fetchGifts();
      fetchStoreItems();
      unsub = subscribeRealtime();
    };
    // 🚀 Defer to idle — never compete with first paint / route transition
    let idleId: any;
    if ("requestIdleCallback" in window) {
      idleId = (window as any).requestIdleCallback(run, { timeout: 2000 });
    } else {
      idleId = setTimeout(run, 300);
    }
    return () => {
      if (typeof unsub === "function") unsub();
      if ("cancelIdleCallback" in window) (window as any).cancelIdleCallback?.(idleId);
      else clearTimeout(idleId);
    };
  }, []);
  return null;
};

/** 🚀 Defer Vercel telemetry to idle so it doesn't block FCP/TTI */
const DeferredTelemetry = () => {
  const [show, setShow] = useState(false);
  useEffect(() => {
    const cb = () => setShow(true);
    let id: any;
    if ("requestIdleCallback" in window) {
      id = (window as any).requestIdleCallback(cb, { timeout: 5000 });
    } else {
      id = setTimeout(cb, 3000);
    }
    return () => {
      if ("cancelIdleCallback" in window) (window as any).cancelIdleCallback?.(id);
      else clearTimeout(id);
    };
  }, []);
  if (!show) return null;
  return (
    <>
      <SpeedInsights />
      <Analytics />
    </>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <DeferredTelemetry />
          {showSplash ? (
            <SplashScreen onFinish={handleSplashFinish} />
          ) : (
            <BrowserRouter>
              <ActiveRoomProvider>
                <CatalogPrefetcher />
                <AnimatedRoutes />
                <FloatingRoomBubble />
                <GlobalGiftTicker />
                <LegendaryGiftExplosion />
                <LevelUpRoot />
                <AgoraDebugPanel />
                <PerfDebugPanel />
              </ActiveRoomProvider>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </LanguageProvider>
      {ReactQueryDevtools && (
        <Suspense fallback={null}>
          <ReactQueryDevtools initialIsOpen={false} buttonPosition="bottom-right" />
        </Suspense>
      )}
    </QueryClientProvider>
  );
};

export default App;
