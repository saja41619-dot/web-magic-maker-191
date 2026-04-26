import { createFileRoute, Link } from "@tanstack/react-router";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { useAuth } from "@/lib/auth";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: DashboardRoute,
});

function DashboardRoute() {
  return (
    <RequireAuth>
      <DashboardContent />
    </RequireAuth>
  );
}

function DashboardContent() {
  const { user } = useAuth();
  return (
    <div className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Signed in as {user?.email}.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/admin"
          className="inline-flex items-center rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
        >
          Go to admin
        </Link>
        <Link
          to="/"
          className="inline-flex items-center rounded-md border border-border bg-card px-4 py-2 text-sm font-medium hover:bg-accent"
        >
          Back to site
        </Link>
      </div>
    </div>
  );
}
