import { useEffect, useState, type FormEvent } from "react";
import { Loader2, Lock, Bell, Trash2, Save } from "lucide-react";
import { toast } from "sonner";
import { useNavigate } from "@tanstack/react-router";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { deleteAccount } from "@/lib/account.functions";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export function SettingsTab() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const deleteFn = useServerFn(deleteAccount);

  const [pw, setPw] = useState("");
  const [pwSaving, setPwSaving] = useState(false);

  const [notif, setNotif] = useState(true);
  const [notifLoading, setNotifLoading] = useState(true);
  const [notifSaving, setNotifSaving] = useState(false);

  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("email_notifications")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      setNotif(data?.email_notifications ?? true);
      setNotifLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handlePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setPwSaving(true);
    const { error } = await supabase.auth.updateUser({ password: pw });
    setPwSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setPw("");
    toast.success("Password updated");
  };

  const toggleNotif = async (next: boolean) => {
    if (!user) return;
    setNotifSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ email_notifications: next })
      .eq("id", user.id);
    setNotifSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setNotif(next);
    toast.success(next ? "Email notifications on" : "Email notifications off");
  };

  const handleDelete = async () => {
    if (confirm !== "DELETE") {
      toast.error('Type "DELETE" to confirm');
      return;
    }
    setDeleting(true);
    try {
      await deleteFn();
      await signOut();
      toast.success("Account deleted");
      void navigate({ to: "/", replace: true });
    } catch (err) {
      setDeleting(false);
      toast.error(err instanceof Error ? err.message : "Failed to delete account");
    }
  };

  return (
    <div className="space-y-6">
      {/* Password */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Lock className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Change password</h2>
        </div>
        <form onSubmit={handlePassword} className="space-y-4">
          <div>
            <label htmlFor="newpw" className="text-sm font-medium">New password</label>
            <input
              id="newpw"
              type="password"
              value={pw}
              onChange={(e) => setPw(e.target.value)}
              minLength={8}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
          </div>
          <button
            type="submit"
            disabled={pwSaving || pw.length < 8}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
          >
            {pwSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
            Update password
          </button>
        </form>
      </section>

      {/* Notifications */}
      <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
        <div className="mb-4 flex items-center gap-2">
          <Bell className="h-4 w-4 text-primary" />
          <h2 className="font-display text-lg font-semibold">Notifications</h2>
        </div>
        <label className="flex cursor-pointer items-center justify-between gap-4 rounded-lg border border-border bg-background/40 p-4">
          <div>
            <div className="text-sm font-medium">Email notifications</div>
            <p className="mt-0.5 text-xs text-muted-foreground">
              Receive updates and replies via email.
            </p>
          </div>
          <input
            type="checkbox"
            checked={notif}
            disabled={notifLoading || notifSaving}
            onChange={(e) => void toggleNotif(e.target.checked)}
            className="h-5 w-5 cursor-pointer accent-primary"
          />
        </label>
      </section>

      {/* Delete */}
      <section className="rounded-2xl border border-destructive/40 bg-destructive/5 p-6 shadow-elegant sm:p-8">
        <div className="mb-2 flex items-center gap-2">
          <Trash2 className="h-4 w-4 text-destructive" />
          <h2 className="font-display text-lg font-semibold text-destructive">Delete account</h2>
        </div>
        <p className="text-sm text-muted-foreground">
          This will permanently remove your account and all associated data.
          This action cannot be undone.
        </p>
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <button className="mt-4 inline-flex items-center gap-2 rounded-md border border-destructive bg-destructive/10 px-4 py-2 text-sm font-semibold text-destructive transition-smooth hover:bg-destructive/20">
              <Trash2 className="h-4 w-4" /> Delete my account
            </button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete account permanently?</AlertDialogTitle>
              <AlertDialogDescription>
                Type <span className="font-mono font-bold">DELETE</span> below to confirm.
                This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <input
              type="text"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              placeholder="DELETE"
              className="w-full rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-destructive focus:ring-2 focus:ring-destructive/30"
            />
            <AlertDialogFooter>
              <AlertDialogCancel onClick={() => setConfirm("")}>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={(e) => {
                  e.preventDefault();
                  void handleDelete();
                }}
                disabled={deleting || confirm !== "DELETE"}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                {deleting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                Delete forever
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </section>
    </div>
  );
}
