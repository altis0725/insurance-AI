import { useLocation } from "wouter";
import { Home, FileText, MessageCircle, Settings, Bell, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface NavItem {
  path: string;
  icon: React.ReactNode;
  label: string;
}

const navItems: NavItem[] = [
  { path: "/", icon: <Home className="h-5 w-5" />, label: "ホーム" },
  { path: "/recordings", icon: <FileText className="h-5 w-5" />, label: "ライフログ" },
  { path: "/ask", icon: <MessageCircle className="h-5 w-5" />, label: "Ask" },
  { path: "/reminders", icon: <Bell className="h-5 w-5" />, label: "リマインダー" },
  { path: "/calendar", icon: <Calendar className="h-5 w-5" />, label: "カレンダー" },
  { path: "/settings", icon: <Settings className="h-5 w-5" />, label: "設定" },
];

export default function BottomNav() {
  const [location, setLocation] = useLocation();

  const isActive = (path: string) => {
    if (path === "/") return location === "/";
    return location.startsWith(path);
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-border safe-area-bottom">
      <div className="flex items-center justify-around h-16 max-w-lg mx-auto px-2">
        {navItems.map((item) => (
          <button
            key={item.path}
            onClick={() => setLocation(item.path)}
            className={cn(
              "flex flex-col items-center justify-center w-full h-full gap-0.5 transition-colors touch-button",
              isActive(item.path)
                ? "text-primary"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {item.icon}
            <span className="text-[10px] font-medium">{item.label}</span>
          </button>
        ))}
      </div>
    </nav>
  );
}
