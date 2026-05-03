import { useEffect, useMemo, useRef, useState } from "react";
import {
  Loader2,
  Send,
  Smile,
  Paperclip,
  Image as ImageIcon,
  Mic,
  Square,
  Search,
  ArrowLeft,
  Check,
  CheckCheck,
  X,
  FileText,
  Play,
  Pause,
  MoreVertical,
  Trash2,
  Copy,
  Reply,
  Info,
  Clock,
  Star,
  Forward,
  Image as ImageCardIcon,
  Phone,
  VideoIcon,
  Edit,
  Share,
  Ban,
  Flag,
  Pin,
  Timer,
  Volume2,
  ChevronDown,
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePresenceHeartbeat } from "@/lib/usePresence";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface DM {
  id: string;
  sender_id: string;
  recipient_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "file" | "voice" | null;
  attachment_name: string | null;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  is_pinned?: boolean;
  is_starred?: boolean;
  edited_at?: string | null;
  disappear_at?: string | null;
}

interface Presence {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

const TYPING_CHANNEL = (a: string, b: string) =>
  `typing:${[a, b].sort().join(":")}`;

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function formatDate(iso: string) {
  const date = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (date.toDateString() === today.toDateString()) return "Today";
  if (date.toDateString() === yesterday.toDateString()) return "Yesterday";
  return date.toLocaleDateString();
}

function formatLastSeen(iso?: string) {
  if (!iso) return "offline";
  const diff = Date.now() - new Date(iso).getTime();
  if (diff < 60_000) return "just now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`;
  return new Date(iso).toLocaleDateString();
}

export function ConnectTab() {
  usePresenceHeartbeat();
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [lastMessages, setLastMessages] = useState<Record<string, DM>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [activePeer, setActivePeer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  // Load users + presence + summaries
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [{ data: profiles }, { data: pres }, { data: msgs }] = await Promise.all([
        supabase.from("profiles").select("id, display_name, avatar_url").neq("id", user.id),
        supabase.from("user_presence").select("user_id, is_online, last_seen_at"),
        supabase
          .from("direct_messages")
          .select("*")
          .or(`sender_id.eq.${user.id},recipient_id.eq.${user.id}`)
          .order("created_at", { ascending: false })
          .limit(500),
      ]);
      if (cancelled) return;
      setUsers(profiles ?? []);
      const pmap: Record<string, Presence> = {};
      (pres ?? []).forEach((p) => (pmap[p.user_id] = p as Presence));
      setPresence(pmap);

      const last: Record<string, DM> = {};
      const un: Record<string, number> = {};
      (msgs ?? []).forEach((m) => {
        const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
        if (!last[peer]) last[peer] = m as DM;
        if (m.recipient_id === user.id && !m.read_at) un[peer] = (un[peer] ?? 0) + 1;
      });
      setLastMessages(last);
      setUnread(un);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  // Realtime: presence + new messages -> refresh summaries
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel("chat-global")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "user_presence" },
        (payload) => {
          const row = payload.new as Presence;
          if (row?.user_id) setPresence((p) => ({ ...p, [row.user_id]: row }));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
          if (m.sender_id !== user.id && m.recipient_id !== user.id) return;
          const peer = m.sender_id === user.id ? m.recipient_id : m.sender_id;
          setLastMessages((prev) => ({ ...prev, [peer]: m }));
          if (m.recipient_id === user.id && (!activePeer || activePeer.id !== m.sender_id)) {
            setUnread((u) => ({ ...u, [peer]: (u[peer] ?? 0) + 1 }));
          }
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [user, activePeer]);

  const filteredUsers = useMemo(() => {
    const q = search.trim().toLowerCase();
    const sorted = [...users].sort((a, b) => {
      const ta = lastMessages[a.id]?.created_at ?? "";
      const tb = lastMessages[b.id]?.created_at ?? "";
      return tb.localeCompare(ta);
    });
    if (!q) return sorted;
    return sorted.filter((u) =>
      (u.display_name ?? "").toLowerCase().includes(q),
    );
  }, [users, search, lastMessages]);

  const openPeer = (p: Profile) => {
    setActivePeer(p);
    setUnread((u) => ({ ...u, [p.id]: 0 }));
  };

  return (
    <section className="overflow-hidden rounded-2xl border border-border bg-card shadow-elegant">
      <div className="grid h-[calc(100vh-220px)] min-h-[500px] grid-cols-1 md:grid-cols-[320px_1fr]">
        {/* Sidebar list */}
        <aside
          className={cn(
            "flex flex-col border-r border-border bg-background/30",
            activePeer && "hidden md:flex",
          )}
        >
          <div className="border-b border-border p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search users…"
                className="h-10 w-full rounded-xl border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : filteredUsers.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No users found.
              </p>
            ) : (
              filteredUsers.map((p) => {
                const last = lastMessages[p.id];
                const isOnline = presence[p.id]?.is_online;
                const count = unread[p.id] ?? 0;
                const initial = (p.display_name ?? "U").charAt(0).toUpperCase();
                return (
                  <button
                    key={p.id}
                    onClick={() => openPeer(p)}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-border/50 p-3 text-left transition-smooth hover:bg-secondary/40",
                      activePeer?.id === p.id && "bg-secondary/60",
                    )}
                  >
                    <div className="relative">
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
                        {p.avatar_url ? (
                          <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          initial
                        )}
                      </div>
                      {isOnline && (
                        <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full border-2 border-card bg-green-500" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-semibold">
                          {p.display_name ?? "User"}
                        </p>
                        {last && (
                          <span className="shrink-0 text-[10px] text-muted-foreground">
                            {formatTime(last.created_at)}
                          </span>
                        )}
                      </div>
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-xs text-muted-foreground">
                          {last
                            ? last.content ??
                              (last.attachment_type === "image"
                                ? "📷 Photo"
                                : last.attachment_type === "voice"
                                  ? "🎤 Voice message"
                                  : "📎 File")
                            : "Say hi 👋"}
                        </p>
                        {count > 0 && (
                          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                            {count}
                          </span>
                        )}
                      </div>
                    </div>
                  </button>
                );
              })
            )}
          </div>
        </aside>

