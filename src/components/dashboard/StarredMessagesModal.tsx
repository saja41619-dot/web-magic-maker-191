import { useEffect, useMemo, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { Loader2, Star, MessageSquare, Users } from "lucide-react";
import { toast } from "sonner";

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

interface StarredItem {
  star_id: string;
  message_id: string;
  message_type: "dm" | "group";
  created_at: string;
  content: string;
  msg_created_at: string;
  peerId: string;
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

export function StarredMessagesModal({
  open,
  onOpenChange,
  users,
  groups,
  onOpenDm,
  onOpenGroup,
}: Props) {
  const { user } = useAuth();
  const [items, setItems] = useState<StarredItem[]>([]);
  const [loading, setLoading] = useState(false);

  const userMap = useMemo(() => new Map(users.map((u) => [u.id, u])), [users]);
  const groupMap = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data: stars } = await supabase
        .from("starred_messages" as any)
        .select("id, message_id, message_type, created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(100);
      const rows = (stars ?? []) as any[];
      const dmIds = rows.filter((r) => r.message_type === "dm").map((r) => r.message_id);
      const grIds = rows.filter((r) => r.message_type === "group").map((r) => r.message_id);
      const [dmRes, grRes] = await Promise.all([
        dmIds.length
          ? supabase
              .from("direct_messages")
              .select("id, content, created_at, sender_id, recipient_id")
              .in("id", dmIds)
          : Promise.resolve({ data: [] as any[] }),
        grIds.length
          ? supabase
              .from("group_messages")
              .select("id, content, created_at, group_id")
              .in("id", grIds)
          : Promise.resolve({ data: [] as any[] }),
      ]);
      if (cancelled) return;
      const dmMap = new Map<string, any>((dmRes.data ?? []).map((r: any) => [r.id, r]));
      const grMap = new Map<string, any>((grRes.data ?? []).map((r: any) => [r.id, r]));
      const out: StarredItem[] = [];
      for (const s of rows) {
        if (s.message_type === "dm") {
          const m = dmMap.get(s.message_id);
          if (!m) continue;
          const peerId = m.sender_id === user.id ? m.recipient_id : m.sender_id;
          const p = userMap.get(peerId);
          out.push({
            star_id: s.id,
            message_id: s.message_id,
            message_type: "dm",
            created_at: s.created_at,
            content: m.content ?? "",
            msg_created_at: m.created_at,
            peerId,
            peerName: p?.display_name ?? "Unknown",
          });
        } else {
          const m = grMap.get(s.message_id);
          if (!m) continue;
          const g = groupMap.get(m.group_id);
          out.push({
            star_id: s.id,
            message_id: s.message_id,
            message_type: "group",
            created_at: s.created_at,
            content: m.content ?? "",
            msg_created_at: m.created_at,
            peerId: m.group_id,
            peerName: g?.name ?? "Group",
          });
        }
      }
      setItems(out);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user, userMap, groupMap]);

  const unstar = async (it: StarredItem) => {
    if (!user) return;
    await supabase.from("starred_messages" as any).delete().eq("id", it.star_id);
    setItems((prev) => prev.filter((x) => x.star_id !== it.star_id));
    toast.success("Removed from starred");
  };

  const openItem = (it: StarredItem) => {
    if (it.message_type === "dm") {
      const p = userMap.get(it.peerId);
      if (p) onOpenDm?.(p);
    } else {
      const g = groupMap.get(it.peerId);
      if (g) onOpenGroup?.(g);
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" /> Starred messages
          </DialogTitle>
        </DialogHeader>
        <div className="max-h-[60vh] overflow-y-auto rounded-md border divide-y">
          {loading ? (
            <div className="flex justify-center p-6">
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            </div>
          ) : items.length === 0 ? (
            <p className="p-4 text-center text-sm text-muted-foreground">
              No starred messages yet. Tap the star on any message to save it here.
            </p>
          ) : (
            items.map((it) => (
              <div key={it.star_id} className="flex items-start gap-3 p-3 hover:bg-accent">
                <div className="mt-0.5 rounded-md bg-secondary p-1.5">
                  {it.message_type === "dm" ? (
                    <MessageSquare className="h-4 w-4" />
                  ) : (
                    <Users className="h-4 w-4" />
                  )}
                </div>
                <button
                  onClick={() => openItem(it)}
                  className="flex-1 min-w-0 text-left"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="truncate text-sm font-medium">{it.peerName}</p>
                    <span className="text-[10px] text-muted-foreground">
                      {new Date(it.msg_created_at).toLocaleString()}
                    </span>
                  </div>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.content || "(media)"}
                  </p>
                </button>
                <button
                  onClick={() => unstar(it)}
                  className="rounded p-1 hover:bg-secondary"
                  title="Unstar"
                  aria-label="Unstar"
                >
                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                </button>
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
