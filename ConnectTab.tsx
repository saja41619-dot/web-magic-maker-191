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
  Users,
  Archive,
  BellOff,
  Palette,
  VolumeX,
  Sparkles,
  UserPlus,
  Megaphone,
  Eye,
  CalendarClock,
  Sticker as StickerIcon,
  Film,
  Filter,
  MapPin,
  Contact as ContactIcon,
  Radio,
  MonitorUp,
  History,
  BarChart3,
  Settings2,
  Users2,
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
import { WhatsAppFeaturesHub } from "./WhatsAppFeaturesHub";
import { InviteUserModal } from "./InviteUserModal";
import { BroadcastModal } from "./BroadcastModal";
import { GifPicker } from "./GifPicker";
import { StickerPicker } from "./StickerPicker";
import { ScheduleMessageDialog } from "./ScheduleMessageDialog";
import { CallHistoryModal } from "./CallHistoryModal";
import { CommunityHub } from "./CommunityHub";
import { AdvancedSettingsModal } from "./AdvancedSettingsModal";
import { PollComposer } from "./PollComposer";
import { PollDisplay } from "./PollDisplay";
import { GlobalSearchModal } from "./GlobalSearchModal";
import { StarredMessagesModal } from "./StarredMessagesModal";
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
  attachment_type: "image" | "file" | "voice" | "video" | "gif" | "sticker" | "contact" | "location" | "live_location" | null;
  attachment_name: string | null;
  created_at: string;
  read_at: string | null;
  reply_to_id?: string | null;
  is_pinned?: boolean;
  is_starred?: boolean;
  edited_at?: string | null;
  disappear_at?: string | null;
  deleted_for_all?: boolean;
  forwarded?: boolean;
  view_once?: boolean;
  view_once_opened_at?: string | null;
  scheduled_for?: string | null;
  is_broadcast?: boolean;
  live_location_until?: string | null;
}

