import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Search, MessageSquare, Users } from "lucide-react";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}
interface Group {
  avatar_url?: string | null;
  created_at?: string;
  created_by?: string;
  id: string;
  name: string;
}

interface Hit {
  id: string;
  kind: "dm" | "group";
  content: string;
  created_at: string;
  peerId: string; // user id (dm) or group id
  peerName: string;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: Profile[];
  groups: Group[];
  onOpenDm?: (peer: Profile) => void;
  onOpenGroup?: (group: Group) => void;
}

export function GlobalSearchModal({ open, onOpenChange, users, groups, onOpenDm, onOpenGroup }: Props) {
  const { user } = useAuth();
  const [q, setQ] = useState("");
  const [hits, setHits] = useState<Hit[]>([]);
  const [loading, setLoading] = useState(false);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  useEffect(() => {
    if (!open || !user || q.trim().length < 2) {
      setHits([]);
      return;
    }
    let cancelled = false;
    const t = setTimeout(async () => {
      setLoading(true);
      const term = `%${q.trim()}%`;
      const [dmRes, grRes] = await Promise.all([
        supabase
          .from("direct_messages")
          .select("id, content, created_at, sender_id, recipient_id")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .ilike("content", term)
          .order("created_at", { ascending: false })
          .limit(30),
        supabase
          .from("group_messages")
          .select("id, content, created_at, group_id")
          .ilike("content", term)
          .order("created_at", { ascending: false })
          .limit(30),
      ]);
      if (cancelled) return;
      const out: Hit[] = [];
      for (const r of (dmRes.data ?? []) as any[]) {
        const peerId = r.sender_id === user.id ? r.recipient_id : r.sender_id;
        const p = userMap.get(peerId);
        if (!p) continue;
        out.push({
          id: r.id,
          kind: "dm",
          content: r.content ?? "",
          created_at: r.created_at,
          peerId,
          peerName: p.display_name ?? "Unknown",
        });
      }
      for (const r of (grRes.data ?? []) as any[]) {
        const g = groupMap.get(r.group_id);
        if (!g) continue;
        out.push({
          id: r.id,
          kind: "group",
          content: r.content ?? "",
          created_at: r.created_at,
          peerId: r.group_id,
          peerName: g.name,
        });
      }
      out.sort((a, b) => b.created_at.localeCompare(a.created_at));
      setHits(out);
      setLoading(false);
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [q, open, user, userMap, groupMap]);

  const openHit = (h: Hit) => {
    if (h.kind === "dm") {
      const p = userMap.get(h.peerId);
      if (p) onOpenDm?.(p);
    } else {
      const g = groupMap.get(h.peerId);
      if (g) onOpenGroup?.(g);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Search className="h-4 w-4" /> Search all chats
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <input
            autoFocus
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search messages across DMs and groups…"
            className="h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="max-h-[60vh] overflow-y-auto rounded-md border divide-y">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : q.trim().length < 2 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Type at least 2 characters to search.
              </p>
            ) : hits.length === 0 ? (
              <p className="p-4 text-center text-sm text-muted-foreground">No matches.</p>
            ) : (
              hits.map((h) => (
                <button
                  key={`${h.kind}-${h.id}`}
                  onClick={() => openHit(h)}
                  className="flex w-full items-start gap-3 p-3 text-left hover:bg-accent"
                >
                  <div className="mt-0.5 rounded-md bg-secondary p-1.5">
                    {h.kind === "dm" ? (
                      <MessageSquare className="h-4 w-4" />
                    ) : (
                      <Users className="h-4 w-4" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-sm font-medium">{h.peerName}</p>
                      <span className="text-[10px] text-muted-foreground">
                        {new Date(h.created_at).toLocaleString()}
                      </span>
                    </div>
                    <p className="truncate text-xs text-muted-foreground">{h.content}</p>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
