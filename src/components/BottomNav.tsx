import { Home, Search, Plus, MessageCircle, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";

const navItems = [
  { icon: Home, label: "الرئيسية", path: "/" },
  { icon: Search, label: "بحث", path: "/search" },
  { icon: Plus, label: "إنشاء", path: "/create-room", isCenter: true },
  { icon: MessageCircle, label: "الرسائل", path: "/chat" },
  { icon: User, label: "حسابي", path: "/profile" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/40" style={{ background: "hsl(260 18% 10% / 0.8)", backdropFilter: "blur(20px)", WebkitBackdropFilter: "blur(20px)" }}>
      <div className="flex items-center justify-around px-2 py-2 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="relative -mt-6 w-14 h-14 rounded-full gradient-neon glow-neon flex items-center justify-center transition-transform hover:scale-110 active:scale-95">
                <Icon className="w-7 h-7 text-primary-foreground" />
              </button>
            );
          }

          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className={`relative flex flex-col items-center gap-0.5 py-1 px-3 rounded-xl transition-all duration-200 ${isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"}`}>
              <Icon className="w-5 h-5" />
              <span className="text-[10px] font-semibold">{item.label}</span>
              {isActive && <div className="absolute bottom-1 w-1 h-1 rounded-full bg-primary animate-pulse-glow" />}
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