        {/* Chat window */}
        <div className={cn("flex flex-col", !activePeer && "hidden md:flex")}>
          {activePeer ? (
            <ChatWindow
              key={activePeer.id}
              peer={activePeer}
              presence={presence[activePeer.id]}
              onBack={() => setActivePeer(null)}
            />
          ) : (
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center">
              <div className="mb-3 rounded-full bg-primary/10 p-4">
                <Send className="h-6 w-6 text-primary" />
              </div>
              <h3 className="font-display text-lg font-semibold">Your messages</h3>
              <p className="mt-1 text-sm text-muted-foreground">
                Select a user to start chatting.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function ChatWindow({
  peer,
  presence,
  onBack,
}: {
  peer: Profile;
  presence?: Presence;
  onBack: () => void;
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [reactions, setReactions] = useState<Record<string, string[]>>({});
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [pinnedMessages, setPinnedMessages] = useState<Record<string, boolean>>({});
  const [starredMessages, setStarredMessages] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<DM | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockList, setBlockList] = useState<string[]>([]);
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState(1);
  const [showDisappearingOptions, setShowDisappearingOptions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  // Fetch messages
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(
          `and(sender_id.eq.${user.id},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${user.id})`,
        )
        .order("created_at", { ascending: true })
        .limit(500);
      if (cancelled) return;
      setMessages((data ?? []) as DM[]);
      // mark all from peer as read
      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", peer.id)
        .eq("recipient_id", user.id)
        .is("read_at", null);
    })();
    return () => {
      cancelled = true;
    };
  }, [user, peer.id]);