interface Presence {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

const TYPING_CHANNEL = (a: string, b: string) => `typing:${[a, b].sort().join(":")}`;
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
  const [showNewGroupModal, setShowNewGroupModal] = useState(false);
  const [showFeaturesHub, setShowFeaturesHub] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showBroadcastModal, setShowBroadcastModal] = useState(false);
  const [showCallHistory, setShowCallHistory] = useState(false);
  const [showCommunities, setShowCommunities] = useState(false);
  const [showAdvancedSettings, setShowAdvancedSettings] = useState(false);
  const [showGlobalSearch, setShowGlobalSearch] = useState(false);
  const [showStarred, setShowStarred] = useState(false);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const [chatSettings, setChatSettings] = useState<Record<string, ChatSetting>>({});
  const [showArchived, setShowArchived] = useState(false);

  const settingFor = (kind: "dm" | "group", key: string) => chatSettings[`${kind}:${key}`];

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

      if (grpErr) console.error("Error loading groups:", grpErr);

      setUsers(profiles ?? []);
      const pmap: Record<string, Presence> = {};
      (pres ?? []).forEach((p) => {
        const userId = (p as Partial<Presence> & { user_id?: string }).user_id;
        if (!userId) return;
        pmap[userId] = p as Presence;
      });
      setPresence(pmap);

      if (grps) setGroups(grps as unknown as ChatGroup[]);

      await reloadSettings();
      setLoading(false);
    } catch (err) {
      console.error("Critical load data error:", err);
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadData();
  }, [user]);

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

  useEffect(() => {
    if (!user) return;
    const tick = async () => {
      const nowIso = new Date().toISOString();
      const { data } = await supabase
        .from("direct_messages")
        .select("id")
        .eq("sender_id", user.id)
        .not("scheduled_for", "is", null)
        .lte("scheduled_for", nowIso);
      const rows = (data ?? []) as { id: string }[];
      for (const r of rows) {
        await supabase
          .from("direct_messages")
          .update({ scheduled_for: null, created_at: new Date().toISOString() } as never)
          .eq("id", r.id);
      }
    };
    void tick();
    const i = window.setInterval(tick, 30_000);
    return () => window.clearInterval(i);
  }, [user]);

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
      if (unreadOnly && item.type === "direct" && (unread[item.data.id] ?? 0) === 0) return false;
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
  }, [users, groups, search, chatSettings, lastMessages, showArchived, unreadOnly, unread]);

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
    <section className="h-screen w-full overflow-hidden bg-[#f0f2f5] dark:bg-[#111b21] font-sans antialiased text-[#3b4a54] dark:text-[#e9edef]">
      <div className="grid h-full w-full grid-cols-1 md:grid-cols-[400px_1fr] bg-[#fff] dark:bg-[#222e35] shadow-2xl overflow-hidden">
        
        {/* Sidebar */}
        <aside className={cn("flex flex-col bg-white dark:bg-[#111b21] border-r border-[#e9edef] dark:border-[#222e35]", (activePeer || activeGroup) && "hidden md:flex")}>
          
          {/* Header */}
          <div className="flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-3 h-[60px]">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-[#00a884] flex items-center justify-center font-bold text-white shadow-sm">
                {user?.email?.charAt(0).toUpperCase() || "W"}
              </div>
              <h1 className="text-xl font-bold text-[#111b21] dark:text-[#e9edef]">Chats</h1>
            </div>
            
            {/* Quick Actions Panel */}
            <div className="flex items-center gap-1">
              <button onClick={() => setShowNewGroupModal(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="New Group"><Users className="h-5 w-5" /></button>
              <button onClick={() => setShowBroadcastModal(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="Broadcast"><Megaphone className="h-5 w-5" /></button>
              <button onClick={() => setShowCallHistory(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="Call History"><History className="h-5 w-5" /></button>
              <button onClick={() => setShowGlobalSearch(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="Search"><Search className="h-5 w-5" /></button>
              <button onClick={() => setShowStarred(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="Starred"><Star className="h-5 w-5" /></button>
              <button onClick={() => setShowAdvancedSettings(true)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-colors" title="Settings"><Settings2 className="h-5 w-5" /></button>
            </div>
          </div>

          {/* Search Box */}
          <div className="px-3 py-2 bg-white dark:bg-[#111b21] border-b border-[#f0f2f5] dark:border-[#222e35]">
            <div className="relative flex items-center bg-[#f0f2f5] dark:bg-[#202c33] rounded-xl px-3 py-1.5">
              <Search className="h-5 w-5 text-[#667781] dark:text-[#aebac1] mr-3 shrink-0" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search or start new chat"
                className="w-full bg-transparent text-sm text-[#111b21] dark:text-[#e9edef] outline-none placeholder-[#667781] dark:placeholder-[#aebac1]"
              />
            </div>
          </div>

          <StatusBar users={users} />

          {/* Chat List Category Controls */}
          <div className="flex items-center justify-between px-4 py-2 bg-white dark:bg-[#111b21]">
            <span className="text-xs font-bold tracking-wider text-[#008069] dark:text-[#00a884] uppercase">
              {showArchived ? "Archived Chats" : "Recent Conversations"}
            </span>
            <div className="flex gap-2">
              <button
                onClick={() => setUnreadOnly((v) => !v)}
                className={cn("text-xs px-2.5 py-1 rounded-full font-medium transition-all", unreadOnly ? "bg-[#00a884] text-white" : "bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#aebac1]")}
              >
                Unread
              </button>
              <button
                onClick={() => setShowArchived((v) => !v)}
                className="text-xs px-2.5 py-1 rounded-full bg-[#f0f2f5] dark:bg-[#202c33] text-[#54656f] dark:text-[#aebac1] font-medium"
              >
                {showArchived ? "All Chats" : "Archived"}
              </button>
            </div>
          </div>

          {/* Chat Rows Container */}
          <div className="flex-1 overflow-y-auto divide-y divide-[#f0f2f5] dark:divide-[#222e35]">
            {loading ? (
              <div className="flex justify-center items-center h-32">
                <Loader2 className="h-6 w-6 animate-spin text-[#00a884]" />
              </div>
            ) : sidebarItems.length === 0 ? (
              <p className="p-8 text-center text-sm text-[#667781] dark:text-[#aebac1]">No chats found.</p>
            ) : (
              sidebarItems.map((item) => {
                const setting = item.setting;
                const isPinned = setting?.pinned ?? false;
                const isMuted = setting?.muted_until && new Date(setting.muted_until) > new Date();
                const kind = item.type === "direct" ? "dm" : "group";
                const key = item.data.id;

                return (
                  <ChatRow
                    key={key}
                    onOpen={() => (item.type === "direct" ? openPeer(item.data as Profile) : openGroup(item.data as ChatGroup))}
                    active={item.type === "direct" ? activePeer?.id === key : activeGroup?.id === key}
                    isPinned={isPinned}
                    isMuted={!!isMuted}
                    isArchived={!!setting?.archived}
                    onTogglePin={() => updateSetting(kind, key, { pinned: !isPinned })}
                    onToggleArchive={() => updateSetting(kind, key, { archived: !setting?.archived })}
                    onToggleMute={() => updateSetting(kind, key, { muted_until: isMuted ? null : new Date(Date.now() + 8 * 3600_000).toISOString() })}
                    avatar={
                      <div className="relative shrink-0">
                        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#dfe5e7] dark:bg-[#374248] overflow-hidden text-lg font-bold text-[#54656f] dark:text-[#e9edef]">
                          {item.data.avatar_url ? (
                            <img src={item.data.avatar_url} alt="" className="h-full w-full object-cover" />
                          ) : (
                            item.type === "direct" ? (item.data as Profile).display_name?.charAt(0).toUpperCase() || "U" : <Users className="h-5 w-5" />
                          )}
                        </div>
                        {item.type === "direct" && presence[key]?.is_online && (
                          <span className="absolute bottom-0 right-0 h-3.5 w-3.5 rounded-full border-2 border-white dark:border-[#111b21] bg-[#00e676]" />
                        )}
                      </div>
                    }
                    title={item.type === "direct" ? (item.data as Profile).display_name || "User" : (item.data as ChatGroup).name}
                    subtitle={item.type === "direct" ? lastMessages[key]?.content || "Tap to text" : "Group Chat"}
                    time={item.type === "direct" && lastMessages[key] ? formatTime(lastMessages[key].created_at) : ""}
                    unread={item.type === "direct" ? unread[key] ?? 0 : 0}
                  />
                );
              })
            )}
          </div>
        </aside>

        {/* Workspace Chat Area */}
        <div className={cn("flex flex-col min-w-0 bg-[#efeae2] dark:bg-[#0b141a] relative", !(activePeer || activeGroup) && "hidden md:flex")}>
          {activePeer ? (
            <ChatWindow key={activePeer.id} peer={activePeer} presence={presence[activePeer.id]} onBack={() => setActivePeer(null)} allUsers={users} />
          ) : activeGroup ? (
            <GroupChatWindow key={activeGroup.id} group={activeGroup} onBack={() => setActiveGroup(null)} allUsers={users} />
          ) : (
            /* Empty Desktop Screen Intro */
            <div className="flex flex-1 flex-col items-center justify-center p-8 text-center bg-[#f8f9fa] dark:bg-[#222e35]">
              <div className="mb-6 flex h-40 w-40 items-center justify-center rounded-full bg-[#d8f3dc] dark:bg-[#128c7e]/20 text-[#00a884]">
                <MessageSquare className="h-20 w-20" />
              </div>
              <h3 className="text-2xl font-light text-[#41525d] dark:text-[#e9edef]">WhatsApp Web UI</h3>
              <p className="mt-3 max-w-md text-sm text-[#667781] dark:text-[#8696a0] leading-relaxed">
                Send and receive secure real-time messages. Select a dialogue or dynamic group from the side pane to launch high-fidelity workflows.
              </p>
              <div className="mt-8 pt-6 border-t border-[#e9edef] dark:border-[#2a3942] w-full max-w-sm text-xs text-[#8696a0] flex items-center justify-center gap-1.5">
                <span>🔒</span> End-to-end encrypted architecture active.
              </div>
            </div>
          )}
        </div>

        {/* Modals & Dialog Controllers */}
        {showNewGroupModal && <NewGroupModal allUsers={users} onClose={() => setShowNewGroupModal(false)} onGroupCreated={() => void loadData()} />}
        <WhatsAppFeaturesHub open={showFeaturesHub} onOpenChange={setShowFeaturesHub} />
        <InviteUserModal open={showInviteModal} onOpenChange={setShowInviteModal} />
        <BroadcastModal open={showBroadcastModal} onOpenChange={setShowBroadcastModal} users={users} />
        <CallHistoryModal open={showCallHistory} onOpenChange={setShowCallHistory} onCallback={(id) => { const p = users.find(u => u.id === id); if(p) openPeer(p); }} />
        <CommunityHub open={showCommunities} onOpenChange={setShowCommunities} users={users} />
        <AdvancedSettingsModal open={showAdvancedSettings} onOpenChange={setShowAdvancedSettings} />
        <GlobalSearchModal open={showGlobalSearch} onOpenChange={setShowGlobalSearch} users={users} groups={groups} onOpenDm={openPeer} onOpenGroup={(g) => { const f = groups.find(x => x.id === g.id); if(f) openGroup(f); }} />
        <StarredMessagesModal open={showStarred} onOpenChange={setShowStarred} users={users} groups={groups} onOpenDm={openPeer} onOpenGroup={(g) => { const f = groups.find(x => x.id === g.id); if(f) openGroup(f); }} />
      </div>
    </section>
  );
}

function ChatRow({ onOpen, active, avatar, title, subtitle, time, unread, isPinned, isMuted, isArchived, onTogglePin, onToggleArchive, onToggleMute }: any) {
  const [menuOpen, setMenuOpen] = useState(false);
  return (
    <div
      onClick={onOpen}
      className={cn(
        "group relative flex w-full items-center gap-4 px-4 py-3 cursor-pointer transition-all border-b border-[#f0f2f5] dark:border-[#222e35]",
        active ? "bg-[#eae6df] dark:bg-[#2a3942]" : "hover:bg-[#f5f6f6] dark:hover:bg-[#202c33]",
      )}
    >
      {avatar}
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between">
          <p className="truncate text-[15px] font-medium text-[#111b21] dark:text-[#e9edef] flex items-center gap-1.5">
            {title}
            {isMuted && <BellOff className="h-3.5 w-3.5 text-[#8696a0]" />}
          </p>
          <span className="text-xs text-[#667781] dark:text-[#8696a0] font-light">{time}</span>
        </div>
        <div className="flex items-center justify-between mt-0.5">
          <p className="truncate text-[13px] text-[#667781] dark:text-[#8696a0] pr-2">{subtitle}</p>
          <div className="flex items-center gap-1.5 shrink-0">
            {isPinned && <Pin className="h-3.5 w-3.5 text-[#8696a0] transform rotate-45" />}
            {unread > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-[#00a884] px-1 text-[11px] font-bold text-white">
                {unread}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Row context configurations */}
      <button
        onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen); }}
        className="opacity-0 group-hover:opacity-100 p-1 rounded-full text-[#667781] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248] transition-all absolute right-2"
      >
        <ChevronDown className="h-5 w-5" />
      </button>

      {menuOpen && (
        <div onClick={(e) => e.stopPropagation()} className="absolute right-6 top-12 z-50 w-44 rounded-md bg-white dark:bg-[#233138] shadow-xl border border-[#f0f2f5] dark:border-[#2f3b43] py-1 text-sm text-[#111b21] dark:text-[#e9edef]">
          <button onClick={() => { onTogglePin(); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#182229]"><Pin className="h-4 w-4" /> {isPinned ? "Unpin Chat" : "Pin Chat"}</button>
          <button onClick={() => { onToggleMute(); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#182229]"><BellOff className="h-4 w-4" /> {isMuted ? "Unmute Notifications" : "Mute Notifications"}</button>
          <button onClick={() => { onToggleArchive(); setMenuOpen(false); }} className="flex w-full items-center gap-3 px-4 py-2.5 hover:bg-[#f5f6f6] dark:hover:bg-[#182229]"><Archive className="h-4 w-4" /> {isArchived ? "Unarchive" : "Archive Chat"}</button>
        </div>
      )}
    </div>
  );
}

function ChatWindow({ peer, presence, onBack, allUsers }: any) {
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
  const [forwardingMessage, setForwardingMessage] = useState<DM | null>(null);
  const [showDisappearingOptions, setShowDisappearingOptions] = useState(false);
  const [showGifPicker, setShowGifPicker] = useState(false);
  const [showStickerPicker, setShowStickerPicker] = useState(false);
  const [showScheduleDialog, setShowScheduleDialog] = useState(false);
  const [viewOnceArmed, setViewOnceArmed] = useState(false);
  const [showContactPicker, setShowContactPicker] = useState(false);
  const [showLiveLocationMenu, setShowLiveLocationMenu] = useState(false);
  
  const videoInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const liveLocationRef = useRef<any>(null);

  const [callState, setCallState] = useState<CallState>("idle");
  const [callType, setCallType] = useState<CallType>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callDuration, setCallDuration] = useState(0);
  const currentCallIdRef = useRef<string | null>(null);
  const currentCallRoomRef = useRef<string | null>(null);
  const callStateRef = useRef<CallState>("idle");
  const ringtoneRef = useRef<HTMLAudioElement | null>(null);

  const callManagerRef = useRef<CallManager | null>(null);
  useEffect(() => {
    if (!callManagerRef.current && typeof window !== "undefined") {
      callManagerRef.current = new CallManager();
    }
  }, []);

  const typingChannelRef = useRef<any>(null);
  const typingReadyRef = useRef(false);
  const lastTypingSent = useRef(0);
  const typingTimeoutRef = useRef<number | null>(null);
  const signalingChannelRef = useRef<any>(null);
  const [incomingOffer, setIncomingOffer] = useState<any>(null);
  const [isRinging, setIsRinging] = useState(false);

  useEffect(() => {
    callStateRef.current = callState;
  }, [callState]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("direct_messages")
        .select("*")
        .or(`and(sender_id.eq.${user.id},recipient_id.eq.${peer.id}),and(sender_id.eq.${peer.id},recipient_id.eq.${user.id})`)
        .order("created_at", { ascending: true })
        .limit(500);

      if (cancelled) return;
      setMessages((data ?? []) as DM[]);

      await supabase
        .from("direct_messages")
        .update({ read_at: new Date().toISOString() })
        .eq("sender_id", peer.id)
        .eq("recipient_id", user.id)
        .is("read_at", null);
    })();
    return () => { cancelled = true; };
  }, [user, peer.id]);

  useEffect(() => {
    if (!user) return;
    const msgCh = supabase
      .channel(`dm:${peer.id}`)
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as DM;
        if ((m.sender_id === user.id && m.recipient_id === peer.id) || (m.sender_id === peer.id && m.recipient_id === user.id)) {
          setMessages((prev) => (prev.some((x) => x.id === m.id) ? prev : [...prev, m]));
          if (m.sender_id === peer.id) {
            void supabase.from("direct_messages").update({ read_at: new Date().toISOString() }).eq("id", m.id);
          }
        }
      })
      .on("postgres_changes", { event: "UPDATE", schema: "public", table: "direct_messages" }, (payload) => {
        const m = payload.new as DM;
        setMessages((prev) => prev.map((x) => (x.id === m.id ? m : x)));
      })
      .subscribe();

    const typingCh = supabase.channel(TYPING_CHANNEL(user.id, peer.id), { config: { broadcast: { self: false } } });
    typingCh
      .on("broadcast", { event: "typing" }, (payload) => {
        if (payload.payload?.from === peer.id) {
          setPeerTyping(true);
          if (typingTimeoutRef.current) window.clearTimeout(typingTimeoutRef.current);
          typingTimeoutRef.current = window.setTimeout(() => setPeerTyping(false), 2500);
        }
      })
      .subscribe((status) => { typingReadyRef.current = status === "SUBSCRIBED"; });
    
    return () => {
      void supabase.removeChannel(msgCh);
      void supabase.removeChannel(typingCh);
    };
  }, [user, peer.id]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, peerTyping]);

  const sendTyping = () => {
    if (!typingReadyRef.current || !typingChannelRef.current) return;
    const now = Date.now();
    if (now - lastTypingSent.current < 1500) return;
    lastTypingSent.current = now;
    void typingChannelRef.current.send({ type: "broadcast", event: "typing", payload: { from: user?.id } });
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
        content: overrides?.attachment_url ? (overrides?.content ?? null) : content || null,
        attachment_url: overrides?.attachment_url ?? null,
        attachment_type: overrides?.attachment_type ?? null,
        attachment_name: overrides?.attachment_name ?? null,
        view_once: overrides?.view_once ?? viewOnceArmed,
        scheduled_for: overrides?.scheduled_for ?? null,
      };
      const { data, error } = await supabase.from("direct_messages").insert(payload as never).select().single();
      if (!error && data) setMessages((prev) => [...prev, data as DM]);
      setText("");
      setViewOnceArmed(false);
    } finally {
      setSending(false);
    }
  };

  const uploadAndSend = async (file: File, type: "image" | "file" | "voice" | "video") => {
    if (!user) return;
    setSending(true);
    try {
      const ext = file.name.split(".").pop() ?? "bin";
      const path = `${user.id}/${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("chat-attachments").upload(path, file);
      if (upErr) throw upErr;
      const { data: signed } = await supabase.storage.from("chat-attachments").createSignedUrl(path, 31536000);
      await sendMessage({ attachment_url: signed?.signedUrl ?? "", attachment_type: type, attachment_name: file.name });
    } finally {
      setSending(false);
    }
  };

  const filteredMessages = useMemo(() => {
    return messages.filter((m) => !m.scheduled_for);
  }, [messages]);

  return (
    <div className="flex flex-col h-full w-full bg-[#efeae2] dark:bg-[#0b141a]">
      {/* Top Windows Header */}
      <div className="flex items-center justify-between bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2 h-[60px] border-b border-[#e9edef] dark:border-[#2f3b43] shrink-0 z-20 shadow-sm">
        <div className="flex items-center gap-3 min-w-0">
          <button onClick={onBack} className="md:hidden p-1 rounded-full hover:bg-[#d9dbde] dark:hover:bg-[#374248] text-[#54656f] dark:text-[#aebac1]"><ArrowLeft className="h-5 w-5" /></button>
          <div className="h-10 w-10 rounded-full bg-cover bg-center overflow-hidden shrink-0 bg-gray-300">
            {peer.avatar_url && <img src={peer.avatar_url} alt="" className="h-full w-full object-cover" />}
          </div>
          <div className="min-w-0">
            <h3 className="text-base font-medium text-[#111b21] dark:text-[#e9edef] truncate">{peer.display_name || "User"}</h3>
            <p className="text-xs text-[#667781] dark:text-[#8696a0] truncate">{peerTyping ? "typing..." : presence?.is_online ? "online" : "offline"}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => startCall?.("voice")} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248]"><Phone className="h-5 w-5" /></button>
          <button onClick={() => startCall?.("video")} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248]"><VideoIcon className="h-5 w-5" /></button>
          <button onClick={() => setShowInfo(!showInfo)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248]"><Info className="h-5 w-5" /></button>
        </div>
      </div>

      {/* Messages Feed View */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-6 py-4 space-y-2.5 custom-scrollbar">
        {filteredMessages.map((m) => {
          const isMine = m.sender_id === user?.id;
          return (
            <div key={m.id} className={cn("flex w-full mb-1", isMine ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[65%] rounded-lg px-3 py-1.5 text-[14.5px] shadow-sm relative group tracking-wide break-words", isMine ? "bg-[#d9fdd3] dark:bg-[#005c4b] text-[#111b21] dark:text-[#e9edef] rounded-tr-none" : "bg-white dark:bg-[#202c33] text-[#111b21] dark:text-[#e9edef] rounded-tl-none")}>
                {m.attachment_type === "image" && m.attachment_url && <img src={m.attachment_url} className="rounded-md max-h-60 object-cover mb-1 w-full" />}
                <p>{m.content}</p>
                <div className="flex items-center justify-end gap-1 mt-1 text-[10px] text-[#667781] dark:text-[#8696a0] select-none text-right float-right ml-4">
                  <span>{formatTime(m.created_at)}</span>
                  {isMine && (m.read_at ? <CheckCheck className="h-3.5 w-3.5 text-[#53bdeb]" /> : <Check className="h-3.5 w-3.5" />)}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Message Composer Footer Panel */}
      <div className="bg-[#f0f2f5] dark:bg-[#202c33] px-4 py-2.5 flex items-center gap-3 shadow-inner shrink-0 z-20">
        <div className="flex items-center gap-1.5">
          <button onClick={() => setShowEmoji(!showEmoji)} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248]"><Smile className="h-6 w-6" /></button>
          <button onClick={() => fileInputRef.current?.click()} className="p-2 rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-[#d9dbde] dark:hover:bg-[#374248]"><Paperclip className="h-5 w-5" /></button>
        </div>

        <input ref={fileInputRef} type="file" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if(f) void uploadAndSend(f, "file"); }} />

        <input
          value={text}
          onChange={(e) => { setText(e.target.value); sendTyping(); }}
          onKeyDown={(e) => { if (e.key === "Enter") void sendMessage(); }}
          placeholder="Type a message"
          className="flex-1 bg-white dark:bg-[#2a3942] rounded-lg px-4 py-2 text-sm text-[#111b21] dark:text-[#e9edef] placeholder-[#667781] dark:placeholder-[#aebac1] outline-none"
        />

        <button
          onClick={() => void sendMessage()}
          disabled={!text.trim() || sending}
          className="p-2.5 bg-[#00a884] hover:bg-[#008069] text-white rounded-full transition-all flex items-center justify-center shrink-0 disabled:opacity-50 shadow-md"
        >
          <Send className="h-5 w-5" />
        </button>
      </div>
    </div>
  );
}

/* Group Component Framework Layout Module */
function GroupChatWindow({ group, onBack, allUsers }: any) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center bg-white dark:bg-[#111b21] h-full">
      <div className="text-center p-6">
        <Users className="h-16 w-16 text-[#00a884] mx-auto mb-4" />
        <h2 className="text-xl font-semibold mb-2">{group.name}</h2>
        <p className="text-sm text-[#667781]">Secure Enterprise Workspace Core Modules Enabled.</p>
        <button onClick={onBack} className="mt-4 px-4 py-2 bg-[#00a884] text-white text-sm font-medium rounded-full shadow-md">Go Back</button>
      </div>
    </div>
  );
}

function VoiceRecorder({ onRecorded }: { onRecorded: (f: File) => void }) {
  return (
    <button className="flex h-10 w-10 items-center justify-center rounded-full text-[#54656f] dark:text-[#aebac1] hover:bg-black/5">
      <Mic className="h-5 w-5" />
    </button>
  );
}

function VoicePlayer({ url }: { url: string; mine: boolean }) {
  return (
    <div className="flex items-center gap-2 p-2 bg-black/5 rounded-md min-w-[200px]">
      <Play className="h-4 w-4 shrink-0 cursor-pointer" />
      <div className="h-1 bg-gray-300 dark:bg-gray-600 flex-1 rounded" />
    </div>
  );
}
