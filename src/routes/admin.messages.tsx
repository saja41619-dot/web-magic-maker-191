import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Trash2, Mail, MailOpen } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/messages")({
  head: () => ({
    meta: [
      { title: "Messages — Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: () => (
    <AdminGuard>
      <MessagesPage />
    </AdminGuard>
  ),
});

interface Message {
  id: string;
  name: string;
  email: string;
  message: string;
  read: boolean;
  created_at: string;
}

function MessagesPage() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<Message | null>(null);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("contact_messages")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) toast.error(error.message);
    setMessages(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const toggleRead = async (m: Message) => {
    const { error } = await supabase
      .from("contact_messages")
      .update({ read: !m.read })
      .eq("id", m.id);
    if (error) {
      toast.error(error.message);
      return;
    }
    setMessages((prev) =>
      prev.map((x) => (x.id === m.id ? { ...x, read: !x.read } : x)),
    );
    if (active?.id === m.id) setActive({ ...active, read: !active.read });
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this message?")) return;
    const { error } = await supabase.from("contact_messages").delete().eq("id", id);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success("Message deleted");
    setMessages((prev) => prev.filter((x) => x.id !== id));
    if (active?.id === id) setActive(null);
  };

  const openMessage = async (m: Message) => {
    setActive(m);
    if (!m.read) {
      await toggleRead(m);
    }
  };

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-3xl font-bold">Messages</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Contact form submissions.
      </p>

      <div className="mt-8 rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : messages.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            No messages yet.
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {messages.map((m) => (
              <li
                key={m.id}
                className="flex items-center justify-between px-5 py-3 transition-smooth hover:bg-secondary/40"
              >
                <button
                  onClick={() => void openMessage(m)}
                  className="flex min-w-0 flex-1 items-center gap-3 text-left"
                >
                  {m.read ? (
                    <MailOpen className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <Mail className="h-4 w-4 shrink-0 text-primary" />
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={"truncate " + (m.read ? "font-normal" : "font-semibold")}>
                        {m.name}
                      </span>
                      <span className="truncate text-xs text-muted-foreground">{m.email}</span>
                    </div>
                    <div className="truncate text-xs text-muted-foreground">{m.message}</div>
                  </div>
                </button>
                <div className="ml-4 flex shrink-0 items-center gap-3 text-xs text-muted-foreground">
                  <span>{new Date(m.created_at).toLocaleDateString()}</span>
                  <button
                    onClick={() => void remove(m.id)}
                    className="rounded p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Dialog open={!!active} onOpenChange={(o) => !o && setActive(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{active?.name}</DialogTitle>
          </DialogHeader>
          {active && (
            <div className="space-y-4">
              <div className="text-sm text-muted-foreground">
                <a href={`mailto:${active.email}`} className="text-primary hover:underline">
                  {active.email}
                </a>
                {" · "}
                {new Date(active.created_at).toLocaleString()}
              </div>
              <div className="whitespace-pre-wrap rounded-lg border border-border bg-secondary/40 p-4 text-sm">
                {active.message}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => void toggleRead(active)}
                  className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-secondary"
                >
                  Mark as {active.read ? "unread" : "read"}
                </button>
                <button
                  onClick={() => void remove(active.id)}
                  className="ml-auto inline-flex items-center gap-2 rounded-md border border-destructive/40 px-3 py-2 text-sm text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
