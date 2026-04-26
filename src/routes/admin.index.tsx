import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Mail, MailOpen, Briefcase, Wrench, ArrowRight, Loader2 } from "lucide-react";

export const Route = createFileRoute("/admin/")({
  head: () => ({
    meta: [
      { title: "Admin Dashboard" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminDashboardRoute,
});

function AdminDashboardRoute() {
  return (
    <AdminGuard>
      <Dashboard />
    </AdminGuard>
  );
}

interface Stats {
  totalMessages: number;
  unreadMessages: number;
  projectsCount: number;
  skillsCount: number;
  recent: Array<{ id: string; name: string; email: string; created_at: string; read: boolean }>;
}

function Dashboard() {
  const { isAdmin } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAdmin) return;
    let cancelled = false;
    (async () => {
      const [messages, unread, projects, skills, recent] = await Promise.all([
        supabase.from("contact_messages").select("*", { count: "exact", head: true }),
        supabase.from("contact_messages").select("*", { count: "exact", head: true }).eq("read", false),
        supabase.from("projects").select("*", { count: "exact", head: true }),
        supabase.from("skills").select("*", { count: "exact", head: true }),
        supabase
          .from("contact_messages")
          .select("id, name, email, created_at, read")
          .order("created_at", { ascending: false })
          .limit(5),
      ]);
      if (cancelled) return;
      setStats({
        totalMessages: messages.count ?? 0,
        unreadMessages: unread.count ?? 0,
        projectsCount: projects.count ?? 0,
        skillsCount: skills.count ?? 0,
        recent: recent.data ?? [],
      });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [isAdmin]);

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const cards = [
    { label: "Total messages", value: stats?.totalMessages ?? 0, Icon: Mail, color: "text-primary" },
    { label: "Unread", value: stats?.unreadMessages ?? 0, Icon: MailOpen, color: "text-amber-400" },
    { label: "Projects", value: stats?.projectsCount ?? 0, Icon: Briefcase, color: "text-emerald-400" },
    { label: "Skills", value: stats?.skillsCount ?? 0, Icon: Wrench, color: "text-cyan-400" },
  ];

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="mt-1 text-sm text-muted-foreground">Overview of your portfolio.</p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map(({ label, value, Icon, color }) => (
          <div key={label} className="rounded-2xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
              <Icon className={`h-4 w-4 ${color}`} />
            </div>
            <div className="mt-3 font-display text-3xl font-bold">{value}</div>
          </div>
        ))}
      </div>

      <div className="mt-10 rounded-2xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h2 className="font-semibold">Recent messages</h2>
          <Link
            to="/admin/messages"
            className="inline-flex items-center gap-1 text-sm text-primary hover:underline"
          >
            View all <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
        {stats && stats.recent.length > 0 ? (
          <ul className="divide-y divide-border">
            {stats.recent.map((m) => (
              <li
                key={m.id}
                onClick={() => navigate({ to: "/admin/messages" })}
                className="flex cursor-pointer items-center justify-between px-5 py-3 transition-smooth hover:bg-secondary/40"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {!m.read && <span className="h-1.5 w-1.5 rounded-full bg-primary" />}
                    <span className="truncate font-medium">{m.name}</span>
                  </div>
                  <div className="truncate text-xs text-muted-foreground">{m.email}</div>
                </div>
                <div className="shrink-0 pl-4 text-xs text-muted-foreground">
                  {new Date(m.created_at).toLocaleDateString()}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <div className="p-8 text-center text-sm text-muted-foreground">No messages yet.</div>
        )}
      </div>
    </div>
  );
}
