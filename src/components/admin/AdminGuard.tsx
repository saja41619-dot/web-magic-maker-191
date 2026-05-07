import { Link, useLocation, useNavigate } from "@tanstack/react-router";
import type { ReactNode } from "react";
import { useAuth } from "@/lib/auth";
import { RequireAuth } from "@/components/auth/RequireAuth";
import {
  LayoutDashboard,
  Mail,
  Briefcase,
  Wrench,
  Settings,
  LogOut,
  ExternalLink,
} from "lucide-react";

const navItems = [
  { to: "/admin", label: "Dashboard", Icon: LayoutDashboard, exact: true },
  { to: "/admin/messages", label: "Messages", Icon: Mail, exact: false },
  { to: "/admin/projects", label: "Projects", Icon: Briefcase, exact: false },
  { to: "/admin/skills", label: "Skills", Icon: Wrench, exact: false },
  { to: "/admin/settings", label: "Settings", Icon: Settings, exact: false },
] as const;

export function AdminGuard({ children }: { children: ReactNode }) {
  const location = useLocation();
  return (
    <RequireAuth requireAdmin>
      <AdminShell currentPath={location.pathname}>{children}</AdminShell>
    </RequireAuth>
  );
}

function AdminShell({ children, currentPath }: { children: ReactNode; currentPath: string }) {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await signOut();
    void navigate({ to: "/login" });
  };

  return (
    <div className="flex min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="hidden w-60 shrink-0 border-r border-border bg-card/40 md:block">
        <div className="flex h-16 items-center border-b border-border px-6">
          <Link to="/admin" className="font-display text-lg font-bold text-gradient">
            Admin
          </Link>
        </div>
        <nav className="space-y-1 p-3">
          {navItems.map(({ to, label, Icon, exact }) => {
            const active = exact ? currentPath === to : currentPath.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-smooth " +
                  (active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground")
                }
              >
                <Icon className="h-4 w-4" />
                {label}
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 w-60 border-t border-border p-3">
          <div className="mb-2 truncate px-3 text-xs text-muted-foreground">{user?.email}</div>
          <Link
            to="/"
            className="mb-1 flex items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <ExternalLink className="h-4 w-4" /> View site
          </Link>
          <button
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-sm text-muted-foreground hover:bg-secondary/60 hover:text-foreground"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </div>
      </aside>

      {/* Mobile top bar */}
      <div className="flex w-full flex-col">
        <header className="flex h-16 items-center justify-between border-b border-border bg-card/40 px-4 md:hidden">
          <Link to="/admin" className="font-display text-lg font-bold text-gradient">
            Admin
          </Link>
          <button
            onClick={handleLogout}
            className="rounded-md p-2 text-muted-foreground hover:bg-secondary"
            aria-label="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </header>
        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card/40 px-3 py-2 md:hidden">
          {navItems.map(({ to, label, Icon, exact }) => {
            const active = exact ? currentPath === to : currentPath.startsWith(to);
            return (
              <Link
                key={to}
                to={to}
                className={
                  "flex shrink-0 items-center gap-2 rounded-md px-3 py-1.5 text-xs font-medium " +
                  (active
                    ? "bg-secondary text-foreground"
                    : "text-muted-foreground hover:bg-secondary/60")
                }
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </Link>
            );
          })}
        </nav>
        <main className="flex-1 p-6 md:p-10">{children}</main>
      </div>
    </div>
  );
}
