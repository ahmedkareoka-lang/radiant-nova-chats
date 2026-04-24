import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate, useSearchParams, useNavigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, useCallback, lazy, Suspense } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActiveRoomProvider } from "@/contexts/ActiveRoomContext";
import { LanguageProvider } from "@/i18n/LanguageContext";
import FloatingRoomBubble from "@/components/FloatingRoomBubble";
import GlobalGiftTicker from "@/components/GlobalGiftTicker";
import LegendaryGiftExplosion from "@/components/LegendaryGiftExplosion";
import AgoraDebugPanel from "@/components/AgoraDebugPanel";
import LevelUpEvent from "@/components/LevelUpEvent";
import { useLevelUpDetector } from "@/hooks/useLevelUpDetector";
import { SpeedInsights } from "@vercel/speed-insights/react";
import { Analytics } from "@vercel/analytics/react";
import SplashScreen from "./pages/SplashScreen";
import LoginPage from "./pages/LoginPage";
import Index from "./pages/Index";

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
const UserProfile = lazyWithRetry(() => import("./pages/UserProfile"));
const EditProfile = lazyWithRetry(() => import("./pages/EditProfile"));
const LeaderboardPage = lazyWithRetry(() => import("./pages/LeaderboardPage"));
const DailyTasksPage = lazyWithRetry(() => import("./pages/DailyTasksPage"));
const PostsFeedPage = lazyWithRetry(() => import("./pages/PostsFeedPage"));
const GamesPage = lazyWithRetry(() => import("./pages/GamesPage"));
const NovaPPage = lazyWithRetry(() => import("./pages/NovaPPage"));
const VipPrivilegePage = lazyWithRetry(() => import("./pages/VipPrivilegePage"));
const NovaPassPage = lazyWithRetry(() => import("./pages/NovaPassPage"));
const LuckyBoxPage = lazyWithRetry(() => import("./pages/LuckyBoxPage"));
const StreakPage = lazyWithRetry(() => import("./pages/StreakPage"));
const InvitePage = lazyWithRetry(() => import("./pages/InvitePage"));
const LoversPage = lazyWithRetry(() => import("./pages/LoversPage"));
const LoveHistoryPage = lazyWithRetry(() => import("./pages/LoveHistoryPage"));
const FramePreviewPage = lazyWithRetry(() => import("./pages/FramePreviewPage"));

// 🚀 World-class cache: aggressive freshness, no wasteful refetches
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,        // 2 min fresh — fewer round trips
      gcTime: 10 * 60_000,          // keep 10 min in memory for instant back-nav
      refetchOnWindowFocus: false,
      refetchOnReconnect: "always", // re-sync once after reconnect (lightweight)
      refetchOnMount: false,        // trust the cache; manual invalidate when needed
      retry: 1,
      retryDelay: (i) => Math.min(1000 * 2 ** i, 8000),
      networkMode: "online",
    },
    mutations: {
      retry: 0,
      networkMode: "online",
    },
  },
});

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
        <Route path="/user" element={<AuthGate><UserProfile /></AuthGate>} />
        <Route path="/edit-profile" element={<AuthGate><EditProfile /></AuthGate>} />
        <Route path="/leaderboard" element={<AuthGate><LeaderboardPage /></AuthGate>} />
        <Route path="/daily-tasks" element={<AuthGate><DailyTasksPage /></AuthGate>} />
        <Route path="/posts" element={<AuthGate><PostsFeedPage /></AuthGate>} />
        <Route path="/games" element={<AuthGate><GamesPage /></AuthGate>} />
        <Route path="/nova-p" element={<AuthGate><NovaPPage /></AuthGate>} />
        <Route path="/vip" element={<AuthGate><VipPrivilegePage /></AuthGate>} />
        <Route path="/nova-pass" element={<AuthGate><NovaPassPage /></AuthGate>} />
        <Route path="/lucky-box" element={<AuthGate><LuckyBoxPage /></AuthGate>} />
        <Route path="/streak" element={<AuthGate><StreakPage /></AuthGate>} />
        <Route path="/invite-friends" element={<AuthGate><InvitePage /></AuthGate>} />
        <Route path="/lovers" element={<AuthGate><LoversPage /></AuthGate>} />
        <Route path="/love-history" element={<AuthGate><LoveHistoryPage /></AuthGate>} />
        <Route path="/dev/frames" element={<AuthGate><FramePreviewPage /></AuthGate>} />
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

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <LanguageProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <SpeedInsights />
          <Analytics />
          {showSplash ? (
            <SplashScreen onFinish={handleSplashFinish} />
          ) : (
            <BrowserRouter>
              <ActiveRoomProvider>
                <AnimatedRoutes />
                <FloatingRoomBubble />
                <GlobalGiftTicker />
                <LegendaryGiftExplosion />
                <LevelUpRoot />
                <AgoraDebugPanel />
              </ActiveRoomProvider>
            </BrowserRouter>
          )}
        </TooltipProvider>
      </LanguageProvider>
    </QueryClientProvider>
  );
};

export default App;
