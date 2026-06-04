import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { z } from "zod";
import { ArrowLeft, Eye, EyeOff, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in or Create Account" },
      { name: "description", content: "Create a new account or sign in to continue." },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AuthPage,
});

const credSchema = z.object({
  email: z.string().trim().email("Enter a valid email").max(255),
  password: z.string().min(6, "Password must be at least 6 characters").max(128),
});
const emailSchema = z.string().trim().email("Enter a valid email").max(255);

type Tab = "signin" | "signup";

const INVITE_KEY = "pending_invite_code";

async function consumeInvite(userId: string) {
  if (typeof window === "undefined") return;
  const code = window.localStorage.getItem(INVITE_KEY);
  if (!code) return;
  window.localStorage.removeItem(INVITE_KEY);
  const { data: inv } = await supabase
    .from("user_invites")
    .select("id, inviter_id, status, expires_at")
    .eq("invite_code", code)
    .maybeSingle();
  if (!inv || inv.status !== "pending" || new Date(inv.expires_at) < new Date()) return;
  if (inv.inviter_id === userId) return;
  await supabase
    .from("user_invites")
    .update({ status: "accepted", accepted_by: userId, accepted_at: new Date().toISOString() })
    .eq("id", inv.id);
  toast.success("Invite accepted — you're now connected with your inviter.");
}

function AuthPage() {
  const { isAuthenticated, loading, signIn } = useAuth();
  const navigate = useNavigate();
  const [tab, setTab] = useState<Tab>("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [forgotMode, setForgotMode] = useState(false);
  const [inviteCode, setInviteCode] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    const code = params.get("invite");
    if (code) {
      window.localStorage.setItem(INVITE_KEY, code);
      setInviteCode(code);
      setTab("signup");
    } else {
      const stored = window.localStorage.getItem(INVITE_KEY);
      if (stored) setInviteCode(stored);
    }
  }, []);

  useEffect(() => {
    if (!loading && isAuthenticated) {
      void (async () => {
        const { data } = await supabase.auth.getUser();
        if (data.user) await consumeInvite(data.user.id);
        void navigate({ to: "/dashboard", replace: true });
      })();
    }
  }, [loading, isAuthenticated, navigate]);

  const switchTab = (next: Tab) => {
    setTab(next);
    setError(null);
    setForgotMode(false);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);

    if (forgotMode) {
      const parsed = emailSchema.safeParse(email);
      if (!parsed.success) {
        setError(parsed.error.issues[0]?.message ?? "Invalid email");
        return;
      }
      setSubmitting(true);
      try {
        const { error: err } = await supabase.auth.resetPasswordForEmail(parsed.data, {
          redirectTo: `${window.location.origin}/reset-password`,
        });
        if (err) throw err;
        toast.success("Password reset link sent. Check your email.");
        setForgotMode(false);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Failed to send reset email");
      } finally {
        setSubmitting(false);
      }
      return;
    }

    const parsed = credSchema.safeParse({ email, password });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    try {
      if (tab === "signup") {
        const { error: err } = await supabase.auth.signUp({
          email: parsed.data.email,
          password: parsed.data.password,
          options: { emailRedirectTo: `${window.location.origin}/` },
        });
        if (err) throw err;
        toast.success("Account created! Check your email to verify.");
        switchTab("signin");
        setPassword("");
      } else {
        await signIn(parsed.data.email, parsed.data.password);
        void navigate({ to: "/dashboard", replace: true });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed");
    } finally {
      setSubmitting(false);
    }
  };

  const submitLabel = forgotMode
    ? "Send reset link"
    : tab === "signup"
      ? "Create account"
      : "Sign in";

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md">
        <Link
          to="/"
          className="mb-8 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to site
        </Link>
        <div className="rounded-2xl border border-border bg-card p-8 shadow-elegant">
          <h1 className="font-display text-2xl font-bold">
            {forgotMode ? "Reset your password" : "Welcome"}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {forgotMode
              ? "Enter your email and we'll send you a reset link."
              : "Sign in to your account or create a new one."}
          </p>

          {inviteCode && !forgotMode && (
            <div className="mt-4 rounded-md border border-primary/30 bg-primary/10 px-3 py-2 text-xs text-foreground">
              You were invited to join Connect. Sign up or sign in to accept the invite.
            </div>
          )}

          {!forgotMode && (
            <Tabs value={tab} onValueChange={(v) => switchTab(v as Tab)} className="mt-6">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="signin">Sign In</TabsTrigger>
                <TabsTrigger value="signup">Sign Up</TabsTrigger>
              </TabsList>
              <TabsContent value={tab} />
            </Tabs>
          )}

          <form onSubmit={handleSubmit} className="mt-6 space-y-4">
            <div>
              <label htmlFor="email" className="text-sm font-medium">
                Email
              </label>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
              />
            </div>
            {!forgotMode && (
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="password" className="text-sm font-medium">
                    Password
                  </label>
                  {tab === "signin" && (
                    <button
                      type="button"
                      onClick={() => {
                        setForgotMode(true);
                        setError(null);
                      }}
                      className="text-xs text-muted-foreground hover:text-foreground"
                    >
                      Forgot password?
                    </button>
                  )}
                </div>
                <div className="relative mt-1.5">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    autoComplete={tab === "signup" ? "new-password" : "current-password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-md border border-border bg-background/60 px-4 py-2.5 pr-10 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((s) => !s)}
                    className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
            )}
            {error && (
              <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                {error}
              </div>
            )}
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-gradient-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
            >
              {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitLabel}
            </button>
          </form>

          {forgotMode && (
            <div className="mt-4 text-center text-sm text-muted-foreground">
              <button
                type="button"
                onClick={() => {
                  setForgotMode(false);
                  setError(null);
                }}
                className="hover:text-foreground"
              >
                Back to sign in
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
