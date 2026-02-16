import { NavLink, useLocation } from "react-router-dom";
import { LayoutDashboard, Settings, Zap, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useBenchmarkStore } from "@/stores/benchmarkStore";

interface NavItem {
  to: string;
  title: string;
  icon: LucideIcon;
  end?: boolean;
}

const navItems: NavItem[] = [
  { to: "/", title: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/settings", title: "Settings", icon: Settings },
  { to: "/benchmark", title: "Benchmark", icon: Zap },
];

export function SidebarNav() {
  const { isRunning } = useBenchmarkStore();
  const location = useLocation();

  const handleNavClick = (e: React.MouseEvent, to: string) => {
    if (location.pathname === to) return;

    // Block navigation while benchmark is running
    if (isRunning) {
      e.preventDefault();
      const confirmed = window.confirm(
        'Benchmark is still running. Are you sure you want to leave? Progress will be lost.'
      );
      if (!confirmed) {
        e.stopPropagation();
      }
    }
  };

  return (
    <nav className="flex flex-col items-start space-y-2 p-4">
      {navItems.map(({ to, title, icon: Icon, end }) => (
        <NavLink
          key={to}
          to={to}
          end={end}
          onClick={(e) => handleNavClick(e, to)}
        >
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className={`w-full justify-center ${
                isRunning && !isActive ? "opacity-50 cursor-not-allowed" : ""
              }`}
              title={isRunning && !isActive ? `${title} (disabled while benchmark running)` : title}
            >
              <Icon className="h-5 w-5" />
            </Button>
          )}
        </NavLink>
      ))}
    </nav>
  );
}