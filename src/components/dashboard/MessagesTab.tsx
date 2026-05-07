import { useEffect, useState } from "react";
import { Loader2, Mail } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface Msg {
  id: string;
  message: string;
  created_at: string;
  read: boolean;
}

export function MessagesTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [messages, setMessages] = useState<Msg[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("contact_messages")
        .select("id, message, created_at, read")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setMessages(data ?? []);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Mail className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">My messages</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : messages.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          You haven't sent any messages yet.
        </p>
      ) : (
        <ul className="space-y-3">
          {messages.map((m) => (
            <li
              key={m.id}
              className="rounded-xl border border-border bg-background/40 p-4"
            >
              <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
                <time>{new Date(m.created_at).toLocaleString()}</time>
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${
                    m.read
                      ? "bg-primary/10 text-primary"
                      : "bg-secondary text-muted-foreground"
                  }`}
                >
                  {m.read ? "Read" : "Sent"}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm">{m.message}</p>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
