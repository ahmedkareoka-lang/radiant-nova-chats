import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useEffect, useState, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ActiveRoomProvider } from "@/contexts/ActiveRoomContext";
import FloatingRoomBubble from "@/components/FloatingRoomBubble";
import GlobalGiftTicker from "@/components/GlobalGiftTicker";
import LegendaryGiftExplosion from "@/components/LegendaryGiftExplosion";
import LevelUpEvent from "@/components/LevelUpEvent";
import { useLevelUpDetector } from "@/hooks/useLevelUpDetector";
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

const AuthGate = ({ children }: { children: React.ReactNode }) => {
  const [session, setSession] = useState<any>(undefined);

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Navigate to="/login" replace />;
  return <>{children}</>;
};

const AnimatedRoutes = () => {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<AuthGate><Index /></AuthGate>} />
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
        <Route path="*" element={<NotFound />} />
      </Routes>
    </AnimatePresence>
  );
};

const App = () => {
  const [showSplash, setShowSplash] = useState(true);
  const handleSplashFinish = useCallback(() => setShowSplash(false), []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
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
            </ActiveRoomProvider>
          </BrowserRouter>
        )}
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
