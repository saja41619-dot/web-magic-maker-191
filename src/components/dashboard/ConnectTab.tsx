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
  Ban,
  Flag,
  Pin,
  Timer,
  Volume2,
  ChevronDown,
  MessageSquare,
  Users, // Added for New Group icon
} from "lucide-react";
import EmojiPicker, { Theme } from "emoji-picker-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { usePresenceHeartbeat } from "@/lib/usePresence";
import { CallManager, CallState, CallType } from "@/lib/callManager";
import { CallUI } from "@/components/CallUI";
import { cn } from "@/lib/utils";
import { NewGroupModal } from "./NewGroupModal";
import { StatusBar } from "./StatusBar";
import {
  loadChatSettings,
  upsertChatSetting,
  loadReactions,
  toggleReaction as dbToggleReaction,
  loadStars,
  toggleStar as dbToggleStar,
  expiresAtFromSeconds,
  WALLPAPERS,
  DISAPPEARING_OPTIONS,
  type ChatSetting,
  type Reaction,
} from "@/lib/chatFeatures";
import { Archive, BellOff, Palette, VolumeX } from "lucide-react";

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

interface ChatGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

export function ConnectTab() {
  usePresenceHeartbeat();
  const { user } = useAuth();
  const [users, setUsers] = useState<Profile[]>([]);
  const [presence, setPresence] = useState<Record<string, Presence>>({});
  const [groups, setGroups] = useState<ChatGroup[]>([]);
  const [lastMessages, setLastMessages] = useState<Record<string, DM>>({});
  const [unread, setUnread] = useState<Record<string, number>>({});
  const [search, setSearch] = useState("");
  const [activePeer, setActivePeer] = useState<Profile | null>(null);
  const [activeGroup, setActiveGroup] = useState<ChatGroup | null>(null);
  const [showNewGroupModal, setShowNewGroupModal] = useState(false); // State for new group modal
  const [loading, setLoading] = useState(true);

  const [chatSettings, setChatSettings] = useState<Record<string, ChatSetting>>({});
  const [showArchived, setShowArchived] = useState(false);

  const settingFor = (kind: "dm" | "group", key: string) =>
    chatSettings[`${kind}:${key}`];

  const reloadSettings = async () => {
    if (!user) return;
    const map = await loadChatSettings(user.id);
    setChatSettings(map);
  };

  const updateSetting = async (
    kind: "dm" | "group",
    key: string,
    patch: Partial<Omit<ChatSetting, "chat_kind" | "chat_key">>,
  ) => {
    if (!user) return;
    await upsertChatSetting(user.id, kind, key, patch);
    await reloadSettings();
  };

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*").neq("id", user.id);
      const { data: pres } = await supabase.from("user_presence").select("*");
      const { data: grps, error: grpErr } = await supabase.from("chat_groups").select("*");

      if (grpErr) {
        console.error("Error loading groups:", grpErr);
      }

      setUsers(profiles ?? []);
      const pmap: Record<string, Presence> = {};
      (pres ?? []).forEach((p: any) => (pmap[p.user_id] = p as Presence));
      setPresence(pmap);
      
      if (grps) {
        setGroups(grps as unknown as ChatGroup[]);
      }

      await reloadSettings();
      setLoading(false);
    } catch (err) {
      console.error("Critical load data error:", err);
      setLoading(false);
    }
  };

  // Load users + presence + summaries
  useEffect(() => {
    let cancelled = false;
    void loadData();
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
          const p = payload.new as Presence;
          if (p) setPresence((prev) => ({ ...prev, [p.user_id]: p }));
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "direct_messages" },
        (payload) => {
          const m = payload.new as DM;
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

  const sidebarItems = useMemo(() => {
    const q = search.trim().toLowerCase();
    type Item =
      | { type: "direct"; data: Profile; setting?: ChatSetting; ts: string }
      | { type: "group"; data: ChatGroup; setting?: ChatSetting; ts: string };
    const combined: Item[] = [
      ...users.map((u) => ({
        type: "direct" as const,
        data: u,
        setting: settingFor("dm", u.id),
        ts: lastMessages[u.id]?.created_at ?? "",
      })),
      ...groups.map((g) => ({
        type: "group" as const,
        data: g,
        setting: settingFor("group", g.id),
        ts: g.created_at,
      })),
    ];
    const visible = combined.filter((item) => {
      const isArch = item.setting?.archived ?? false;
      if (showArchived !== isArch) return false;
      if (!q) return true;
      const name = item.type === "direct" ? item.data.display_name : item.data.name;
      return (name ?? "").toLowerCase().includes(q);
    });
    visible.sort((a, b) => {
      const ap = a.setting?.pinned ? 1 : 0;
      const bp = b.setting?.pinned ? 1 : 0;
      if (ap !== bp) return bp - ap;
      return b.ts.localeCompare(a.ts);
    });
    return visible;
  }, [users, groups, search, chatSettings, lastMessages, showArchived]);

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
    setActiveGroup(null);
  };

  const openGroup = (g: ChatGroup) => {
    setActiveGroup(g);
    setActivePeer(null);
  };

  return (
    <section className={cn(
      "wa overflow-hidden border-border h-full",
      "rounded-none border-0 shadow-none md:rounded-2xl md:border md:shadow-elegant lg:rounded-none lg:border-0 lg:shadow-none"
    )} style={{ background: "var(--wa-panel)" }}>
      <div className="grid h-full min-h-[500px] grid-cols-1 md:grid-cols-[340px_1fr]">
        {/* Sidebar list */}
        <aside
          className={cn(
            "flex flex-col wa-bg-list border-r wa-divider",
            (activePeer || activeGroup) && "hidden md:flex",
          )}
        >
          {/* WhatsApp-style header */}
          <div className="wa-bg-header flex items-center justify-between px-4 py-3">
            <h2 className="text-base font-semibold" style={{ color: "var(--wa-teal-dark)" }}>Chats</h2>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setShowNewGroupModal(true)}
                className="wa-icon-btn"
                title="New group"
                aria-label="New group"
              >
                <Users className="h-5 w-5" />
              </button>
              <button className="wa-icon-btn" title="More" aria-label="More">
                <MoreVertical className="h-5 w-5" />
              </button>
            </div>
          </div>

          {/* Search */}
          <div className="px-3 py-2 wa-bg-list border-b wa-divider">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2" style={{ color: "var(--wa-text-muted)" }} />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or start new chat"
                className="h-9 w-full rounded-lg pl-9 pr-3 text-sm outline-none"
                style={{ background: "var(--wa-panel)", color: "var(--wa-text)" }}
              />
            </div>
          </div>

          <StatusBar users={users} />

          <div className="flex-1 overflow-y-auto p-2 space-y-1">
            <div className="flex items-center justify-between px-3 py-2">
              <h3 className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
                {showArchived ? "Archived" : "Recent Chats"}
              </h3>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="inline-flex items-center gap-1 text-[10px] font-medium text-muted-foreground hover:text-foreground"
              >
                <Archive className="h-3 w-3" />
                {showArchived ? "All" : "Archived"}
              </button>
            </div>
            {loading ? (
              <div className="flex justify-center p-6">
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
              </div>
            ) : sidebarItems.length === 0 ? (
              <p className="p-4 text-center text-xs text-muted-foreground">
                {showArchived ? "No archived chats." : "No chats yet."}
              </p>
            ) : (
              sidebarItems.map((item) => {
                const setting = item.setting;
                const isPinned = setting?.pinned ?? false;
                const isMuted = setting?.muted_until && new Date(setting.muted_until) > new Date();
                const kind = item.type === "direct" ? "dm" : "group";
                const key = item.data.id;

                if (item.type === "direct") {
                  const p = item.data;
                  const last = lastMessages[p.id];
                  const isOnline = presence[p.id]?.is_online;
                  const initial = (p.display_name ?? "U").charAt(0).toUpperCase();
                  return (
                    <ChatRow
                      key={p.id}
                      onOpen={() => openPeer(p)}
                      active={activePeer?.id === p.id}
                      isPinned={isPinned}
                      isMuted={!!isMuted}
                      isArchived={!!setting?.archived}
                      onTogglePin={() => updateSetting(kind, key, { pinned: !isPinned })}
                      onToggleArchive={() => updateSetting(kind, key, { archived: !setting?.archived })}
                      onToggleMute={() =>
                        updateSetting(kind, key, {
                          muted_until: isMuted ? null : new Date(Date.now() + 8 * 3600_000).toISOString(),
                        })
                      }
                      avatar={
                        <div className="relative">
                          <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-base font-bold text-primary-foreground">
                            {p.avatar_url ? (
                              <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                            ) : (
                              initial
                            )}
                          </div>
                          {isOnline && (
                            <span className="absolute bottom-0.5 right-0.5 h-3 w-3 rounded-full border-2 border-background bg-green-500 animate-pulse" />
                          )}
                        </div>
                      }
                      title={p.display_name || "User"}
                      subtitle={last?.content || (last ? "(Attachment)" : "Tap to chat")}
                      time={last ? formatTime(last.created_at) : ""}
                      unread={unread[p.id] ?? 0}
                    />
                  );
                } else {
                  const g = item.data;
                  return (
                    <ChatRow
                      key={g.id}
                      onOpen={() => openGroup(g)}
                      active={activeGroup?.id === g.id}
                      isPinned={isPinned}
                      isMuted={!!isMuted}
                      isArchived={!!setting?.archived}
                      onTogglePin={() => updateSetting(kind, key, { pinned: !isPinned })}
                      onToggleArchive={() => updateSetting(kind, key, { archived: !setting?.archived })}
                      onToggleMute={() =>
                        updateSetting(kind, key, {
                          muted_until: isMuted ? null : new Date(Date.now() + 8 * 3600_000).toISOString(),
                        })
                      }
                      avatar={
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary/10 text-primary">
                          <Users className="h-6 w-6" />
                        </div>
                      }
                      title={g.name}
                      subtitle="Group chat"
                      time=""
                      unread={0}
                    />
                  );
                }
              })
            )}
          </div>
        </aside>

        {/* Chat window */}
        <div className={cn("flex flex-col min-w-0", !(activePeer || activeGroup) && "hidden md:flex")}>
          {activePeer ? (
            <ChatWindow
              key={activePeer.id}
              peer={activePeer}
              presence={presence[activePeer.id]}
              onBack={() => setActivePeer(null)}
              allUsers={users}
            />
          ) : activeGroup ? (
            <GroupChatWindow
              key={activeGroup.id}
              group={activeGroup}
              onBack={() => setActiveGroup(null)}
              allUsers={users}
            />
          ) : (
            <div
              className="flex flex-1 flex-col items-center justify-center p-8 text-center"
              style={{
                background:
                  "linear-gradient(180deg, #f0f2f5 0%, #f0f2f5 65%, #25d366 65%, #25d366 66%, #f0f2f5 66%)",
              }}
            >
              <div
                className="mb-6 flex h-44 w-44 items-center justify-center rounded-full"
                style={{ background: "#dbeae5" }}
              >
                <MessageSquare className="h-20 w-20" style={{ color: "var(--wa-teal)" }} />
              </div>
              <h3 className="text-2xl font-light" style={{ color: "var(--wa-text)" }}>
                Lovable Web
              </h3>
              <p className="mt-3 max-w-sm text-sm" style={{ color: "var(--wa-text-muted)" }}>
                Send and receive messages, share files, make voice & video calls,
                create polls, share location and more — all from your dashboard.
              </p>
              <p className="mt-6 inline-flex items-center gap-2 text-xs" style={{ color: "var(--wa-text-muted)" }}>
                <span>🔒</span> End-to-end encryption is not enabled in this demo.
              </p>
            </div>
          )}
        </div>

        {/* New Group Modal */}
        {showNewGroupModal && (
          <NewGroupModal 
            allUsers={users} 
            onClose={() => setShowNewGroupModal(false)} 
            onGroupCreated={() => void loadData()}
          />
        )}

      </div>
    </section>
  );
}

