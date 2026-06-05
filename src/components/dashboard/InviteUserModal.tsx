import { useEffect, useState } from "react";
import { Copy, Loader2, Mail, Link2, Share2, Trash2, Check, X, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Invite {
  id: string;
  invite_code: string;
  email: string | null;
  message: string | null;
  status: "pending" | "accepted" | "revoked" | "expired";
  created_at: string;
  expires_at: string;
  accepted_at: string | null;
}

function genCode() {
  const a = Math.random().toString(36).slice(2, 8);
  const b = Math.random().toString(36).slice(2, 8);
  return `${a}${b}`;
}

function buildInviteUrl(code: string) {
  if (typeof window === "undefined") return `/auth?invite=${code}`;
  return `${window.location.origin}/auth?invite=${code}`;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function InviteUserModal({ open, onOpenChange }: Props) {
  const { user } = useAuth();
  const [tab, setTab] = useState<"link" | "email">("link");
  const [linkCode, setLinkCode] = useState<string | null>(null);
  const [linkLoading, setLinkLoading] = useState(false);
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [invites, setInvites] = useState<Invite[]>([]);
  const [loadingList, setLoadingList] = useState(false);

  const loadInvites = async () => {
    if (!user) return;
    setLoadingList(true);
    const { data, error } = await supabase
      .from("user_invites")
      .select("*")
      .eq("inviter_id", user.id)
      .order("created_at", { ascending: false });
    if (error) {
      toast.error(error.message);
    } else {
      setInvites((data ?? []) as Invite[]);
    }
    setLoadingList(false);
  };

  useEffect(() => {
    if (!open || !user) return;
    void loadInvites();
    // Auto-create a personal share link if user doesn't have one
    void ensureShareLink();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, user]);

  const ensureShareLink = async () => {
    if (!user) return;
    setLinkLoading(true);
    const { data } = await supabase
      .from("user_invites")
      .select("invite_code")
      .eq("inviter_id", user.id)
      .is("email", null)
      .eq("status", "pending")
      .gt("expires_at", new Date().toISOString())
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (data?.invite_code) {
      setLinkCode(data.invite_code);
    } else {
      const code = genCode();
      const { error } = await supabase.from("user_invites").insert({
        inviter_id: user.id,
        invite_code: code,
      });
      if (error) toast.error(error.message);
      else setLinkCode(code);
    }
    setLinkLoading(false);
  };

  const regenerateLink = async () => {
    if (!user) return;
    setLinkLoading(true);
    const code = genCode();
    const { error } = await supabase.from("user_invites").insert({
      inviter_id: user.id,
      invite_code: code,
    });
    if (error) toast.error(error.message);
    else {
      setLinkCode(code);
      toast.success("New invite link generated");
      void loadInvites();
    }
    setLinkLoading(false);
  };

  const copyLink = async (code: string) => {
    const url = buildInviteUrl(code);
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied");
    } catch {
      toast.error("Copy failed");
    }
  };

  const shareLink = async (code: string) => {
    const url = buildInviteUrl(code);
    if (typeof navigator !== "undefined" && (navigator as any).share) {
      try {
        await (navigator as any).share({
          title: "Join me on Connect",
          text: "I'm inviting you to join me on Connect.",
          url,
        });
      } catch {
        /* user cancelled */
      }
    } else {
      void copyLink(code);
    }
  };

  const sendEmailInvite = async () => {
    if (!user) return;
    const trimmed = email.trim().toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      toast.error("Enter a valid email");
      return;
    }
    setSending(true);
    const code = genCode();
    const { error } = await supabase.from("user_invites").insert({
      inviter_id: user.id,
      invite_code: code,
      email: trimmed,
      message: message.trim() || null,
    });
    setSending(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    toast.success(`Invite created for ${trimmed}`);
    void copyLink(code);
    setEmail("");
    setMessage("");
    void loadInvites();
  };

  const revoke = async (id: string) => {
    const { error } = await supabase
      .from("user_invites")
      .update({ status: "revoked" })
      .eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Invite revoked");
      void loadInvites();
    }
  };

  const statusBadge = (inv: Invite) => {
    const expired = new Date(inv.expires_at) < new Date() && inv.status === "pending";
    const s = expired ? "expired" : inv.status;
    const map: Record<string, string> = {
      pending: "bg-amber-100 text-amber-800",
      accepted: "bg-emerald-100 text-emerald-800",
      revoked: "bg-zinc-200 text-zinc-700",
      expired: "bg-red-100 text-red-700",
    };
    return (
      <span className={cn("rounded-full px-2 py-0.5 text-[10px] font-medium uppercase", map[s])}>
        {s}
      </span>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Invite to Connect</DialogTitle>
          <DialogDescription>
            Share an invite link or send an email invite. Links expire in 7 days.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-3">
          <Label>Your invite link</Label>
          <div className="flex gap-2">
            <Input
              readOnly
              value={linkCode ? buildInviteUrl(linkCode) : ""}
              placeholder={linkLoading ? "Generating…" : ""}
              onFocus={(e) => e.currentTarget.select()}
            />
            <Button
              variant="outline"
              size="icon"
              disabled={!linkCode}
              onClick={() => linkCode && copyLink(linkCode)}
              title="Copy"
            >
              <Copy className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              disabled={!linkCode}
              onClick={() => linkCode && shareLink(linkCode)}
              title="Share"
            >
              <Share2 className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Anyone with this link can sign up and connect with you directly.
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={regenerateLink}
            disabled={linkLoading}
            className="text-xs"
          >
            {linkLoading ? (
              <Loader2 className="mr-1.5 h-3 w-3 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-3 w-3" />
            )}
            Generate new link
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
