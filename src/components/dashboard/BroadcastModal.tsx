import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";
import { Loader2, Megaphone } from "lucide-react";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  users: Profile[];
}

export function BroadcastModal({ open, onOpenChange, users }: Props) {
  const { user } = useAuth();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);

  const toggle = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const send = async () => {
    if (!user) return;
    const content = text.trim();
    if (!content) {
      toast.error("Type a message");
      return;
    }
    if (selected.size === 0) {
      toast.error("Pick at least one recipient");
      return;
    }
    setSending(true);
    try {
      const rows = Array.from(selected).map((rid) => ({
        sender_id: user.id,
        recipient_id: rid,
        content,
        is_broadcast: true,
      }));
      const { error } = await supabase.from("direct_messages").insert(rows);
      if (error) throw error;
      toast.success(`Broadcast sent to ${selected.size}`);
      setText("");
      setSelected(new Set());
      onOpenChange(false);
    } catch (e: any) {
      toast.error(e?.message ?? "Failed to send");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-4 w-4" /> New broadcast
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <Textarea
            placeholder="Broadcast message…"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={3}
          />
          <div>
            <p className="text-xs font-semibold mb-1">
              Recipients ({selected.size}/{users.length})
            </p>
            <div className="max-h-64 overflow-y-auto rounded-md border border-border divide-y divide-border">
              {users.length === 0 && (
                <p className="p-3 text-center text-xs text-muted-foreground">No contacts.</p>
              )}
              {users.map((u) => {
                const initial = (u.display_name ?? "U").charAt(0).toUpperCase();
                return (
                  <label
                    key={u.id}
                    className="flex items-center gap-3 p-2 hover:bg-secondary/40 cursor-pointer"
                  >
                    <Checkbox checked={selected.has(u.id)} onCheckedChange={() => toggle(u.id)} />
                    <div className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-xs font-bold text-primary-foreground">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        initial
                      )}
                    </div>
                    <span className="text-sm truncate flex-1">{u.display_name ?? "User"}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={send} disabled={sending}>
            {sending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Megaphone className="h-4 w-4 mr-1" />}
            Send broadcast
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
