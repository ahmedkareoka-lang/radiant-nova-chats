import { Home, MessageCircle, FileText, Gamepad2, User } from "lucide-react";
import { useLocation, useNavigate } from "react-router-dom";
import { useNotifications } from "@/hooks/useNotifications";

const navItems = [
  { icon: Home, label: "الغرفة", path: "/", activeColor: "text-primary" },
  { icon: MessageCircle, label: "الرسائل", path: "/chat", activeColor: "text-pink-400", hasBadge: true },
  { icon: FileText, label: "", path: "/posts", isCenter: true },
  { icon: Gamepad2, label: "ألعاب", path: "/games", activeColor: "text-primary" },
  { icon: User, label: "أنا", path: "/profile", activeColor: "text-pink-400" },
];

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const { unreadCount } = useNotifications();

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-border/20"
      style={{ background: "hsl(260 28% 6% / 0.95)", backdropFilter: "blur(24px)", WebkitBackdropFilter: "blur(24px)" }}>
      <div className="flex items-center justify-around px-2 py-1.5 max-w-lg mx-auto">
        {navItems.map((item) => {
          const isActive = location.pathname === item.path;
          const Icon = item.icon;

          if (item.isCenter) {
            return (
              <button key={item.path} onClick={() => navigate(item.path)}
                className="relative -mt-5 w-12 h-12 rounded-full gradient-neon glow-neon flex items-center justify-center transition-transform hover:scale-110 active:scale-95 shadow-lg">
                <Icon className="w-6 h-6 text-primary-foreground" />
              </button>
            );
          }

          return (
            <button key={item.path} onClick={() => navigate(item.path)}
              className="relative flex flex-col items-center gap-0.5 py-1.5 px-4 rounded-xl transition-all duration-200">
              <div className="relative">
                <Icon className={`w-5 h-5 transition-colors ${isActive ? item.activeColor : "text-muted-foreground/60"}`}
                  strokeWidth={isActive ? 2.5 : 1.5} />
                {item.hasBadge && unreadCount > 0 && (
                  <div className="absolute -top-1.5 -right-2.5 min-w-[16px] h-4 rounded-full bg-destructive flex items-center justify-center px-1">
                    <span className="text-[8px] font-bold text-destructive-foreground">{unreadCount > 99 ? "99+" : unreadCount}</span>
                  </div>
                )}
                {isActive && (
                  <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 w-1 h-1 rounded-full bg-primary" />
                )}
              </div>
              <span className={`text-[10px] font-semibold ${isActive ? item.activeColor : "text-muted-foreground/50"}`}>{item.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};

export default BottomNav;
