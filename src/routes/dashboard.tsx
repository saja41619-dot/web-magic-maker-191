import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import {
  LogOut,
  Loader2,
  ArrowLeft,
  User as UserIcon,
  Mail,
  Heart,
  Settings as SettingsIcon,
  Shield,
  BookOpen,
  Briefcase,
  Bell,
  Activity,
  LifeBuoy,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { MessagesTab } from "@/components/dashboard/MessagesTab";
import { FavoritesTab } from "@/components/dashboard/FavoritesTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";
import { LearningTab } from "@/components/dashboard/LearningTab";
import { ServicesTab } from "@/components/dashboard/ServicesTab";
import { NotificationsTab } from "@/components/dashboard/NotificationsTab";
import { ActivityTab } from "@/components/dashboard/ActivityTab";
import { SupportTab } from "@/components/dashboard/SupportTab";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "My Dashboard" },
      { name: "description", content: "Your personal account dashboard." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardRoute,
});

type TabKey =
  | "profile"
  | "learning"
  | "services"
  | "messages"
  | "favorites"
  | "notifications"
  | "activity"
  | "support"
  | "settings";

const NAV_ITEMS: { key: TabKey; label: string; icon: typeof UserIcon }[] = [
  { key: "profile", label: "Profile", icon: UserIcon },
  { key: "learning", label: "Learning", icon: BookOpen },
  { key: "services", label: "Services", icon: Briefcase },
  { key: "messages", label: "Messages", icon: Mail },
  { key: "favorites", label: "Favorites", icon: Heart },
  { key: "notifications", label: "Notifications", icon: Bell },
  { key: "activity", label: "Activity", icon: Activity },
  { key: "support", label: "Support", icon: LifeBuoy },
  { key: "settings", label: "Settings", icon: SettingsIcon },
];

function DashboardRoute() {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  if (loading || !isAuthenticated) return <DashboardSkeleton />;
  return <DashboardContent />;
}

function DashboardSkeleton() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5">
      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="mb-6 h-4 w-24 animate-pulse rounded bg-primary/10" />
        <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="flex items-center gap-4">
            <div className="h-16 w-16 animate-pulse rounded-full bg-primary/10" />
            <div className="space-y-2">
              <div className="h-6 w-48 animate-pulse rounded bg-primary/10" />
              <div className="h-4 w-64 animate-pulse rounded bg-primary/10" />
            </div>
          </div>
        </div>
        <div className="mt-8 h-64 w-full animate-pulse rounded-2xl bg-primary/5" />
      </div>
    </div>
  );
}

function DashboardContent() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [headerName, setHeaderName] = useState("");
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabKey>("profile");

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setHeaderName(data?.display_name ?? "");
      setHeaderAvatar(data?.avatar_url ?? null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      void navigate({ to: "/", replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const initial = (headerName || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 pb-24 lg:pb-0">
      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6 sm:py-8 lg:px-8">
        {/* Desktop sidebar */}
        <aside className="hidden lg:flex lg:w-64 lg:flex-col lg:shrink-0">
          <div className="sticky top-6 space-y-4">
            <Link
              to="/"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition-smooth hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back to site
            </Link>

            <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
              <div className="flex flex-col items-center text-center">
                <div className="flex h-20 w-20 shrink-0 overflow-hidden items-center justify-center rounded-full bg-gradient-primary text-3xl font-bold text-primary-foreground shadow-glow">
                  {headerAvatar ? (
                    <img src={headerAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <h2 className="mt-3 font-display text-lg font-bold leading-tight">
                  {headerName || "Welcome"}
                </h2>
                <p className="mt-1 line-clamp-1 text-xs text-muted-foreground">{user?.email}</p>
                {isAdmin && (
                  <Link
                    to="/admin"
                    className="mt-3 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                  >
                    <Shield className="h-3 w-3" /> Admin
                  </Link>
                )}
              </div>
            </div>

            <nav className="rounded-2xl border border-border bg-card p-2 shadow-elegant">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = activeTab === item.key;
                return (
                  <button
                    key={item.key}
                    onClick={() => setActiveTab(item.key)}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-smooth",
                      active
                        ? "bg-gradient-primary text-primary-foreground shadow-glow"
                        : "text-muted-foreground hover:bg-secondary/60 hover:text-foreground",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                    {item.label}
                  </button>
                );
              })}
            </nav>

            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium transition-smooth hover:bg-destructive/10 hover:text-destructive hover:border-destructive/40 disabled:opacity-60"
            >
              {signingOut ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4" />
              )}
              Sign out
            </button>
          </div>
        </aside>

        {/* Main content */}
        <main className="min-w-0 flex-1">
          {/* Mobile / tablet header */}
          <div className="lg:hidden">
            <Link
              to="/"
              className="mb-4 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
            >
              <ArrowLeft className="h-4 w-4" /> Back
            </Link>
            <div className="rounded-2xl border border-border bg-card p-5 shadow-elegant">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 shrink-0 overflow-hidden items-center justify-center rounded-full bg-gradient-primary text-xl font-bold text-primary-foreground shadow-glow">
                  {headerAvatar ? (
                    <img src={headerAvatar} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    initial
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <h1 className="truncate font-display text-xl font-bold sm:text-2xl">
                    {headerName || "Welcome"}
                  </h1>
                  <p className="mt-0.5 truncate text-xs text-muted-foreground">{user?.email}</p>
                  {isAdmin && (
                    <Link
                      to="/admin"
                      className="mt-1.5 inline-flex items-center gap-1 rounded-full border border-primary/40 bg-primary/10 px-2 py-0.5 text-[10px] font-medium text-primary"
                    >
                      <Shield className="h-2.5 w-2.5" /> Admin
                    </Link>
                  )}
                </div>
                <button
                  onClick={handleSignOut}
                  disabled={signingOut}
                  aria-label="Sign out"
                  className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-border bg-background transition-smooth hover:bg-destructive/10 hover:text-destructive disabled:opacity-60"
                >
                  {signingOut ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogOut className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Active panel */}
          <div className="mt-6">
            <div className="mb-4 hidden items-center justify-between lg:flex">
              <h1 className="font-display text-2xl font-bold capitalize">
                {NAV_ITEMS.find((i) => i.key === activeTab)?.label}
              </h1>
            </div>
            {activeTab === "profile" && <ProfileTab />}
            {activeTab === "messages" && <MessagesTab />}
            {activeTab === "favorites" && <FavoritesTab />}
            {activeTab === "settings" && <SettingsTab />}
          </div>
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t border-border bg-card/95 backdrop-blur-lg lg:hidden"
        style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
      >
        <div className="mx-auto grid max-w-md grid-cols-4">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = activeTab === item.key;
            return (
              <button
                key={item.key}
                onClick={() => setActiveTab(item.key)}
                className={cn(
                  "flex flex-col items-center justify-center gap-1 py-2.5 text-[11px] font-medium transition-smooth",
                  active ? "text-primary" : "text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  className={cn(
                    "flex h-9 w-9 items-center justify-center rounded-xl transition-smooth",
                    active && "bg-gradient-primary text-primary-foreground shadow-glow",
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                {item.label}
              </button>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
