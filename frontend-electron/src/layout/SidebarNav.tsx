import { NavLink } from "react-router-dom";
import { LayoutDashboard, Settings, Zap, LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

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
  return (
    <nav className="flex flex-col items-start space-y-2 p-4">
      {navItems.map(({ to, title, icon: Icon, end }) => (
        <NavLink key={to} to={to} end={end}>
          {({ isActive }) => (
            <Button
              variant={isActive ? "secondary" : "ghost"}
              className="w-full justify-center"
              title={title}
            >
              <Icon className="h-5 w-5" />
            </Button>
          )}
        </NavLink>
      ))}
    </nav>
  );
}