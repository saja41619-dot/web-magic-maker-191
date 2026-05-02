import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { LogOut, Loader2, ArrowLeft, User as UserIcon, Mail, Heart, Settings as SettingsIcon } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ProfileTab } from "@/components/dashboard/ProfileTab";
import { MessagesTab } from "@/components/dashboard/MessagesTab";
import { FavoritesTab } from "@/components/dashboard/FavoritesTab";
import { SettingsTab } from "@/components/dashboard/SettingsTab";

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

function DashboardRoute() {
  const { loading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!loading && !isAuthenticated) {
      void navigate({ to: "/auth", replace: true });
    }
  }, [loading, isAuthenticated, navigate]);

  // While auth is restoring, show a skeleton shell instead of a blank spinner —
  // feels instant and avoids the long "white loading" perception.
  if (loading) return <DashboardSkeleton />;
  if (!isAuthenticated) return <DashboardSkeleton />;

  return <DashboardContent />;
}

function DashboardSkeleton() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <div className="mb-6 h-4 w-24 animate-pulse rounded bg-primary/10" />
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="flex items-center gap-4">
          <div className="h-16 w-16 animate-pulse rounded-full bg-primary/10" />
          <div className="space-y-2">
            <div className="h-6 w-48 animate-pulse rounded bg-primary/10" />
            <div className="h-4 w-64 animate-pulse rounded bg-primary/10" />
          </div>
        </div>
      </div>
      <div className="mt-8 h-10 w-full animate-pulse rounded-md bg-primary/10" />
      <div className="mt-6 h-64 w-full animate-pulse rounded-2xl bg-primary/5" />
    </div>
  );
}

function DashboardContent() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);
  const [headerName, setHeaderName] = useState("");
  const [headerAvatar, setHeaderAvatar] = useState<string | null>(null);

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
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>

      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 shrink-0 overflow-hidden items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
              {headerAvatar ? (
                <img src={headerAvatar} alt="Avatar" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {headerName || "Welcome"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              {isAdmin && (
                <Link
                  to="/admin"
                  className="mt-2 inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary hover:bg-primary/20"
                >
                  Admin panel →
                </Link>
              )}
            </div>
          </div>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-smooth hover:bg-secondary/60 disabled:opacity-60"
          >
            {signingOut ? <Loader2 className="h-4 w-4 animate-spin" /> : <LogOut className="h-4 w-4" />}
            Sign out
          </button>
        </div>
      </div>

      <Tabs defaultValue="profile" className="mt-8">
        <TabsList className="grid w-full grid-cols-2 sm:grid-cols-4 h-auto">
          <TabsTrigger value="profile" className="gap-2">
            <UserIcon className="h-4 w-4" /> Profile
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <Mail className="h-4 w-4" /> Messages
          </TabsTrigger>
          <TabsTrigger value="favorites" className="gap-2">
            <Heart className="h-4 w-4" /> Favorites
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="h-4 w-4" /> Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <ProfileTab />
        </TabsContent>
        <TabsContent value="messages" className="mt-6">
          <MessagesTab />
        </TabsContent>
        <TabsContent value="favorites" className="mt-6">
          <FavoritesTab />
        </TabsContent>
        <TabsContent value="settings" className="mt-6">
          <SettingsTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
