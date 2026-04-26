import { useEffect, type ReactNode } from "react";
import { useNavigate, useLocation } from "@tanstack/react-router";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/lib/auth";

interface RequireAuthProps {
  children: ReactNode;
  /** Require the user to also have the admin role. */
  requireAdmin?: boolean;
}

export function RequireAuth({ children, requireAdmin = false }: RequireAuthProps) {
  const { loading, isAuthenticated, isAdmin } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (loading) return;
    if (!isAuthenticated) {
      void navigate({
        to: "/login",
        search: { redirect: location.pathname + location.search },
        replace: true,
      });
    }
  }, [loading, isAuthenticated, navigate, location.pathname, location.search]);

  if (loading || !isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (requireAdmin && !isAdmin) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4">
        <div className="max-w-md rounded-2xl border border-border bg-card p-8 text-center shadow-elegant">
          <h1 className="font-display text-2xl font-bold">Not authorized</h1>
          <p className="mt-2 text-sm text-muted-foreground">
            Your account doesn't have access to this page.
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
