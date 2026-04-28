import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { LogOut, User as UserIcon, Mail, Calendar, Loader2, Save, ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

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

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return <DashboardContent />;
}

function DashboardContent() {
  const { user, isAdmin, signOut } = useAuth();
  const navigate = useNavigate();
  const [displayName, setDisplayName] = useState("");
  const [initialName, setInitialName] = useState("");
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error("Failed to load profile");
      }
      const name = data?.display_name ?? "";
      setDisplayName(name);
      setInitialName(name);
      setLoadingProfile(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const trimmed = displayName.trim();
    if (trimmed.length < 1 || trimmed.length > 80) {
      toast.error("Display name must be 1-80 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: trimmed })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInitialName(trimmed);
    toast.success("Profile updated");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut();
      void navigate({ to: "/", replace: true });
    } finally {
      setSigningOut(false);
    }
  };

  const created = user?.created_at ? new Date(user.created_at) : null;
  const initial = (displayName || user?.email || "U").trim().charAt(0).toUpperCase();
  const dirty = displayName.trim() !== initialName.trim();

  return (
    <div className="mx-auto max-w-4xl px-4 py-12 sm:px-6 sm:py-16">
      <Link
        to="/"
        className="mb-6 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Back to site
      </Link>

      {/* Header card */}
      <div className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
              {initial}
            </div>
            <div>
              <h1 className="font-display text-2xl font-bold sm:text-3xl">
                {displayName || "Welcome"}
              </h1>
              <p className="mt-1 text-sm text-muted-foreground">{user?.email}</p>
              {isAdmin && (
                <span className="mt-2 inline-flex rounded-full border border-primary/40 bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
                  Admin
                </span>
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

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Profile edit */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="mb-4 flex items-center gap-2">
            <UserIcon className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Profile</h2>
          </div>
          <form onSubmit={handleSave} className="space-y-4">
            <div>
              <label htmlFor="displayName" className="text-sm font-medium">
                Display name
              </label>
              <input
                id="displayName"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                disabled={loadingProfile}
                placeholder="Your name"
                className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
              />
            </div>
            <button
              type="submit"
              disabled={saving || loadingProfile || !dirty}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save changes
            </button>
          </form>
        </section>

        {/* Account info */}
        <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant">
          <div className="mb-4 flex items-center gap-2">
            <Mail className="h-4 w-4 text-primary" />
            <h2 className="font-display text-lg font-semibold">Account</h2>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Email</dt>
              <dd className="text-right font-medium">{user?.email}</dd>
            </div>
            <div className="flex items-start justify-between gap-4">
              <dt className="text-muted-foreground">Verified</dt>
              <dd className="text-right font-medium">
                {user?.email_confirmed_at ? "Yes" : "Pending"}
              </dd>
            </div>
            {created && (
              <div className="flex items-start justify-between gap-4">
                <dt className="flex items-center gap-1.5 text-muted-foreground">
                  <Calendar className="h-3.5 w-3.5" /> Joined
                </dt>
                <dd className="text-right font-medium">
                  {created.toLocaleDateString(undefined, {
                    year: "numeric",
                    month: "short",
                    day: "numeric",
                  })}
                </dd>
              </div>
            )}
          </dl>
          {isAdmin && (
            <Link
              to="/admin"
              className="mt-5 inline-flex w-full items-center justify-center rounded-md border border-border bg-background px-4 py-2 text-sm font-medium transition-smooth hover:bg-secondary/60"
            >
              Go to admin panel
            </Link>
          )}
        </section>
      </div>
    </div>
  );
}
