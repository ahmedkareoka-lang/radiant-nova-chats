import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate, useSearchParams } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
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
import NotFound from "./pages/NotFound";
import TopUpPage from "./pages/TopUpPage";
import CreateRoom from "./pages/CreateRoom";
import VoiceRoom from "./pages/VoiceRoom";
import Profile from "./pages/Profile";
import SearchPage from "./pages/SearchPage";
import ChatPage from "./pages/ChatPage";
import AdminDashboard from "./pages/AdminDashboard";
import StorePage from "./pages/StorePage";
import WalletPage from "./pages/WalletPage";
import InventoryPage from "./pages/InventoryPage";
import AgenciesPage from "./pages/AgenciesPage";
import NotificationsPage from "./pages/NotificationsPage";
import UserProfile from "./pages/UserProfile";
import EditProfile from "./pages/EditProfile";
import LeaderboardPage from "./pages/LeaderboardPage";
import DailyTasksPage from "./pages/DailyTasksPage";
import PostsFeedPage from "./pages/PostsFeedPage";
import GamesPage from "./pages/GamesPage";
import NovaPPage from "./pages/NovaPPage";
import VipPrivilegePage from "./pages/VipPrivilegePage";
import NovaPassPage from "./pages/NovaPassPage";

const queryClient = new QueryClient();

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

/** Deep link handler: after login, navigate to saved destination */
const DeepLinkRedirector = () => {
  const location = useLocation();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (checked) return;
    const saved = sessionStorage.getItem(REDIRECT_KEY);
    if (saved && location.pathname === "/") {
      sessionStorage.removeItem(REDIRECT_KEY);
      // Use replaceState to avoid adding to history
      window.history.replaceState(null, "", saved);
      window.location.reload();
    }
    setChecked(true);
  }, [location, checked]);

  return null;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
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
        {/* Deep link routes */}
        <Route path="/room" element={<AuthGate><RoomRedirect /></AuthGate>} />
        <Route path="/invite" element={<AuthGate><InviteRedirect /></AuthGate>} />
        <Route path="*" element={<NotFound />} />
      </Routes>
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