  // Realtime messages + typing
  useEffect(() => {
    if (!user) return;
    const msgCh = supabase
      .channel(`dm:${peer.id}`)
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
          const inThread =
            (m.sender_id === user.id && m.recipient_id === peer.id) ||
            (m.sender_id === peer.id && m.recipient_id === user.id);
          if (!inThread) return;
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id === peer.id) {
            void supabase
              .from("direct_messages")
              .update({ read_at: new Date().toISOString() })
              .eq("id", m.id);
          }
        },
      )
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
          setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
        },
      )
      .subscribe();

    const typingCh = supabase.channel(TYPING_CHANNEL(user.id, peer.id), {
      config: { broadcast: { self: false } },
    });
    typingCh
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.from === peer.id) {
          setPeerTyping(true);
          window.clearTimeout((typingCh as any)._t);
          (typingCh as any)._t = window.setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .subscribe();
    typingChannelRef.current = typingCh;

    return () => {
      void supabase.removeChannel(msgCh);
      void supabase.removeChannel(typingCh);
      typingChannelRef.current = null;
    };
  }, [user, peer.id]);

  // Scroll to bottom on new messages
  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, peerTyping]);

  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: user?.id },
    });
  };

  const deleteMessage = async (msgId: string) => {
    try {
      await supabase.from("direct_messages").delete().eq("id", msgId);
      setMessages((prev) => prev.filter((m) => m.id !== msgId));
    } catch (err) {
      console.error("Delete error:", err);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setReactions((prev) => ({
      ...prev,
      [messageId]: [...(prev[messageId] ?? []), emoji],
    }));
  };

  const editMessage = async (msgId: string) => {
    if (!editingText.trim()) return;
    try {
      await supabase
        .from("direct_messages")
        .update({ content: editingText, edited_at: new Date().toISOString() })
        .eq("id", msgId);
      setMessages((prev) =>
        prev.map((m) =>
          m.id === msgId
            ? { ...m, content: editingText, edited_at: new Date().toISOString() }
            : m
        )
      );
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  const togglePin = (msgId: string) => {
    setPinnedMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const toggleStar = (msgId: string) => {
    setStarredMessages((prev) => ({
      ...prev,
      [msgId]: !prev[msgId],
    }));
  };

  const forwardMessage = async (msgId: string) => {
    const message = messages.find((m) => m.id === msgId);
    if (!message) return;
    const forwardText = `[Forwarded]\n${message.content || "(Attachment)"}`;
    await sendMessage({ content: forwardText });
  };

  const blockUser = async () => {
    setIsBlocked(true);
    setBlockList((prev) => [...prev, peer.id]);
  };

  const unblockUser = async () => {
    setIsBlocked(false);
    setBlockList((prev) => prev.filter((id) => id !== peer.id));
  };

  const reportMessage = async (msgId: string) => {
    console.log("Message reported:", msgId);
    alert("Message reported. Our team will review it.");
  };

  const sendMessage = async (overrides?: Partial<DM>) => {
    if (!user) return;
    const content = (overrides?.content ?? text).trim();
    if (!content && !overrides?.attachment_url) return;
    setSending(true);
    try {
      const payload = {
        sender_id: user.id,
        recipient_id: peer.id,
        content: overrides?.attachment_url ? overrides?.content ?? null : content || null,
        attachment_url: overrides?.attachment_url ?? null,
        attachment_type: overrides?.attachment_type ?? null,
        attachment_name: overrides?.attachment_name ?? null,
      };
      const { data, error } = await supabase
        .from("direct_messages")
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      if (data) setMessages((prev) => (prev.some((x) => x.id === data.id) ? prev : [...prev, data as DM]));
      if (!overrides?.attachment_url) setText("");
      setShowEmoji(false);
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File, type: "image" | "file" | "voice") => {
    if (!user) return;
    setSending(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from("chat-attachments")
        .upload(path, file, { contentType: file.type, upsert: false });
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60 * 24 * 365);
      const url = signed?.signedUrl ?? "";
      await sendMessage({
        attachment_url: url,
        attachment_type: type,
        attachment_name: file.name,
      });
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = useMemo(() => {
    if (!messageSearch.trim()) return messages;
    const q = messageSearch.trim().toLowerCase();
    return messages.filter((m) => m.content?.toLowerCase().includes(q));
  }, [messages, messageSearch]);

  const mediaMessages = useMemo(() => {
    return messages.filter((m) => m.attachment_type === "image");
  }, [messages]);

  const initial = (peer.display_name ?? "U").charAt(0).toUpperCase();
  const isOnline = presence?.is_online;

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/60 p-3">
        <div className="flex items-center gap-3 flex-1">
          <button
            onClick={onBack}
            className="rounded-lg p-1.5 hover:bg-secondary md:hidden"
            aria-label="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </button>
          <div className="relative">
            <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
              {peer.avatar_url ? (
                <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            {isOnline && (
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold">{peer.display_name ?? "User"}</p>
            <p className="truncate text-xs text-muted-foreground">
              {isBlocked ? (
                <span className="text-destructive">Blocked</span>
              ) : peerTyping ? (
                "typing…"
              ) : isOnline ? (
                "online"
              ) : (
                `last seen ${formatLastSeen(presence?.last_seen_at)}`
              )}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {isBlocked && (
            <button
              onClick={unblockUser}
              className="rounded-lg p-2 hover:bg-secondary text-destructive hover:text-destructive/80 transition-colors"
              aria-label="Unblock"
            >
              <Ban className="h-5 w-5" />
            </button>
          )}
          <button
            onClick={() => setShowMediaGallery(!showMediaGallery)}
            className="rounded-lg p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Media"
          >
            <ImageCardIcon className="h-5 w-5" />
          </button>
          <button
            onClick={() => setShowInfo(!showInfo)}
            className="rounded-lg p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Info"
          >
            <Info className="h-5 w-5" />
          </button>
        </div>
      </div>

      {/* Info Panel */}
      {showInfo && (
        <div className="border-b border-border bg-background/50 p-4 space-y-4 max-h-96 overflow-y-auto">
          <div className="flex items-center gap-4">
            <div className="flex h-16 w-16 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground">
              {peer.avatar_url ? (
                <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <div>
              <h3 className="font-semibold">{peer.display_name ?? "User"}</h3>
              <p className="text-xs text-muted-foreground">
                {isOnline ? "Active now" : `Last seen ${formatLastSeen(presence?.last_seen_at)}`}
              </p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <button className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors">
              <Phone className="h-4 w-4" />
              <span className="text-xs font-medium">Voice call</span>
            </button>
            <button className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors">
              <VideoIcon className="h-4 w-4" />
              <span className="text-xs font-medium">Video call</span>
            </button>
          </div>

          {/* Pinned Messages */}
          {Object.entries(pinnedMessages).some(([_, pinned]) => pinned) && (
            <div className="space-y-2">
              <h4 className="text-xs font-semibold text-muted-foreground">PINNED MESSAGES</h4>
              {messages
                .filter((m) => pinnedMessages[m.id])
                .map((m) => (
                  <div key={m.id} className="bg-secondary/50 rounded-lg p-2 text-xs line-clamp-2 cursor-pointer hover:bg-secondary transition-colors">
                    {m.content || "(Attachment)"}
                  </div>
                ))}
            </div>
          )}

          {/* Actions */}
          <div className="space-y-2 pt-2 border-t border-border">
            <button
              onClick={isBlocked ? unblockUser : blockUser}
              className={cn(
                "flex w-full items-center justify-center gap-2 rounded-lg p-2 text-xs font-medium transition-colors",
                isBlocked
                  ? "bg-primary/10 text-primary hover:bg-primary/20"
                  : "bg-destructive/10 text-destructive hover:bg-destructive/20"
              )}
            >
              <Ban className="h-4 w-4" />
              {isBlocked ? "Unblock User" : "Block User"}
            </button>
            <button className="flex w-full items-center justify-center gap-2 rounded-lg bg-destructive/10 p-2 text-xs font-medium text-destructive hover:bg-destructive/20 transition-colors">
              <Flag className="h-4 w-4" />
              Report User
            </button>
          </div>
        </div>
      )}

      {/* Message Search */}
      <div className="border-b border-border bg-background/50 p-3">
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            value={messageSearch}
            onChange={(e) => setMessageSearch(e.target.value)}
            placeholder="Search in conversation…"
            className="h-9 w-full rounded-lg border border-border bg-card pl-9 pr-3 text-sm outline-none focus:border-primary"
          />
        </div>
      </div>

      {/* Media Gallery */}
      {showMediaGallery && mediaMessages.length > 0 && (
        <div className="border-b border-border bg-background/50 p-3">
          <div className="grid grid-cols-4 gap-2 max-h-32 overflow-y-auto">
            {mediaMessages.map((m) => (
              <a
                key={m.id}
                href={m.attachment_url ?? "#"}
                target="_blank"
                rel="noreferrer"
                className="relative group overflow-hidden rounded-lg aspect-square bg-secondary"
              >
                {m.attachment_url && (
                  <img
                    src={m.attachment_url}
                    alt="message"
                    className="w-full h-full object-cover group-hover:opacity-75 transition-opacity"
                  />
                )}
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 space-y-2 overflow-y-auto bg-gradient-to-b from-background/50 to-background/20 p-4"
      >
        {filteredMessages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-sm text-muted-foreground">
              {messageSearch ? "No messages found" : "Start a conversation"}
            </p>
          </div>
        ) : (
          <>
            {filteredMessages.map((m, idx) => {
              const mine = m.sender_id === user?.id;
              const showDate =
                idx === 0 ||
                formatDate(m.created_at) !== formatDate(filteredMessages[idx - 1]!.created_at);

              return (
                <div key={m.id}>
                  {showDate && (
                    <div className="flex items-center gap-2 my-4">
                      <div className="flex-1 h-px bg-border" />
                      <span className="text-xs text-muted-foreground">
                        {formatDate(m.created_at)}
                      </span>
                      <div className="flex-1 h-px bg-border" />
                    </div>
                  )}
                  <MessageItem
                    message={m}
                    mine={mine}
                    onDelete={() => deleteMessage(m.id)}
                    onCopy={() => copyToClipboard(m.content || "")}
                    onReact={(emoji) => addReaction(m.id, emoji)}
                    reactions={reactions[m.id] ?? []}
                    onPin={() => togglePin(m.id)}
                    onStar={() => toggleStar(m.id)}
                    onForward={() => forwardMessage(m.id)}
                    onReply={() => setReplyingTo(m)}
                    onEdit={() => {
                      setEditingId(m.id);
                      setEditingText(m.content || "");
                    }}
                    onReport={() => reportMessage(m.id)}
                    isPinned={pinnedMessages[m.id] ?? false}
                    isStarred={starredMessages[m.id] ?? false}
                  />
                </div>
              );
            })}
            {peerTyping && (
              <div className="flex justify-start">
                <div className="rounded-2xl rounded-bl-sm bg-card px-3 py-2 text-xs text-muted-foreground shadow-sm">
                  <span className="inline-flex gap-1">
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
                    <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
                  </span>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Composer */}
      <div className="relative border-t border-border bg-card p-3 space-y-2">
        {/* Reply Preview */}
        {replyingTo && (
          <div className="flex items-center gap-2 bg-primary/10 p-2 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-primary font-medium">Replying to {peer.display_name}</p>
              <p className="text-xs text-muted-foreground line-clamp-1">
                {replyingTo.content || "(Attachment)"}
              </p>
            </div>
            <button
              onClick={() => setReplyingTo(null)}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Edit Preview */}
        {editingId && (
          <div className="flex items-center gap-2 bg-yellow-500/10 p-2 rounded-lg">
            <div className="flex-1 min-w-0">
              <p className="text-xs text-yellow-600 font-medium">Editing message</p>
            </div>
            <button
              onClick={() => {
                setEditingId(null);
                setEditingText("");
              }}
              className="text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {/* Disappearing Message Timer */}
        {showDisappearingOptions && (
          <div className="flex items-center gap-2 bg-background border border-border p-2 rounded-lg">
            <Timer className="h-4 w-4 text-muted-foreground" />
            <select className="text-xs bg-transparent border-0 outline-none">
              <option value="">Disappearing messages</option>
              <option value="60">1 minute</option>
              <option value="3600">1 hour</option>
              <option value="86400">1 day</option>
              <option value="604800">1 week</option>
            </select>
            <button
              onClick={() => setShowDisappearingOptions(false)}
              className="ml-auto text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {showEmoji && (
          <div className="absolute bottom-full left-2 z-10 mb-2">
            <EmojiPicker
              theme={Theme.AUTO}
              onEmojiClick={(e) => {
                if (editingId) {
                  setEditingText((t) => t + e.emoji);
                } else {
                  setText((t) => t + e.emoji);
                }
              }}
              width={320}
              height={380}
            />
          </div>
        )}

        <div className="flex items-end gap-2">
          <button
            type="button"
            onClick={() => setShowEmoji((s) => !s)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Emoji"
          >
            {showEmoji ? <X className="h-5 w-5" /> : <Smile className="h-5 w-5" />}
          </button>
          <button
            type="button"
            onClick={() => imageInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Image"
          >
            <ImageIcon className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="File"
          >
            <Paperclip className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => setShowDisappearingOptions(!showDisappearingOptions)}
            className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-muted-foreground hover:bg-secondary hover:text-foreground"
            aria-label="Disappearing"
          >
            <Timer className="h-5 w-5" />
          </button>
          <input
            ref={imageInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndSend(f, "image");
              e.target.value = "";
            }}
          />
          <input
            ref={fileInputRef}
            type="file"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void uploadAndSend(f, "file");
              e.target.value = "";
            }}
          />

          <textarea
            value={editingId ? editingText : text}
            onChange={(e) => {
              if (editingId) {
                setEditingText(e.target.value);
              } else {
                setText(e.target.value);
              }
              sendTyping();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                if (editingId) {
                  void editMessage(editingId);
                } else {
                  void sendMessage();
                }
              }
            }}
            placeholder={editingId ? "Edit message…" : "Type a message…"}
            rows={1}
            className="max-h-32 min-h-10 flex-1 resize-none rounded-2xl border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />

          {(text.trim() || editingId) ? (
            <button
              onClick={() => {
                if (editingId) {
                  void editMessage(editingId);
                } else {
                  void sendMessage();
                }
              }}
              disabled={sending}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
              aria-label={editingId ? "Save" : "Send"}
            >
              {sending ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : editingId ? (
                <Check className="h-4 w-4" />
              ) : (
                <Send className="h-4 w-4" />
              )}
            </button>
          ) : (
            <VoiceRecorder onRecorded={(f) => uploadAndSend(f, "voice")} />
          )}
        </div>
      </div>
    </>
  );
}

function MessageItem({
  message,
  mine,
  onDelete,
  onCopy,
  onReact,
  reactions,
  onPin,
  onStar,
  onForward,
  onReply,
  onEdit,
  onReport,
  isPinned,
  isStarred,
}: {
  message: DM;
  mine: boolean;
  onDelete: () => void;
  onCopy: () => void;
  onReact: (emoji: string) => void;
  reactions: string[];
  onPin: () => void;
  onStar: () => void;
  onForward: () => void;
  onReply: () => void;
  onEdit: () => void;
  onReport: () => void;
  isPinned: boolean;
  isStarred: boolean;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1);

  return (
    <div className={cn("flex", mine ? "justify-end" : "justify-start")}>
      <div className="relative group">
        <div
          className={cn(
            "max-w-[78%] rounded-2xl px-3 py-2 text-sm shadow-sm",
            mine
              ? "rounded-br-sm bg-gradient-primary text-primary-foreground"
              : "rounded-bl-sm bg-card text-foreground",
          )}
        >
          {isPinned && (
            <div className="flex items-center gap-1 mb-1 text-[10px] opacity-75">
              <Pin className="h-3 w-3" /> Pinned
            </div>
          )}
          {message.attachment_type === "image" && message.attachment_url && (
            <a href={message.attachment_url} target="_blank" rel="noreferrer">
              <img
                src={message.attachment_url}
                alt={message.attachment_name ?? "image"}
                className="mb-1 max-h-64 rounded-lg object-cover hover:opacity-90 transition-opacity"
              />
            </a>
          )}
          {message.attachment_type === "voice" && message.attachment_url && (
            <VoicePlayer url={message.attachment_url} mine={mine} speed={voiceSpeed} />
          )}
          {message.attachment_type === "file" && message.attachment_url && (
            <a
              href={message.attachment_url}
              target="_blank"
              rel="noreferrer"
              className={cn(
                "mb-1 flex items-center gap-2 rounded-lg p-2 underline-offset-2 hover:underline",
                mine ? "bg-white/10" : "bg-secondary",
              )}
            >
              <FileText className="h-4 w-4" />
              <span className="truncate">{message.attachment_name ?? "File"}</span>
            </a>
          )}
          {message.content && <p className="whitespace-pre-wrap break-words">{message.content}</p>}
          <div
            className={cn(
              "mt-1 flex items-center justify-end gap-1 text-[10px]",
              mine ? "text-primary-foreground/70" : "text-muted-foreground",
            )}
          >
            <span>{formatTime(message.created_at)}</span>
            {message.edited_at && <span className="text-[8px]">(edited)</span>}
            {mine &&
              (message.read_at ? (
                <CheckCheck className="h-3 w-3" />
              ) : (
                <Check className="h-3 w-3" />
              ))}
          </div>
        </div>

        {/* Message Actions */}
        <div className="absolute right-0 top-0 -translate-y-full -translate-x-2 opacity-0 group-hover:opacity-100 transition-opacity mb-2 flex items-center gap-1 flex-wrap justify-end">
          {QUICK_REACTIONS.map((emoji) => (
            <button
              key={emoji}
              onClick={() => onReact(emoji)}
              className="flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border hover:bg-secondary text-sm"
              title="React"
            >
              {emoji}
            </button>
          ))}
          <button
            onClick={onPin}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border hover:bg-secondary",
              isPinned && "bg-primary text-primary-foreground"
            )}
            title="Pin"
          >
            <Pin className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={onStar}
            className={cn(
              "flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border hover:bg-secondary",
              isStarred && "bg-yellow-500 text-white"
            )}
            title="Star"
          >
            <Star className="h-3.5 w-3.5" />
          </button>
          <button
            onClick={() => setShowMenu(!showMenu)}
            className="flex h-7 w-7 items-center justify-center rounded-full bg-background border border-border hover:bg-secondary"
            aria-label="More"
          >
            <MoreVertical className="h-3.5 w-3.5" />
          </button>
        </div>

        {/* Context Menu */}
        {showMenu && (
          <div className="absolute right-0 top-full mt-1 z-20 rounded-lg border border-border bg-card shadow-lg overflow-hidden">
            <button
              onClick={() => {
                onReply();
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary w-full text-left transition-colors"
            >
              <Reply className="h-3.5 w-3.5" />
              Reply
            </button>
            <button
              onClick={() => {
                onForward();
                setShowMenu(false);
              }}
              className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary w-full text-left transition-colors"
            >
              <Forward className="h-3.5 w-3.5" />
              Forward
            </button>
            {message.content && (
              <button
                onClick={() => {
                  onCopy();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary w-full text-left transition-colors"
              >
                <Copy className="h-3.5 w-3.5" />
                Copy
              </button>
            )}
            {mine && (
              <button
                onClick={() => {
                  onEdit();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs hover:bg-secondary w-full text-left transition-colors"
              >
                <Edit className="h-3.5 w-3.5" />
                Edit
              </button>
            )}
            {mine && (
              <button
                onClick={() => {
                  onDelete();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 w-full text-left transition-colors"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete
              </button>
            )}
            {!mine && (
              <button
                onClick={() => {
                  onReport();
                  setShowMenu(false);
                }}
                className="flex items-center gap-2 px-3 py-2 text-xs text-destructive hover:bg-destructive/10 w-full text-left transition-colors"
              >
                <Flag className="h-3.5 w-3.5" />
                Report
              </button>
            )}
          </div>
        )}

        {/* Reactions Display */}
        {reactions.length > 0 && (
          <div className="flex flex-wrap gap-1 mt-1">
            {reactions.map((emoji, idx) => (
              <span
                key={idx}
                className={cn(
                  "inline-flex items-center justify-center h-6 rounded-full text-xs px-1.5",
                  mine ? "bg-white/20" : "bg-primary/20",
                )}
              >
                {emoji}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

function VoiceRecorder({ onRecorded }: { onRecorded: (file: File) => void }) {
  const [recording, setRecording] = useState(false);
  const [seconds, setSeconds] = useState(0);
  const recRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const intervalRef = useRef<number | null>(null);

  const start = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const rec = new MediaRecorder(stream);
      chunksRef.current = [];
      rec.ondataavailable = (e) => e.data.size > 0 && chunksRef.current.push(e.data);
      rec.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: "audio/webm" });
        const file = new File([blob], `voice-${Date.now()}.webm`, { type: "audio/webm" });
        stream.getTracks().forEach((t) => t.stop());
        onRecorded(file);
      };
      rec.start();
      recRef.current = rec;
      setRecording(true);
      setSeconds(0);
      intervalRef.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
    } catch (err) {
      console.error("Mic error", err);
      alert("Microphone access denied.");
    }
  };

  const stop = (cancel = false) => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    if (recRef.current && recRef.current.state !== "inactive") {
      if (cancel) {
        recRef.current.ondataavailable = null as any;
        recRef.current.onstop = () => {
          recRef.current?.stream.getTracks().forEach((t) => t.stop());
        };
      }
      recRef.current.stop();
    }
    setRecording(false);
    setSeconds(0);
  };

  if (recording) {
    return (
      <div className="flex shrink-0 items-center gap-2 rounded-full bg-destructive/10 px-2 py-1">
        <span className="h-2 w-2 animate-pulse rounded-full bg-destructive" />
        <span className="text-xs font-mono">{`${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, "0")}`}</span>
        <button
          onClick={() => stop(true)}
          className="flex h-7 w-7 items-center justify-center rounded-full text-muted-foreground hover:text-destructive"
          aria-label="Cancel"
        >
          <X className="h-4 w-4" />
        </button>
        <button
          onClick={() => stop(false)}
          className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground"
          aria-label="Stop and send"
        >
          <Square className="h-3.5 w-3.5" />
        </button>
      </div>
    );
  }

  return (
    <button
      onClick={start}
      className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow"
      aria-label="Record voice"
    >
      <Mic className="h-4 w-4" />
    </button>
  );
}

function VoicePlayer({ url, mine, speed = 1 }: { url: string; mine: boolean; speed?: number }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [playing, setPlaying] = useState(false);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  const toggle = () => {
    const a = audioRef.current;
    if (!a) return;
    if (a.paused) {
      void a.play();
      setPlaying(true);
    } else {
      a.pause();
      setPlaying(false);
    }
  };

  const handleSpeedChange = (newSpeed: number) => {
    setPlaybackSpeed(newSpeed);
    if (audioRef.current) {
      audioRef.current.playbackRate = newSpeed;
    }
  };

  return (
    <div
      className={cn(
        "mb-1 flex items-center gap-2 rounded-lg p-2",
        mine ? "bg-white/10" : "bg-secondary",
      )}
    >
      <button
        onClick={toggle}
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-full shrink-0",
          mine ? "bg-white/20" : "bg-primary text-primary-foreground",
        )}
        aria-label={playing ? "Pause" : "Play"}
      >
        {playing ? <Pause className="h-3.5 w-3.5" /> : <Play className="h-3.5 w-3.5" />}
      </button>
      <span className="text-xs min-w-fit">Voice message</span>
      <div className="relative group">
        <button className="text-xs px-1 opacity-70 hover:opacity-100 flex items-center gap-1">
          {playbackSpeed}x <ChevronDown className="h-3 w-3" />
        </button>
        <div className="absolute right-0 top-full hidden group-hover:block z-10 bg-card border border-border rounded-lg shadow-lg mt-1">
          {[0.5, 0.75, 1, 1.25, 1.5, 2].map((s) => (
            <button
              key={s}
              onClick={() => handleSpeedChange(s)}
              className={cn(
                "block w-full text-left px-3 py-1.5 text-xs hover:bg-secondary",
                playbackSpeed === s && "bg-primary text-primary-foreground"
              )}
            >
              {s}x
            </button>
          ))}
        </div>
      </div>
      <audio
        ref={audioRef}
        src={url}
        onEnded={() => setPlaying(false)}
        onPause={() => setPlaying(false)}
        className="hidden"
      />
    </div>
  );
}
