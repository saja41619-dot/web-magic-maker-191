import { useEffect, useState } from "react";
import { Phone, VideoIcon, PhoneIncoming, PhoneOutgoing, PhoneMissed, X, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface CallRow {
  id: string;
  room_id: string;
  kind: string;
  media: string;
  caller_id: string;
  callee_id: string | null;
  group_id: string | null;
  status: string;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
}

interface CallWithPeer extends CallRow {
  peer_name: string;
  peer_avatar: string | null;
  direction: "incoming" | "outgoing";
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onCallback?: (peerId: string, media: "voice" | "video") => void;
}

function formatDuration(start: string | null, end: string | null) {
  if (!start || !end) return "—";
  const sec = Math.max(0, Math.round((new Date(end).getTime() - new Date(start).getTime()) / 1000));
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function formatWhen(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  return sameDay
    ? d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    : d.toLocaleDateString([], { month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
}

export function CallHistoryModal({ open, onOpenChange, onCallback }: Props) {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [calls, setCalls] = useState<CallWithPeer[]>([]);

  useEffect(() => {
    if (!open || !user) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from("calls")
        .select("*")
        .or(`caller_id.eq.${user.id},callee_id.eq.${user.id}`)
        .order("created_at", { ascending: false })
        .limit(100);
      if (error || !data) {
        if (!cancelled) {
          setCalls([]);
          setLoading(false);
        }
        return;
      }
      const peerIds = Array.from(
        new Set(
          (data as CallRow[])
            .map((c) => (c.caller_id === user.id ? c.callee_id : c.caller_id))
            .filter((id): id is string => !!id)
        )
      );
      const { data: profiles } = peerIds.length
        ? await supabase.from("profiles").select("id,display_name,avatar_url").in("id", peerIds)
        : { data: [] as { id: string; display_name: string | null; avatar_url: string | null }[] };
      const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));
      const merged: CallWithPeer[] = (data as CallRow[]).map((c) => {
        const outgoing = c.caller_id === user.id;
        const peerId = outgoing ? c.callee_id : c.caller_id;
        const p = peerId ? pmap.get(peerId) : null;
        return {
          ...c,
          peer_name: p?.display_name ?? (c.kind === "group" ? "Group call" : "Unknown"),
          peer_avatar: p?.avatar_url ?? null,
          direction: outgoing ? "outgoing" : "incoming",
        };
      });
      if (!cancelled) {
        setCalls(merged);
        setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, user]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-[101] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="font-display text-lg font-bold">Call history</h3>
          <button onClick={() => onOpenChange(false)} className="p-1 hover:bg-secondary rounded-lg">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="max-h-[60vh] overflow-y-auto p-2">
          {loading ? (
            <div className="flex items-center justify-center py-10 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : calls.length === 0 ? (
            <p className="px-3 py-8 text-center text-sm text-muted-foreground">No calls yet.</p>
          ) : (
            <ul className="divide-y divide-border">
              {calls.map((c) => {
                const missed = c.status === "missed" || (c.direction === "incoming" && c.status === "declined");
                const Icon =
                  missed ? PhoneMissed : c.direction === "incoming" ? PhoneIncoming : PhoneOutgoing;
                const peerId = c.direction === "outgoing" ? c.callee_id : c.caller_id;
                return (
                  <li key={c.id} className="flex items-center gap-3 px-3 py-3 hover:bg-secondary/40 rounded-lg">
                    <div className="h-10 w-10 rounded-full bg-gradient-primary text-white flex items-center justify-center font-semibold shrink-0">
                      {c.peer_avatar ? (
                        <img src={c.peer_avatar} alt="" className="h-full w-full rounded-full object-cover" />
                      ) : (
                        c.peer_name.charAt(0).toUpperCase()
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <p className="font-medium truncate">{c.peer_name}</p>
                        {c.media === "video" ? (
                          <VideoIcon className="h-3.5 w-3.5 text-muted-foreground" />
                        ) : (
                          <Phone className="h-3.5 w-3.5 text-muted-foreground" />
                        )}
                      </div>
                      <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                        <Icon className={cn("h-3.5 w-3.5", missed && "text-destructive")} />
                        <span className={cn(missed && "text-destructive")}>
                          {c.status === "ended"
                            ? `${c.direction === "outgoing" ? "Outgoing" : "Incoming"} · ${formatDuration(c.started_at, c.ended_at)}`
                            : c.status === "missed"
                              ? "Missed"
                              : c.status === "declined"
                                ? c.direction === "outgoing" ? "Declined" : "Declined"
                                : c.status}
                        </span>
                        <span>· {formatWhen(c.created_at)}</span>
                      </div>
                    </div>
                    {peerId && onCallback && c.kind === "dm" && (
                      <button
                        onClick={() => {
                          onOpenChange(false);
                          onCallback(peerId, c.media as "voice" | "video");
                        }}
                        className="p-2 hover:bg-secondary rounded-full text-primary"
                        title="Call back"
                      >
                        {c.media === "video" ? <VideoIcon className="h-4 w-4" /> : <Phone className="h-4 w-4" />}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
