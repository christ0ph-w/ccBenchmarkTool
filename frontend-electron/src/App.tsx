import { Outlet } from "react-router-dom";
import { SidebarNav } from "@/layout/SidebarNav";
import { ThemeProvider } from "@/components/theme-provider";

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="vite-ui-theme">
      <div className="flex h-screen bg-background">
        <div className="w-16 border-r bg-muted/40 flex flex-col">
          <SidebarNav />
        </div>

        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </ThemeProvider>
  );
}

export default App;
