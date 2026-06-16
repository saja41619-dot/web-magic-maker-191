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
  Camera,
  MapPin,
  Scan,
  UploadCloud,
  User,
  UserPlus,
  Lock,
  Voicemail,
  Link as LinkIcon,
  Video,
  VideoOff,
  MicOff,
  Disc,
  CameraOff,
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
import { ChatBubble } from "./ChatBubble";
import { DateDivider } from "./DateDivider"; // Assuming this will be created

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

// --- Data Interfaces ---
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
  attachment_type: "image" | "file" | "voice" | "video" | "contact" | "location" | null;
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
  poll_id?: string | null;
  // Replied message details for display
  replied_message?: {
    content: string;
    profiles: {
      display_name: string | null;
    } | null;
  } | null;
}

interface ChatGroup {
  id: string;
  name: string;
  avatar_url: string | null;
  created_at: string;
  created_by: string;
}

interface Presence {
  user_id: string;
  is_online: boolean;
  last_seen_at: string;
}

// --- Constants ---
const TYPING_CHANNEL = (a: string, b: string) => `typing:${[a, b].sort().join(":")}`;

const QUICK_REACTIONS = ["👍", "❤️", "😂", "😮", "😢", "🙏"];

// --- Component ---
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
  const [loading, setLoading] = useState(true);

  const [chatSettings, setChatSettings] = useState<Record<string, ChatSetting>>({});
  const [showArchived, setShowArchived] = useState(false);

  // Chat State & UI State
  const [messageInput, setMessageInput] = useState("");
  const [isEmojiPickerOpen, setIsEmojiPickerOpen] = useState(false);
  const [typingStatus, setTypingStatus] = useState("");
  const [incomingCall, setIncomingCall] = useState<any>(null); // Handle incoming call details
  const [currentCall, setCurrentCall] = useState<CallState | null>(null);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [remoteStream, setRemoteStream] = useState<MediaStream | null>(null);
  const [callType, setCallType] = useState<CallType | undefined>(undefined);
  const [callPeerName, setCallPeerName] = useState(""); // For the UI
  const [callDuration, setCallDuration] = useState(0);
  const callTimerRef = useRef<number | null>(null);
  const webrtcRef = useRef<CallManager | null>(null);

  const settingFor = (kind: "dm" | "group", key: string) => chatSettings[`${kind}:${key}`];

  const reloadSettings = async () => {
    if (!user) return;
    const map = await loadChatSettings(user.id);
    setChatSettings(map);
  };

  const updateSetting = async (
    kind: "dm" | "group",
    key: string,
    patch: Partial<Omit<ChatSetting, "chat_kind" | "chat_key">>, // Ensure these are the correct selectable fields
  ) => {
    if (!user) return;
    await upsertChatSetting(user.id, kind, key, patch);
    await reloadSettings();
  };

  // --- Data Loading ---
  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const { data: profiles } = await supabase.from("profiles").select("*," +
            "user_presence(*)" // join presence data
            ).neq("id", user.id);
      const { data: pres } = await supabase.from("user_presence").select("*");
      const { data: grps, error: grpErr } = await supabase.from("chat_groups").select("*," +
            "group_members(user_id)" // join members for initial group list
            );

      if (grpErr) {
        console.error("Error loading groups:", grpErr);
      }

      setUsers(profiles ?? []);
      const pmap: Record<string, Presence> = {};
      (pres ?? []).forEach((p: any) => {
        pmap[p.user_id] = p;
      });
      setPresence(pmap);

      if (grps)