function ChatRow({
  onOpen,
  active,
  avatar,
  title,
  subtitle,
  time,
  unread,
  isPinned,
  isMuted,
  isArchived,
  onTogglePin,
  onToggleArchive,
  onToggleMute,
}: {
  onOpen: () => void;
  active: boolean;
  avatar: React.ReactNode;
  title: string;
  subtitle: string;
  time: string;
  unread: number;
  isPinned: boolean;
  isMuted: boolean;
  isArchived: boolean;
  onTogglePin: () => void;
  onToggleArchive: () => void;
  onToggleMute: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      className={cn(
        "group relative flex w-full items-center gap-3 rounded-xl p-3 cursor-pointer transition-all",
        active ? "bg-primary/10 ring-1 ring-primary/20" : "hover:bg-secondary/50",
      )}
      onClick={onOpen}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-sm font-semibold flex items-center gap-1">
            {title}
            {isMuted && <BellOff className="h-3 w-3 text-muted-foreground" />}
          </p>
          <span className="shrink-0 text-[10px] text-muted-foreground">{time}</span>
        </div>
        <div className="flex items-center justify-between gap-2">
          <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
          <div className="flex items-center gap-1">
            {isPinned && <Pin className="h-3 w-3 text-primary" />}
            {unread > 0 && (
              <span className="rounded-full bg-primary px-1.5 py-0.5 text-[10px] font-bold text-primary-foreground">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>
      <button
        onClick={(e) => {
          e.stopPropagation();
          setMenuOpen((v) => !v);
        }}
        className="opacity-0 group-hover:opacity-100 rounded-md p-1 hover:bg-secondary"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {menuOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className="absolute right-2 top-12 z-20 w-44 rounded-xl border border-border bg-card shadow-elegant py-1 text-sm"
        >
          <button
            onClick={() => { onTogglePin(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
          >
            <Pin className="h-4 w-4" /> {isPinned ? "Unpin" : "Pin"}
          </button>
          <button
            onClick={() => { onToggleMute(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
          >
            <BellOff className="h-4 w-4" /> {isMuted ? "Unmute" : "Mute 8h"}
          </button>
          <button
            onClick={() => { onToggleArchive(); setMenuOpen(false); }}
            className="flex w-full items-center gap-2 px-3 py-2 hover:bg-secondary"
          >
            <Archive className="h-4 w-4" /> {isArchived ? "Unarchive" : "Archive"}
          </button>
        </div>
      )}
    </div>
  );
}

function ChatWindow({
  peer,
  presence,
  onBack,
  allUsers,
}: {
  peer: Profile;
  presence?: Presence;
  onBack: () => void;
  allUsers: Profile[]; // Added for forwarding
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DM[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [peerTyping, setPeerTyping] = useState(false);
  const [showInfo, setShowInfo] = useState(false);
  const [messageSearch, setMessageSearch] = useState("");
  const [showMediaGallery, setShowMediaGallery] = useState(false);
  const [pinnedMessages] = useState<Record<string, boolean>>({});
  const [replyingTo, setReplyingTo] = useState<DM | null>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingText, setEditingText] = useState("");
  const [isBlocked, setIsBlocked] = useState(false);
  const [blockList, setBlockList] = useState<string[]>([]);
  const [voicePlaybackSpeed, setVoicePlaybackSpeed] = useState(1);
  const [callingPeer, setCallingPeer] = useState<Profile | null>(null); // The peer currently in a 1:1 call from this group context
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [forwardingMessage, setForwardingMessage] = useState<DM | null>(null);
  const [showDisappearingOptions, setShowDisappearingOptions] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Call State Management
  const [callState, setCallState] = useState<CallState>("idle");
  const callStateRef = useRef<CallState>("idle");

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  const [callType, setCallType] = useState<CallType>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callManagerRef = useRef<CallManager | null>(null);
  
  // Initialize CallManager only on client side
  if (!callManagerRef.current && typeof window !== "undefined") {
    callManagerRef.current = new CallManager();
  }
  const callTimerRef = useRef<number | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  // Call State Management (for ChatWindow and GroupChatWindow)
  // Ringtone management
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    if (isRinging) {
      // You can replace this URL with your preferred ringtone
      ringtoneRef.current = new Audio("https://assets.mixkit.co/active_storage/sfx/1359/1359-preview.mp3");
      ringtoneRef.current.loop = true;
      ringtoneRef.current.play().catch(e => console.log("Audio play blocked:", e));
    } else {
      ringtoneRef.current?.pause();
      if (ringtoneRef.current) ringtoneRef.current.currentTime = 0;
    }
    return () => ringtoneRef.current?.pause();
  }, [isRinging]);

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

  // Initialize CallManager only on client side
  if (!callManagerRef.current && typeof window !== "undefined") {
    callManagerRef.current = new CallManager();
  }
  const callTimerRef = useRef<number | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

  // Call State Management
  const [callState, setCallState] = useState<CallState>("idle");
  const callStateRef = useRef<CallState>("idle");

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);
  const [callType, setCallType] = useState<CallType>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);

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

  // Initialize CallManager listeners
  useEffect(() => {
    if (!callManagerRef.current) return;
    const cm = callManagerRef.current!;
    cm.onRemoteStream((stream) => setRemoteStream(stream));
    cm.onStateChange((state) => {
      setCallState(state);
      if (state === "active") {
        setCallDuration(0);
        callTimerRef.current = window.setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      } else if (state === "ended" || state === "idle") {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallType(null);
        setLocalStream(null);
        setRemoteStream(null);
        setCallDuration(0);
      }
    });

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      cm.endCall();
    };
  }, []);

  // Call Signaling via Supabase Broadcast
  useEffect(() => {
    if (!user) return;
    const topic = `call-signaling:${[user.id, peer.id].sort().join(':')}`;
    const signalingCh = supabase.channel(topic, {
      config: { broadcast: { self: false } },
    });
    signalingChannelRef.current = signalingCh;

    signalingCh
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        if (callStateRef.current !== "idle" && callStateRef.current !== "ended") return;
        const { offer, callType: incomingType } = payload;
        setCallType(incomingType);
        setIncomingOffer(offer);
        setIsRinging(true);
      })
      .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
        const { answer } = payload;
        await callManagerRef.current?.handleRemoteAnswer(answer);
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const { candidate } = payload;
        if (candidate) {
          await callManagerRef.current?.addIceCandidate(candidate);
        }
      })
      .on("broadcast", { event: "call-decline" }, () => {
        toast.error("Call declined");
        setIsRinging(false);
        setIncomingOffer(null);
      })
      .on("broadcast", { event: "call-end" }, () => {
        callManagerRef.current?.endCall();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(signalingCh);
      signalingChannelRef.current = null;
    };
  }, [user, peer.id]);

  // Initialize CallManager listeners
  useEffect(() => {
    if (!callManagerRef.current) return;
    const cm = callManagerRef.current!;
    cm.onRemoteStream((stream) => setRemoteStream(stream));
    cm.onStateChange((state) => {
      setCallState(state);
      if (state === "active") {
        setCallDuration(0);
        callTimerRef.current = window.setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      } else if (state === "ended" || state === "idle") {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallType(null);
        setLocalStream(null);
        setRemoteStream(null);
        setCallDuration(0);
      }
    });

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      cm.endCall();
    };
  }, []);

  // Call Signaling via Supabase Broadcast
  useEffect(() => {
    if (!user) return;
    const topic = `call-signaling:${[user.id, peer.id].sort().join(':')}`;
    const signalingCh = supabase.channel(topic, {
      config: { broadcast: { self: false } },
    });
    signalingChannelRef.current = signalingCh;

    signalingCh
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        if (callStateRef.current !== "idle" && callStateRef.current !== "ended") return;
        const { offer, callType: incomingType } = payload;
        setCallType(incomingType);
        setIncomingOffer(offer);
        setIsRinging(true);
      })
      .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
        const { answer } = payload;
        await callManagerRef.current?.handleRemoteAnswer(answer);
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const { candidate } = payload;
        if (candidate) {
          await callManagerRef.current?.addIceCandidate(candidate);
        }
      })
      .on("broadcast", { event: "call-decline" }, () => {
        toast.error("Call declined");
        setIsRinging(false);
        setIncomingOffer(null);
      })
      .on("broadcast", { event: "call-end" }, () => {
        callManagerRef.current?.endCall();
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(signalingCh);
      signalingChannelRef.current = null;
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

  const [chatSetting, setChatSetting] = useState<ChatSetting | null>(null);
  const [reactionsByMsg, setReactionsByMsg] = useState<Record<string, Reaction[]>>({});
  const [starredSet, setStarredSet] = useState<Set<string>>(new Set());
  const [pinnedSet, setPinnedSet] = useState<Set<string>>(new Set());
  const [showWallpapers, setShowWallpapers] = useState(false);

  // Load settings + reactions + stars when peer/messages change
  useEffect(() => {
    if (!user) return;
    void (async () => {
      const map = await loadChatSettings(user.id);
      setChatSetting(map[`dm:${peer.id}`] ?? null);
      const stars = await loadStars(user.id);
      setStarredSet(stars);
    })();
  }, [user, peer.id]);

  useEffect(() => {
    if (messages.length === 0) return;
    void (async () => {
      const map = await loadReactions(messages.map((m) => m.id));
      setReactionsByMsg(map);
    })();
    const ch = supabase
      .channel(`reactions-${peer.id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "message_reactions" },
        async () => {
          const map = await loadReactions(messages.map((m) => m.id));
          setReactionsByMsg(map);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(ch);
    };
  }, [messages.length, peer.id]);

  const deleteMessage = async (msgId: string, forEveryone = false) => {
    try {
      if (forEveryone) {
        await supabase
          .from("direct_messages")
          .update({ deleted_for_all: true, content: null, attachment_url: null } as any)
          .eq("id", msgId);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === msgId ? { ...m, content: null, attachment_url: null, deleted_for_all: true } as any : m,
          ),
        );
      } else {
        await supabase.from("direct_messages").delete().eq("id", msgId);
        setMessages((prev) => prev.filter((m) => m.id !== msgId));
      }
    } catch (err) {
      console.error("Delete error:", err);
      toast.error("Couldn't delete");
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Copied");
  };

  const addReaction = async (messageId: string, emoji: string) => {
    if (!user) return;
    const existing = reactionsByMsg[messageId];
    await dbToggleReaction(messageId, "dm", user.id, emoji, existing);
  };

  const editMessage = async (msgId: string) => {
    if (!editingText.trim()) return;
    const orig = messages.find((m) => m.id === msgId);
    if (!orig) return;
    if (Date.now() - new Date(orig.created_at).getTime() > 15 * 60_000) {
      toast.error("Can only edit within 15 minutes");
      return;
    }
    try {
      await supabase
        .from("direct_messages")
        .update({ content: editingText, edited_at: new Date().toISOString() })
        .eq("id", msgId);
      setMessages((prev) =>
        prev.map((m) => (m.id === msgId ? { ...m, content: editingText, edited_at: new Date().toISOString() } : m)),
      );
      setEditingId(null);
      setEditingText("");
    } catch (err) {
      console.error("Edit error:", err);
    }
  };

  const togglePin = (msgId: string) => {
    setPinnedSet((prev) => {
      const next = new Set(prev);
      next.has(msgId) ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  };

  const toggleStar = async (msgId: string) => {
    if (!user) return;
    const isStarred = starredSet.has(msgId);
    await dbToggleStar(user.id, msgId, "dm", isStarred);
    setStarredSet((prev) => {
      const next = new Set(prev);
      isStarred ? next.delete(msgId) : next.add(msgId);
      return next;
    });
  };

  const setWallpaper = async (wp: string | null) => {
    if (!user) return;
    await upsertChatSetting(user.id, "dm", peer.id, { wallpaper: wp });
    setChatSetting((s) => ({ ...(s ?? ({} as any)), wallpaper: wp } as ChatSetting));
    setShowWallpapers(false);
  };

  const setDisappearing = async (sec: number | null) => {
    if (!user) return;
    await upsertChatSetting(user.id, "dm", peer.id, { disappearing_seconds: sec });
    setChatSetting((s) => ({ ...(s ?? ({} as any)), disappearing_seconds: sec } as ChatSetting));
    toast.success(sec ? "Disappearing on" : "Disappearing off");
  };

  // Forward
  const initiateForward = (msgId: string) => {
    const message = messages.find((m) => m.id === msgId);
    if (!message) return;
    setForwardingMessage(message);
  };

  const sendForwardedMessage = async (targetRecipient: Profile) => {
    if (!user || !forwardingMessage) return;
    setSending(true);
    try {
      await supabase.from("direct_messages").insert({
        sender_id: user.id,
        recipient_id: targetRecipient.id,
        content: forwardingMessage.content,
        attachment_url: forwardingMessage.attachment_url,
        attachment_type: forwardingMessage.attachment_type,
        attachment_name: forwardingMessage.attachment_name,
        forwarded: true,
      } as any);
      toast.success(`Forwarded to ${targetRecipient.display_name || "User"}`);
    } finally {
      setSending(false);
      setForwardingMessage(null);
    }
  };

  const handleAcceptCall = async () => {
    if (!incomingOffer || !callType || !signalingChannelRef.current) return;
    setIsRinging(false);
    const answer = await callManagerRef.current?.answerCall(incomingOffer, callType);
    setLocalStream(callManagerRef.current?.getLocalStream() || null);
    
    signalingChannelRef.current.send({
      type: "broadcast",
      event: "call-answer",
      payload: { answer },
    });

    callManagerRef.current?.getIceCandidates((candidate) => {
      if (candidate) {
        signalingChannelRef.current?.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate },
        });
      }
    });
    setIncomingOffer(null);
  };

  const handleDeclineCall = () => {
    if (signalingChannelRef.current) {
      signalingChannelRef.current.send({
        type: "broadcast",
        event: "call-decline",
      });
    }
    setIsRinging(false);
    setIncomingOffer(null);
  };

  const startCall = async (type: "voice" | "video") => {
    if (!signalingChannelRef.current) return;
    setCallType(type);
    const offer = await callManagerRef.current!.initiateCall(type);
    setLocalStream(callManagerRef.current!.getLocalStream());

    signalingChannelRef.current.send({
      type: "broadcast",
      event: "call-offer",
      payload: { offer, callType: type },
    });

    callManagerRef.current!.getIceCandidates((candidate) => {
      if (candidate) {
        signalingChannelRef.current?.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate },
        });
      }
    });
  };

  const endCall = () => {
    callManagerRef.current!.endCall();
    signalingChannelRef.current?.send({
      type: "broadcast",
      event: "call-end",
    });
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
      const payload: any = {
        sender_id: user.id,
        recipient_id: peer.id,
        content: overrides?.attachment_url ? overrides?.content ?? null : content || null,
        attachment_url: overrides?.attachment_url ?? null,
        attachment_type: overrides?.attachment_type ?? null,
        attachment_name: overrides?.attachment_name ?? null,
        expires_at: expiresAtFromSeconds(chatSetting?.disappearing_seconds ?? null),
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
      <div className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
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
              <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500 animate-pulse" />
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
            onClick={() => setShowWallpapers((v) => !v)}
            className="rounded-lg p-2 hover:bg-secondary text-muted-foreground hover:text-foreground transition-colors"
            aria-label="Wallpaper"
          >
            <Palette className="h-5 w-5" />
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

      {showWallpapers && (
        <div className="border-b border-border bg-background/50 p-3 space-y-2">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold">Wallpaper</p>
            <button onClick={() => setShowWallpapers(false)}><X className="h-4 w-4" /></button>
          </div>
          <div className="flex gap-2 overflow-x-auto">
            {WALLPAPERS.map((w) => (
              <button
                key={w.label}
                onClick={() => setWallpaper(w.value)}
                className={cn(
                  "h-12 w-12 shrink-0 rounded-lg border-2",
                  chatSetting?.wallpaper === w.value ? "border-primary" : "border-transparent",
                )}
                style={w.value ? { background: w.value } : { background: "#0b141a" }}
                title={w.label}
              />
            ))}
          </div>
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <p className="text-xs font-semibold inline-flex items-center gap-1"><Timer className="h-3 w-3" /> Disappearing</p>
            <select
              value={String(chatSetting?.disappearing_seconds ?? "")}
              onChange={(e) => setDisappearing(e.target.value ? Number(e.target.value) : null)}
              className="text-xs bg-card border border-border rounded-md px-2 py-1"
            >
              {DISAPPEARING_OPTIONS.map((o) => (
                <option key={o.label} value={o.value ?? ""}>{o.label}</option>
              ))}
            </select>
          </div>
        </div>
      )}

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
            <button 
              onClick={() => startCall("voice")}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
            >
              <Phone className="h-4 w-4" />
              <span className="text-xs font-medium">Voice call</span>
            </button>
            <button 
              onClick={() => startCall("video")}
              className="flex items-center justify-center gap-2 rounded-lg bg-primary/10 p-2 text-primary hover:bg-primary/20 transition-colors"
            >
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
        className="flex-1 space-y-3 overflow-y-auto p-4 relative wa-bg-chat"
        style={chatSetting?.wallpaper ? { background: chatSetting.wallpaper } : undefined}
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
                    onDelete={() => deleteMessage(m.id, mine)}
                    onCopy={() => copyToClipboard(m.content || "")}
                    onReact={(emoji) => addReaction(m.id, emoji)}
                    reactions={(reactionsByMsg[m.id] ?? []).map((r) => r.emoji)}
                    onPin={() => togglePin(m.id)}
                    onStar={() => toggleStar(m.id)}
                    onForward={() => initiateForward(m.id)}
                    onReply={() => setReplyingTo(m)}
                    onEdit={() => {
                      setEditingId(m.id);
                      setEditingText(m.content || "");
                    }}
                    onReport={() => reportMessage(m.id)}
                    isPinned={pinnedSet.has(m.id)}
                    isStarred={starredSet.has(m.id)}
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
      <div className="relative border-t border-border bg-card/80 backdrop-blur-md p-4 space-y-3">
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

      {/* Incoming Call Ringing UI Overlay */}
      {isRinging && (
        <div className="fixed inset-0 z-[150] flex flex-col items-center justify-center bg-background/90 backdrop-blur-xl animate-in fade-in duration-300">
          <div className="relative mb-8">
            <div className="absolute inset-0 animate-ping rounded-full bg-primary/20" />
            <div className="relative flex h-32 w-32 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-4xl font-bold text-white shadow-2xl">
              {peer.avatar_url ? <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" /> : initial}
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-1">{peer.display_name || "User"}</h2>
          <p className="text-muted-foreground animate-pulse mb-12 uppercase tracking-widest text-xs">Incoming {callType} call...</p>
          
          {/* Swipe up to accept - Placeholder for visual effect, actual accept is via button */}
          {/* You would typically use a gesture library for actual swipe detection */}
          {/* For this example, the button directly triggers handleAcceptCall */}

          <div className="flex flex-col items-center gap-10 w-full max-w-xs">
            <button
              onClick={handleAcceptCall}
              className="group relative flex flex-col items-center gap-3 transition-transform active:scale-95"
            >
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-green-500 text-white shadow-lg shadow-green-500/40 animate-bounce">
                <Phone className="h-8 w-8" />
              </div>
              <span className="text-xs font-bold text-green-500 uppercase tracking-tighter">Swipe Up to Accept</span>
            </button>

            <button
              onClick={handleDeclineCall}
              className="flex items-center gap-2 rounded-full bg-destructive/10 px-8 py-3 text-destructive hover:bg-destructive/20 transition-colors font-semibold"
            >
              <X className="h-5 w-5" />
              Decline
            </button>
          </div>
        </div>
      )}

      {callState !== "idle" && callState !== "ended" && callType && callManagerRef.current && (
        <CallUI
          localStream={localStream}
          remoteStream={remoteStream}
          callType={callType}
          callDuration={callDuration}
          onEndCall={endCall}
          onToggleMic={(enabled) => callManagerRef.current!.toggleAudio(enabled)}
          onToggleVideo={(enabled) => callManagerRef.current!.toggleVideo(enabled)}
          peerName={peer.display_name ?? "User"}
        />
      )}

      {/* Forward Message Modal */}
      {forwardingMessage && (
        <div className="fixed inset-0 z-[101] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card shadow-elegant p-6">
            <h3 className="font-display text-lg font-bold mb-4">Forward message to...</h3>
            <div className="max-h-64 overflow-y-auto space-y-2 pr-2 scrollbar-thin scrollbar-thumb-border">
              {allUsers.filter(u => u.id !== user?.id && u.id !== peer.id).length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-4">No other users to forward to.</p>
              ) : (
                allUsers.filter(u => u.id !== user?.id && u.id !== peer.id).map((u) => (
                  <button
                    key={u.id}
                    onClick={() => sendForwardedMessage(u)}
                    className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-secondary/50 transition-colors text-left"
                  >
                    <div className="flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                      {u.avatar_url ? (
                        <img src={u.avatar_url} alt="" className="h-full w-full object-cover" />
                      ) : (
                        u.display_name?.charAt(0).toUpperCase() || "U"
                      )}
                    </div>
                    <p className="font-medium text-sm truncate">{u.display_name || "User"}</p>
                  </button>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setForwardingMessage(null)}
                className="rounded-xl border border-border px-4 py-2 text-sm font-medium hover:bg-secondary transition-colors"
              >
                Cancel
              </button>
              {sending && (
                <Loader2 className="h-5 w-5 animate-spin text-muted-foreground self-center" />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

interface GroupMessage {
  id: string;
  group_id: string;
  sender_id: string;
  content: string | null;
  attachment_url: string | null;
  attachment_type: "image" | "file" | "voice" | null;
  attachment_name: string | null;
  reply_to_id: string | null;
  created_at: string;
}

interface GroupMember {
  id: string;
  user_id: string;
  group_id: string;
  role: string;
}

function GroupChatWindow({
  group,
  onBack,
  allUsers,
}: {
  group: ChatGroup;
  onBack: () => void;
  allUsers: Profile[];
}) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<GroupMessage[]>([]);
  const [members, setMembers] = useState<GroupMember[]>([]);
  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [showEmoji, setShowEmoji] = useState(false);
  const [replyingTo, setReplyingTo] = useState<GroupMessage | null>(null);
  const [showInfo, setShowInfo] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string>>({});
  const [onlineMap, setOnlineMap] = useState<Record<string, boolean>>({});
  const [readsByMessage, setReadsByMessage] = useState<Record<string, string[]>>({});
  const [showReceiptsFor, setShowReceiptsFor] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const typingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const lastTypingSent = useRef(0);

  // Call State Management (for GroupChatWindow)
  const ringtoneRef = useRef<HTMLAudioElement | null>(null); // Moved outside useEffect

  const [callState, setCallState] = useState<CallState>("idle");
  const callStateRef = useRef<CallState>("idle");
  useEffect(() => { callStateRef.current = callState; }, [callState]);

  const [callType, setCallType] = useState<CallType>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const callManagerRef = useRef<CallManager | null>(null);
  if (!callManagerRef.current && typeof window !== "undefined") { callManagerRef.current = new CallManager(); }
  const callTimerRef = useRef<number | null>(null);
  const signalingChannelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);
  const [callingPeer, setCallingPeer] = useState<Profile | null>(null); // The peer currently in a 1:1 call from this group context
  const isAdmin = useMemo(
    () => members.some((m) => m.user_id === user?.id && m.role === "admin"),
    [members, user]
  );

  // Initial load: messages + members + reads + presence
  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const [{ data: msgs }, { data: mems }, { data: pres }] = await Promise.all([
        supabase.from("group_messages").select("*").eq("group_id", group.id).order("created_at", { ascending: true }).limit(500),
        supabase.from("group_members").select("*").eq("group_id", group.id),
        supabase.from("user_presence").select("*"),
      ]);
      if (cancelled) return;
      setMessages((msgs ?? []) as GroupMessage[]);
      setMembers((mems ?? []) as GroupMember[]);
      const pmap: Record<string, boolean> = {};
      (pres ?? []).forEach((p: any) => (pmap[p.user_id] = !!p.is_online));
      setOnlineMap(pmap);

      const ids = (msgs ?? []).map((m: any) => m.id);
      if (ids.length > 0) {
        const { data: reads } = await supabase
          .from("group_message_reads")
          .select("message_id, user_id")
          .in("message_id", ids);
        const rmap: Record<string, string[]> = {};
        (reads ?? []).forEach((r: any) => {
          rmap[r.message_id] = [...(rmap[r.message_id] ?? []), r.user_id];
        });
        setReadsByMessage(rmap);
      }

      // Mark all unread messages as read by me
      const toMark = (msgs ?? []).filter((m: any) => m.sender_id !== user.id);
      if (toMark.length > 0) {
        await supabase
          .from("group_message_reads")
          .upsert(
            toMark.map((m: any) => ({
              message_id: m.id,
              user_id: user.id,
              group_id: group.id,
            })),
            { onConflict: "message_id,user_id", ignoreDuplicates: true }
          );
      }
    })();
    return () => { cancelled = true; };
  }, [user, group.id]);

  // Initialize CallManager listeners (for GroupChatWindow)
  useEffect(() => {
    if (!callManagerRef.current) return;
    const cm = callManagerRef.current!;
    cm.onRemoteStream((stream) => setRemoteStream(stream));
    cm.onStateChange((state) => {
      setCallState(state);
      if (state === "active") {
        setCallDuration(0);
        callTimerRef.current = window.setInterval(() => {
          setCallDuration((d) => d + 1);
        }, 1000);
      } else if (state === "ended" || state === "idle") {
        if (callTimerRef.current) clearInterval(callTimerRef.current);
        setCallType(null);
        setLocalStream(null);
        setRemoteStream(null);
        setCallDuration(0);
        setCallingPeer(null); // Reset calling peer when call ends
      }
    });

    return () => {
      if (callTimerRef.current) clearInterval(callTimerRef.current);
      cm.endCall();
    };
  }, []);

  // Call Signaling via Supabase Broadcast (for GroupChatWindow)
  useEffect(() => {
    if (!user || !callingPeer) {
      if (signalingChannelRef.current) {
        void supabase.removeChannel(signalingChannelRef.current);
        signalingChannelRef.current = null;
      }
      return;
    }

    const topic = `call-signaling:${[user.id, callingPeer.id].sort().join(':')}`;
    const signalingCh = supabase.channel(topic, {
      config: { broadcast: { self: false } },
    });
    signalingChannelRef.current = signalingCh;

    signalingCh
      .on("broadcast", { event: "call-offer" }, async ({ payload }) => {
        if (callStateRef.current !== "idle" && callStateRef.current !== "ended") return;
        const { offer, callType: incomingType, fromUserId } = payload;
        const callerProfile = allUsers.find(u => u.id === fromUserId);
        if (!callerProfile) { console.error("Caller profile not found for incoming call:", fromUserId); return; }
        setCallingPeer(callerProfile);
        setCallType(incomingType);
        setIncomingOffer(offer);
        setIsRinging(true);
      })
      .on("broadcast", { event: "call-answer" }, async ({ payload }) => {
        const { answer } = payload;
        await callManagerRef.current?.handleRemoteAnswer(answer);
      })
      .on("broadcast", { event: "ice-candidate" }, async ({ payload }) => {
        const { candidate } = payload;
        if (candidate) {
          await callManagerRef.current?.addIceCandidate(candidate);
        }
      })
      .on("broadcast", { event: "call-decline" }, () => {
        toast.error("Call declined");
        setIsRinging(false);
        setIncomingOffer(null);
        setCallingPeer(null);
      })
      .on("broadcast", { event: "call-end" }, () => {
        callManagerRef.current?.endCall();
        setCallingPeer(null);
      })
      .subscribe();

    return () => {
      void supabase.removeChannel(signalingCh);
      signalingChannelRef.current = null;
    };
  }, [user, callingPeer, allUsers]);

  // Realtime: messages, members, reads
  useEffect(() => {
    if (!user) return;
    const ch = supabase
      .channel(`group:${group.id}`)
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "group_messages",
        filter: `group_id=eq.${group.id}`,
      }, (payload) => {
        const m = payload.new as GroupMessage;
        setMessages((prev) => prev.some((x) => x.id === m.id) ? prev : [...prev, m]);
        if (m.sender_id !== user.id) {
          void supabase.from("group_message_reads").upsert(
            { message_id: m.id, user_id: user.id, group_id: group.id },
            { onConflict: "message_id,user_id", ignoreDuplicates: true }
          );
        }
      })
      .on("postgres_changes", {
        event: "DELETE", schema: "public", table: "group_messages",
        filter: `group_id=eq.${group.id}`,
      }, (payload) => {
        const old = payload.old as { id: string };
        setMessages((prev) => prev.filter((m) => m.id !== old.id));
      })
      .on("postgres_changes", {
        event: "*", schema: "public", table: "group_members",
        filter: `group_id=eq.${group.id}`,
      }, () => {
        void supabase.from("group_members").select("*").eq("group_id", group.id)
          .then(({ data }) => setMembers((data ?? []) as GroupMember[]));
      })
      .on("postgres_changes", {
        event: "INSERT", schema: "public", table: "group_message_reads",
        filter: `group_id=eq.${group.id}`,
      }, (payload) => {
        const r = payload.new as { message_id: string; user_id: string };
        setReadsByMessage((prev) => {
          const current = prev[r.message_id] ?? [];
          if (current.includes(r.user_id)) return prev;
          return { ...prev, [r.message_id]: [...current, r.user_id] };
        });
      })
      .on("postgres_changes", { event: "*", schema: "public", table: "user_presence" }, (payload) => {
        const p = payload.new as any;
        if (p) setOnlineMap((prev) => ({ ...prev, [p.user_id]: !!p.is_online }));
      })
      .subscribe();

    // Typing presence channel
    const typingCh = supabase.channel(`group-typing:${group.id}`, {
      config: { broadcast: { self: false } },
    });
    typingCh.on("broadcast", { event: "typing" }, (payload) => {
      const { from, name } = payload.payload as { from: string; name: string };
      if (from === user.id) return;
      setTypingUsers((prev) => ({ ...prev, [from]: name }));
      window.setTimeout(() => {
        setTypingUsers((prev) => {
          const next = { ...prev };
          delete next[from];
          return next;
        });
      }, 2500);
    }).subscribe();
    typingChannelRef.current = typingCh;

    return () => {
      void supabase.removeChannel(ch);
      void supabase.removeChannel(typingCh);
      typingChannelRef.current = null;
    };
  }, [group.id, user]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, typingUsers]);

  const sendTyping = () => {
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    const meName = allUsers.find((u) => u.id === user?.id)?.display_name
      || user?.user_metadata?.display_name || "Someone";
    typingChannelRef.current?.send({
      type: "broadcast",
      event: "typing",
      payload: { from: user?.id, name: meName },
    });
  };

  const startCall = async (type: "voice" | "video", targetPeer: Profile) => {
    setCallingPeer(targetPeer); // This will trigger the signaling useEffect

    // Small delay to allow signaling channel to be established
    await new Promise(resolve => setTimeout(resolve, 100));

    if (!signalingChannelRef.current) {
        toast.error("Signaling channel not ready.");
        return;
    }

    setCallType(type);
    const offer = await callManagerRef.current!.initiateCall(type);
    setLocalStream(callManagerRef.current!.getLocalStream());

    signalingChannelRef.current.send({
      type: "broadcast",
      event: "call-offer",
      payload: { offer, callType: type, fromUserId: user?.id },
    });

    callManagerRef.current!.getIceCandidates((candidate) => {
      if (candidate) {
        signalingChannelRef.current?.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate },
        });
      }
    });
  };

  const handleAcceptCall = async () => {
    if (!incomingOffer || !callType || !signalingChannelRef.current || !callingPeer) return;
    setIsRinging(false);
    const answer = await callManagerRef.current?.answerCall(incomingOffer, callType);
    setLocalStream(callManagerRef.current?.getLocalStream() || null);
    
    signalingChannelRef.current.send({
      type: "broadcast",
      event: "call-answer",
      payload: { answer },
    });

    callManagerRef.current?.getIceCandidates((candidate) => {
      if (candidate) {
        signalingChannelRef.current?.send({
          type: "broadcast",
          event: "ice-candidate",
          payload: { candidate },
        });
      }
    });
    setIncomingOffer(null);
  };

  const handleDeclineCall = () => {
    if (signalingChannelRef.current) { signalingChannelRef.current.send({ type: "broadcast", event: "call-decline" }); }
    setIsRinging(false);
    setIncomingOffer(null);
    setCallingPeer(null);
  };

  const send = async (overrides?: Partial<GroupMessage>) => {
    if (!user) return;
    const content = (overrides?.content ?? text).trim();
    if (!content && !overrides?.attachment_url) return;
    setSending(true);
    try {
      const payload = {
        group_id: group.id,
        sender_id: user.id,
        content: overrides?.attachment_url ? overrides?.content ?? null : content || null,
        attachment_url: overrides?.attachment_url ?? null,
        attachment_type: overrides?.attachment_type ?? null,
        attachment_name: overrides?.attachment_name ?? null,
        reply_to_id: replyingTo?.id ?? null,
      };
      const { error } = await supabase.from("group_messages").insert(payload);
      if (error) throw error;
      if (!overrides?.attachment_url) setText("");
      setReplyingTo(null);
      setShowEmoji(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to send");
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
      await send({
        attachment_url: url,
        attachment_type: type,
        attachment_name: file.name,
      });
    } catch (err: any) {
      toast.error(err.message || "Upload failed");
    } finally {
      setSending(false);
    }
  };

  const deleteMessage = async (msgId: string) => {
    const { error } = await supabase.from("group_messages").delete().eq("id", msgId);
    if (error) toast.error(error.message);
    else setMessages((prev) => prev.filter((m) => m.id !== msgId));
  };

  const addMember = async (profile: Profile) => {
    const { error } = await supabase.from("group_members").insert({
      group_id: group.id, user_id: profile.id, role: "member",
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`${profile.display_name || "User"} added`);
      setShowAddMember(false);
    }
  };

  const removeMember = async (memberId: string, userId: string) => {
    if (userId === group.created_by) {
      toast.error("Cannot remove the group creator");
      return;
    }
    const { error } = await supabase.from("group_members").delete().eq("id", memberId);
    if (error) toast.error(error.message);
    else toast.success("Member removed");
  };

  const endCall = () => {
    callManagerRef.current!.endCall();
    signalingChannelRef.current?.send({
      type: "broadcast",
      event: "call-end",
    });
    setCallingPeer(null);
  };

  const onlineMembersCount = members.filter((m) => onlineMap[m.user_id]).length;
  const memberIds = new Set(members.map((m) => m.user_id));
  const nonMembers = allUsers.filter((u) => !memberIds.has(u.id));
  const typingNames = Object.values(typingUsers);

  return (
    <>
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border bg-card/80 backdrop-blur-md px-4 py-3 sticky top-0 z-10">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <button onClick={onBack} className="md:hidden p-1.5 hover:bg-secondary rounded-lg" aria-label="Back">
            <ArrowLeft className="h-4 w-4" />
          </button>
          <button onClick={() => setShowInfo(true)} className="flex items-center gap-3 min-w-0 flex-1 text-left">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-semibold truncate text-sm">{group.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {typingNames.length > 0
                  ? `${typingNames.slice(0, 2).join(", ")} ${typingNames.length === 1 ? "is" : "are"} typing…`
                  : `${members.length} members${onlineMembersCount > 0 ? ` • ${onlineMembersCount} online` : ""}`}
              </p>
            </div>
          </button>
        </div>
        <button onClick={() => setShowInfo(true)} className="rounded-lg p-2 hover:bg-secondary text-muted-foreground" aria-label="Group info">
          <Info className="h-5 w-5" />
        </button>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto p-4 space-y-3 wa-bg-chat"
      >
        {messages.map((m) => {
          const mine = m.sender_id === user?.id;
          const sender = allUsers.find((u) => u.id === m.sender_id);
          const replied = m.reply_to_id ? messages.find((x) => x.id === m.reply_to_id) : null;
          const repliedSender = replied ? allUsers.find((u) => u.id === replied.sender_id) : null;
          const reads = readsByMessage[m.id] ?? [];
          const otherMembers = members.filter((mm) => mm.user_id !== user?.id);
          const readByOthers = reads.filter((uid) => uid !== user?.id);
          const allRead = otherMembers.length > 0 && readByOthers.length >= otherMembers.length;
          const someRead = readByOthers.length > 0;

          return (
            <div key={m.id} className={cn("flex flex-col group", mine ? "items-end" : "items-start")}>
              {!mine && (
                <span className="text-[10px] font-bold text-primary/90 mb-0.5 ml-2">
                  {sender?.display_name || "Unknown"}
                </span>
              )}
              <div className={cn(
                "wa-bubble wa-pop",
                mine ? "wa-bubble-out" : "wa-bubble-in"
              )}>
                {replied && (
                  <div className="mb-1.5 rounded-md p-2 border-l-4 text-xs"
                    style={{ background: "rgba(0,0,0,0.04)", borderColor: "var(--wa-teal)" }}>
                    <p className="font-bold opacity-80">{repliedSender?.display_name || "Unknown"}</p>
                    <p className="truncate opacity-70">
                      {replied.content || (replied.attachment_type === "image" ? "📷 Photo" : replied.attachment_type === "voice" ? "🎤 Voice" : "📎 File")}
                    </p>
                  </div>
                )}
                {m.attachment_type === "image" && m.attachment_url && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer">
                    <img src={m.attachment_url} alt={m.attachment_name ?? ""} className="mb-1 max-h-64 rounded-md object-cover" />
                  </a>
                )}
                {m.attachment_type === "voice" && m.attachment_url && (
                  <VoicePlayer url={m.attachment_url} mine={mine} />
                )}
                {m.attachment_type === "file" && m.attachment_url && (
                  <a href={m.attachment_url} target="_blank" rel="noreferrer"
                    className="mb-1 flex items-center gap-2 rounded-md p-2 hover:underline"
                    style={{ background: "rgba(0,0,0,0.04)" }}>
                    <FileText className="h-4 w-4" />
                    <span className="truncate">{m.attachment_name ?? "File"}</span>
                  </a>
                )}
                {m.content && <p className="whitespace-pre-wrap break-words">{m.content}</p>}
                <span className="wa-meta">
                  {formatTime(m.created_at)}
                  {mine && (
                    <button onClick={() => setShowReceiptsFor(showReceiptsFor === m.id ? null : m.id)}
                      className="ml-1 inline-flex" title="Read by">
                      {allRead ? <CheckCheck className="h-3 w-3 wa-tick-read" /> :
                       someRead ? <CheckCheck className="h-3 w-3 wa-tick" /> :
                       <Check className="h-3 w-3 wa-tick" />}
                    </button>
                  )}
                </span>

                {/* Hover actions */}
                <div className={cn(
                  "absolute top-0 -translate-y-full opacity-0 group-hover:opacity-100 transition-opacity flex gap-1 pb-1",
                  mine ? "right-0" : "left-0"
                )}>
                  <button onClick={() => setReplyingTo(m)} className="rounded-full bg-card border border-border p-1.5 hover:bg-secondary" title="Reply">
                    <Reply className="h-3.5 w-3.5" />
                  </button>
                  {m.content && (
                    <button onClick={() => { navigator.clipboard.writeText(m.content!); toast.success("Copied"); }}
                      className="rounded-full bg-card border border-border p-1.5 hover:bg-secondary" title="Copy">
                      <Copy className="h-3.5 w-3.5" />
                    </button>
                  )}
                  {mine && (
                    <button onClick={() => deleteMessage(m.id)} className="rounded-full bg-card border border-border p-1.5 hover:bg-destructive/10 text-destructive" title="Delete">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Read receipts dropdown */}
              {showReceiptsFor === m.id && mine && (
                <div className="mt-1 rounded-lg border border-border bg-card p-2 text-xs shadow-lg max-w-[280px]">
                  <p className="font-semibold mb-1.5 text-foreground">Read by ({readByOthers.length}/{otherMembers.length})</p>
                  {readByOthers.length === 0 ? (
                    <p className="text-muted-foreground">No one yet</p>
                  ) : (
                    <ul className="space-y-1">
                      {readByOthers.map((uid) => {
                        const u = allUsers.find((p) => p.id === uid);
                        return <li key={uid} className="text-muted-foreground">• {u?.display_name || "User"}</li>;
                      })}
                    </ul>
                  )}
                </div>
              )}
            </div>
          );
        })}
        {typingNames.length > 0 && (
          <div className="text-xs text-white/70 italic ml-2">
            {typingNames.slice(0, 2).join(", ")} {typingNames.length === 1 ? "is" : "are"} typing…
          </div>
        )}
      </div>

      {/* Reply preview */}
      {replyingTo && (
        <div className="px-4 py-2 bg-muted/50 border-t border-border flex justify-between items-center">
          <div className="border-l-4 border-primary pl-2 overflow-hidden flex-1 min-w-0">
            <p className="text-xs font-bold text-primary">
              {allUsers.find((u) => u.id === replyingTo.sender_id)?.display_name || "Unknown"}
            </p>
            <p className="text-sm truncate text-muted-foreground">
              {replyingTo.content || (replyingTo.attachment_type === "image" ? "📷 Photo" : replyingTo.attachment_type === "voice" ? "🎤 Voice" : "📎 File")}
            </p>
          </div>
          <button onClick={() => setReplyingTo(null)} className="p-1 hover:bg-muted rounded-full">
            <X className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      )}

      {/* Composer */}
      <div className="p-3 border-t border-border bg-card/80 backdrop-blur-md">
        {showEmoji && (
          <div className="mb-2">
            <EmojiPicker
              theme={Theme.AUTO}
              onEmojiClick={(e) => setText((t) => t + e.emoji)}
              width="100%"
              height={320}
            />
          </div>
        )}
        <div className="flex items-end gap-2">
          <button onClick={() => setShowEmoji((s) => !s)} className="p-2 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Emoji">
            <Smile className="h-5 w-5" />
          </button>
          <button onClick={() => imageInputRef.current?.click()} className="p-2 rounded-full hover:bg-secondary text-muted-foreground" aria-label="Image">
            <ImageIcon className="h-5 w-5" />
          </button>
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAndSend(f, "image"); e.target.value = ""; }} />
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full hover:bg-secondary text-muted-foreground" aria-label="File">
            <Paperclip className="h-5 w-5" />
          </button>
          <input ref={fileInputRef} type="file" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void uploadAndSend(f, "file"); e.target.value = ""; }} />
          <input
            value={text}
            onChange={(e) => { setText(e.target.value); sendTyping(); }}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(); } }}
            placeholder="Type a message…"
            className="flex-1 bg-background border border-border rounded-full px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          {text.trim() ? (
            <button onClick={() => void send()} disabled={sending}
              className="h-10 w-10 flex items-center justify-center rounded-full bg-gradient-primary text-primary-foreground shadow-glow disabled:opacity-50">
              <Send className="h-4 w-4" />
            </button>
          ) : (
            <VoiceRecorder onRecorded={(file) => void uploadAndSend(file, "voice")} />
          )}
        </div>
      </div>

      {/* Group Info Modal */}
      {showInfo && (
        <div className="fixed inset-0 z-[103] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={() => setShowInfo(false)}>
          <div className="w-full max-w-md max-h-[85vh] flex flex-col rounded-2xl border border-border bg-card shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display text-lg font-bold">Group Info</h3>
              <button onClick={() => setShowInfo(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="p-4 flex flex-col items-center text-center border-b border-border">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-primary/10 text-primary mb-3">
                <Users className="h-10 w-10" />
              </div>
              <h4 className="font-bold text-lg">{group.name}</h4>
              <p className="text-xs text-muted-foreground mt-1">
                Group • {members.length} members • Created {new Date(group.created_at).toLocaleDateString()}
              </p>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="flex items-center justify-between mb-3">
                <p className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {members.length} Members
                </p>
                {isAdmin && (
                  <button onClick={() => setShowAddMember(true)}
                    className="inline-flex items-center gap-1 text-xs font-semibold text-primary hover:underline">
                    + Add member
                  </button>
                )}
              </div>
              <div className="space-y-1">
                {members.map((m) => {
                  const profile = allUsers.find((u) => u.id === m.user_id) || (user?.id === m.user_id ? { id: user.id, display_name: "You", avatar_url: null } as Profile : null);
                  const name = m.user_id === user?.id ? "You" : (profile?.display_name || "Unknown");
                  const isOnline = onlineMap[m.user_id];
                  return (
                    <div key={m.id} className="flex items-center gap-3 p-2 rounded-xl hover:bg-secondary/50">
                      <div className="relative">
                        <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                          {profile?.avatar_url ? <img src={profile.avatar_url} alt="" className="h-full w-full object-cover" /> : name.charAt(0).toUpperCase()}
                        </div>
                        {isOnline && <span className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full border-2 border-card bg-green-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium truncate">{name}</p>
                        {m.user_id !== user?.id && (
                          <div className="flex gap-2 mt-1">
                            <button
                              onClick={() => startCall("voice", profile!)}
                              className="rounded-full p-1 hover:bg-primary/10 text-primary" title="Voice Call">
                              <Phone className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => startCall("video", profile!)}
                              className="rounded-full p-1 hover:bg-primary/10 text-primary" title="Video Call">
                              <VideoIcon className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                        <p className="text-[10px] text-muted-foreground capitalize">
                          {m.role}{m.user_id === group.created_by ? " • creator" : ""}
                        </p>
                      </div>
                      {isAdmin && m.user_id !== user?.id && m.user_id !== group.created_by && (
                        <button onClick={() => void removeMember(m.id, m.user_id)}
                          className="p-1.5 rounded-full hover:bg-destructive/10 text-destructive" title="Remove">
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add Member Modal */}
      {showAddMember && (
        <div className="fixed inset-0 z-[104] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4" onClick={() => setShowAddMember(false)}>
          <div className="w-full max-w-md max-h-[80vh] flex flex-col rounded-2xl border border-border bg-card shadow-elegant" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between p-4 border-b border-border">
              <h3 className="font-display text-lg font-bold">Add Member</h3>
              <button onClick={() => setShowAddMember(false)} className="text-muted-foreground hover:text-foreground">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-3">
              {nonMembers.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">All users are already members.</p>
              ) : nonMembers.map((u) => (
                <button key={u.id} onClick={() => void addMember(u)}
                  className="flex items-center gap-3 w-full p-2 rounded-xl hover:bg-secondary/50 text-left">
                  <div className="flex h-10 w-10 items-center justify-center overflow-hidden rounded-full bg-gradient-primary text-sm font-bold text-primary-foreground">
                    {u.avatar_url ? <img src={u.avatar_url} alt="" className="h-full w-full object-cover" /> : (u.display_name?.charAt(0).toUpperCase() || "U")}
                  </div>
                  <p className="text-sm font-medium truncate">{u.display_name || "User"}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Call UI (for GroupChatWindow) */}
      {callState !== "idle" && callState !== "ended" && callType && callManagerRef.current && callingPeer && (
        <CallUI
          localStream={localStream}
          remoteStream={remoteStream}
          callType={callType}
          callDuration={callDuration}
          onEndCall={endCall}
          onToggleMic={(enabled) => callManagerRef.current!.toggleAudio(enabled)}
          onToggleVideo={(enabled) => callManagerRef.current!.toggleVideo(enabled)}
          peerName={callingPeer.display_name ?? "User"}
        />
      )}

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
  senderName,
}: {
  message: any;
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
  senderName?: string;
}) {
  const [showMenu, setShowMenu] = useState(false);
  const [showReactions, setShowReactions] = useState(false);
  const [voiceSpeed, setVoiceSpeed] = useState(1);

  const isForwarded = message.content?.startsWith("[Forwarded]");
  const displayContent = isForwarded ? message.content?.replace("[Forwarded]\n", "") : message.content;

  return (
    <div className={cn("flex flex-col", mine ? "items-end" : "items-start")}>
      {!mine && senderName && (
        <span className="text-[10px] font-bold text-primary mb-0.5 ml-2">
          {senderName}
        </span>
      )}
      <div className="relative group">
        <div
          className={cn(
            "wa-bubble wa-pop",
            mine ? "wa-bubble-out" : "wa-bubble-in",
          )}
        >
          {isPinned && (
            <div className="flex items-center gap-1 mb-1 text-[10px] wa-text-muted">
              <Pin className="h-3 w-3" /> Pinned
            </div>
          )}
          {message.attachment_type === "image" && message.attachment_url && (
            <a href={message.attachment_url} target="_blank" rel="noreferrer">
              <img
                src={message.attachment_url}
                alt={message.attachment_name ?? "image"}
                className="mb-1 max-h-64 rounded-md object-cover hover:opacity-95 transition-opacity"
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
              className="mb-1 flex items-center gap-2 rounded-md p-2 underline-offset-2 hover:underline"
              style={{ background: "rgba(0,0,0,0.04)" }}
            >
              <FileText className="h-4 w-4" />
              <span className="truncate">{message.attachment_name ?? "File"}</span>
            </a>
          )}
          {message.content && (
            <div className="flex flex-col">
              {isForwarded && (
                <div className="flex items-center gap-1 opacity-60 mb-1 wa-text-muted">
                  <Forward className="h-3 w-3" />
                  <span className="text-[10px] italic font-medium">Forwarded</span>
                </div>
              )}
              <p className="whitespace-pre-wrap break-words">{displayContent}</p>
            </div>
          )}
          <span className="wa-meta">
            {message.edited_at && <span className="mr-1">edited</span>}
            {formatTime(message.created_at)}
            {mine && message.read_at !== undefined &&
              (message.read_at ? (
                <CheckCheck className="h-3 w-3 wa-tick-read" />
              ) : (
                <CheckCheck className="h-3 w-3 wa-tick" />
              ))}
          </span>
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
