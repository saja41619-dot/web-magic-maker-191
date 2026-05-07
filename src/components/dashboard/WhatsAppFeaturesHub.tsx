import { useEffect, useState, type ReactNode } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { toast } from "sonner";
import {
  MessageSquare,
  Image as ImageIcon,
  Phone,
  Circle,
  Users,
  Shield,
  Smartphone,
  Palette,
  Radio,
  Search,
  Sparkles,
  Lock,
  Eye,
  Bell,
  Camera,
  MapPin,
  FileText,
  Mic,
  Video,
  Sticker,
  Vote,
  Calendar,
  PinIcon,
  Archive,
  Star,
  Forward,
  Edit,
  Trash2,
  Reply,
  Timer,
  Languages,
  Moon,
  Type,
  Fingerprint,
  KeyRound,
  ShieldCheck,
  Wifi,
  Monitor,
  CheckCircle2,
  Megaphone,
  PartyPopper,
  Smile,
  Hand,
  AtSign,
  EyeOff,
  Ban,
  Flag,
  ScreenShare,
  PictureInPicture,
  Link as LinkIcon,
  Download,
} from "lucide-react";

type IconType = typeof MessageSquare;

interface FeatureItem {
  id: string;
  label: string;
  icon: IconType;
  type?: "toggle" | "action";
  defaultOn?: boolean;
  description?: string;
}

interface FeatureCategory {
  id: string;
  title: string;
  icon: IconType;
  color: string;
  features: FeatureItem[];
}

const CATEGORIES: FeatureCategory[] = [
  {
    id: "messaging",
    title: "Messaging",
    icon: MessageSquare,
    color: "var(--wa-teal)",
    features: [
      { id: "one_to_one", label: "One-to-one chat", icon: MessageSquare, defaultOn: true },
      { id: "group_chat", label: "Group chat", icon: Users, defaultOn: true },
      { id: "broadcast", label: "Broadcast message", icon: Megaphone, defaultOn: true },
      { id: "disappearing", label: "Disappearing messages", icon: Timer },
      { id: "view_once", label: "View once photos/videos", icon: Eye },
      { id: "starred", label: "Starred messages", icon: Star, defaultOn: true },
      { id: "edit", label: "Message edit", icon: Edit, defaultOn: true },
      { id: "delete_all", label: "Delete for everyone", icon: Trash2, defaultOn: true },
      { id: "reply", label: "Reply to specific message", icon: Reply, defaultOn: true },
      { id: "forward", label: "Forward messages", icon: Forward, defaultOn: true },
      { id: "pin_chats", label: "Pin chats", icon: PinIcon, defaultOn: true },
      { id: "archive", label: "Archive chats", icon: Archive, defaultOn: true },
      { id: "unread_filter", label: "Unread filter", icon: Bell },
      { id: "search_msgs", label: "Search messages", icon: Search, defaultOn: true },
      { id: "reactions", label: "Emoji reactions", icon: Smile, defaultOn: true },
      { id: "gif", label: "GIF support", icon: Sparkles },
      { id: "stickers", label: "Stickers", icon: Sticker },
      { id: "avatar_stickers", label: "Avatar stickers", icon: Hand },
      { id: "polls", label: "Polls", icon: Vote, defaultOn: true },
      { id: "scheduled_events", label: "Scheduled event messages", icon: Calendar },
      { id: "draft", label: "Draft saving", icon: FileText, defaultOn: true },
    ],
  },
  {
    id: "media",
    title: "Media Sharing",
    icon: ImageIcon,
    color: "#06b6d4",
    features: [
      { id: "photos", label: "Photos", icon: ImageIcon, defaultOn: true },
      { id: "videos", label: "Videos", icon: Video, defaultOn: true },
      { id: "hd_media", label: "HD photo/video sending", icon: Sparkles },
      { id: "documents", label: "Documents (PDF, DOCX)", icon: FileText, defaultOn: true },
      { id: "audio_files", label: "Audio files", icon: Mic, defaultOn: true },
      { id: "voice_notes", label: "Voice notes", icon: Mic, defaultOn: true },
      { id: "contact_share", label: "Contact sharing", icon: Users },
      { id: "location_share", label: "Location sharing", icon: MapPin },
      { id: "live_location", label: "Live location", icon: MapPin },
      { id: "camera", label: "Camera integration", icon: Camera },
      { id: "status_upload", label: "Status upload", icon: Circle, defaultOn: true },
      { id: "screen_share_call", label: "Screen sharing in calls", icon: ScreenShare },
    ],
  },
  {
    id: "calling",
    title: "Calling",
    icon: Phone,
    color: "#16a34a",
    features: [
      { id: "voice_call", label: "Voice calls", icon: Phone, defaultOn: true },
      { id: "video_call", label: "Video calls", icon: Video, defaultOn: true },
      { id: "group_voice", label: "Group voice calls", icon: Phone },
      { id: "group_video", label: "Group video calls", icon: Video },
      { id: "call_links", label: "Call links", icon: LinkIcon },
      { id: "mute_call", label: "Call mute / unmute", icon: Mic, defaultOn: true },
      { id: "switch_cam", label: "Front / back camera switch", icon: Camera, defaultOn: true },
      { id: "pip_video", label: "Picture-in-picture video call", icon: PictureInPicture },
      { id: "multi_device_call", label: "Multi-device call sync", icon: Smartphone },
    ],
  },
  {
    id: "status",
    title: "Status",
    icon: Circle,
    color: "#a855f7",
    features: [
      { id: "text_status", label: "Text status", icon: Type, defaultOn: true },
      { id: "photo_status", label: "Photo status", icon: ImageIcon, defaultOn: true },
      { id: "video_status", label: "Video status", icon: Video },
      { id: "voice_status", label: "Voice status", icon: Mic },
      { id: "status_reactions", label: "Emoji / status reactions", icon: Smile },
      { id: "status_privacy", label: "Privacy controls for status", icon: Shield, defaultOn: true },
      { id: "status_mention", label: "Mention / tag in status", icon: AtSign },
    ],
  },
  {
    id: "community",
    title: "Community & Groups",
    icon: Users,
    color: "#f59e0b",
    features: [
      { id: "communities", label: "Communities", icon: Users, defaultOn: true },
      { id: "multi_groups", label: "Multiple groups inside community", icon: Users },
      { id: "announcement_groups", label: "Announcement groups", icon: Megaphone },
      { id: "admin_controls", label: "Admin controls", icon: Shield, defaultOn: true },
      { id: "member_approval", label: "Member approval", icon: CheckCircle2 },
      { id: "invite_links", label: "Group invite links", icon: LinkIcon, defaultOn: true },
      { id: "admin_delete", label: "Admin delete message", icon: Trash2 },
      { id: "group_events", label: "Group events", icon: PartyPopper },
      { id: "group_polls", label: "Polls in groups", icon: Vote, defaultOn: true },
    ],
  },
  {
    id: "privacy",
    title: "Privacy & Security",
    icon: Shield,
    color: "#dc2626",
    features: [
      { id: "e2e", label: "End-to-end encryption", icon: Lock, defaultOn: true },
      { id: "two_step", label: "Two-step verification", icon: KeyRound },
      { id: "fingerprint", label: "Fingerprint lock", icon: Fingerprint },
      { id: "face_unlock", label: "Face unlock", icon: Eye },
      { id: "chat_lock", label: "Chat lock", icon: Lock },
      { id: "secret_code", label: "Secret code for locked chats", icon: KeyRound },
      { id: "privacy_controls", label: "Privacy controls", icon: Shield, defaultOn: true },
      { id: "last_seen_ctrl", label: "Last seen control", icon: EyeOff },
      { id: "hide_online", label: "Online status hide", icon: EyeOff },
      { id: "photo_privacy", label: "Profile photo privacy", icon: Shield },
      { id: "block_contacts", label: "Block contacts", icon: Ban },
      { id: "report_users", label: "Report users", icon: Flag },
      { id: "screenshot_block", label: "Screenshot restriction (view once)", icon: ShieldCheck },
      { id: "encrypted_backup", label: "Encrypted backups", icon: Lock },
    ],
  },
  {
    id: "multi_device",
    title: "Multi-Device",
    icon: Smartphone,
    color: "#0ea5e9",
    features: [
      { id: "web", label: "Connect Web", icon: Wifi, defaultOn: true },
      { id: "desktop", label: "Desktop app", icon: Monitor },
      { id: "multi_login", label: "Multi-device login", icon: Smartphone, defaultOn: true },
      { id: "companion", label: "Companion mode", icon: Smartphone },
      { id: "sync_devices", label: "Sync across devices", icon: Wifi, defaultOn: true },
    ],
  },
  {
    id: "customization",
    title: "Customization",
    icon: Palette,
    color: "#ec4899",
    features: [
      { id: "dark_mode", label: "Dark mode", icon: Moon },
      { id: "wallpapers", label: "Custom wallpapers", icon: ImageIcon, defaultOn: true },
      { id: "tones", label: "Custom notification tones", icon: Bell },
      { id: "font_size", label: "Font size control", icon: Type, defaultOn: true },
      { id: "themes", label: "Chat themes", icon: Palette, defaultOn: true },
      { id: "avatar_create", label: "Avatar creation", icon: Hand },
    ],
  },
  {
    id: "channels",
    title: "Channels",
    icon: Radio,
    color: "#7c3aed",
    features: [
      { id: "follow_channels", label: "Follow channels", icon: Radio, defaultOn: true },
      { id: "channel_updates", label: "Channel updates", icon: Bell, defaultOn: true },
      { id: "channel_reactions", label: "Channel reactions", icon: Smile },
      { id: "broadcast_channels", label: "Admin broadcast channels", icon: Megaphone },
      { id: "verified_channels", label: "Verified channels", icon: CheckCircle2 },
    ],
  },
];

const STORAGE_KEY = "wa_features_v1";
const FONT_KEY = "wa_font_size";

function loadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* noop */
  }
  const init: Record<string, boolean> = {};
  CATEGORIES.forEach((c) =>
    c.features.forEach((f) => {
      init[f.id] = !!f.defaultOn;
    }),
  );
  return init;
}

function saveState(s: Record<string, boolean>) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(s));
  } catch {
    /* noop */
  }
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}

export function WhatsAppFeaturesHub({ open, onOpenChange }: Props) {
  const [state, setState] = useState<Record<string, boolean>>({});
  const [activeCategory, setActiveCategory] = useState<string>("messaging");
  const [search, setSearch] = useState("");
  const [fontSize, setFontSize] = useState<number>(14);

  useEffect(() => {
    if (open) {
      setState(loadState());
      const fs = Number(localStorage.getItem(FONT_KEY) ?? "14");
      setFontSize(Number.isFinite(fs) ? fs : 14);
    }
  }, [open]);

  const toggle = (id: string) => {
    setState((prev) => {
      const next = { ...prev, [id]: !prev[id] };
      saveState(next);
      return next;
    });
  };

  const enableAll = () => {
    const next: Record<string, boolean> = {};
    CATEGORIES.forEach((c) => c.features.forEach((f) => (next[f.id] = true)));
    setState(next);
    saveState(next);
    toast.success("All features enabled");
  };

  const resetDefaults = () => {
    const next: Record<string, boolean> = {};
    CATEGORIES.forEach((c) => c.features.forEach((f) => (next[f.id] = !!f.defaultOn)));
    setState(next);
    saveState(next);
    toast.success("Reset to defaults");
  };

  const totalEnabled = Object.values(state).filter(Boolean).length;
  const totalFeatures = CATEGORIES.reduce((acc, c) => acc + c.features.length, 0);

  const filteredCategory = CATEGORIES.find((c) => c.id === activeCategory)!;
  const visibleFeatures = search.trim()
    ? filteredCategory.features.filter((f) =>
        f.label.toLowerCase().includes(search.trim().toLowerCase()),
      )
    : filteredCategory.features;

  const handleAction = (id: string, label: string) => {
    if (id === "invite_links") {
      const link = `${window.location.origin}/invite/${Math.random().toString(36).slice(2, 10)}`;
      navigator.clipboard?.writeText(link);
      toast.success("Invite link copied");
      return;
    }
    if (id === "call_links") {
      const link = `${window.location.origin}/call/${Math.random().toString(36).slice(2, 10)}`;
      navigator.clipboard?.writeText(link);
      toast.success("Call link copied");
      return;
    }
    toast.info(`${label} — coming soon`);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl p-0 overflow-hidden max-h-[90vh]">
        <DialogHeader className="px-6 py-4 border-b" style={{ background: "var(--wa-teal-dark)" }}>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Sparkles className="h-5 w-5" />
            WhatsApp Features Hub
          </DialogTitle>
          <DialogDescription className="text-white/70">
            {totalEnabled} / {totalFeatures} features enabled across {CATEGORIES.length} categories
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-[240px_1fr] h-[70vh]">
          {/* Sidebar categories */}
          <aside className="border-r bg-muted/30 overflow-y-auto">
            <div className="p-3 space-y-1">
              {CATEGORIES.map((c) => {
                const Icon = c.icon;
                const enabled = c.features.filter((f) => state[f.id]).length;
                const isActive = activeCategory === c.id;
                return (
                  <button
                    key={c.id}
                    onClick={() => setActiveCategory(c.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-lg text-left transition-colors ${
                      isActive ? "bg-background shadow-sm" : "hover:bg-background/60"
                    }`}
                  >
                    <div
                      className="h-8 w-8 rounded-lg flex items-center justify-center text-white shrink-0"
                      style={{ background: c.color }}
                    >
                      <Icon className="h-4 w-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-medium truncate">{c.title}</div>
                      <div className="text-[11px] text-muted-foreground">
                        {enabled} / {c.features.length} on
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
            <div className="px-3 pb-3 space-y-2 border-t pt-3">
              <Button size="sm" variant="outline" className="w-full" onClick={enableAll}>
                Enable all
              </Button>
              <Button size="sm" variant="ghost" className="w-full" onClick={resetDefaults}>
                Reset defaults
              </Button>
            </div>
          </aside>

          {/* Main panel */}
          <div className="flex flex-col overflow-hidden">
            <div className="px-6 py-3 border-b flex items-center gap-3">
              <div
                className="h-9 w-9 rounded-lg flex items-center justify-center text-white"
                style={{ background: filteredCategory.color }}
              >
                <filteredCategory.icon className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <div className="font-semibold">{filteredCategory.title}</div>
              </div>
              <div className="relative w-56">
                <Search className="absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search in this category"
                  className="h-9 pl-8"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {/* Special UI inside Customization */}
              {activeCategory === "customization" && (
                <div className="rounded-lg border p-4 mb-4 bg-muted/30">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Type className="h-4 w-4" />
                      <span className="text-sm font-medium">Font size: {fontSize}px</span>
                    </div>
                  </div>
                  <Slider
                    value={[fontSize]}
                    min={12}
                    max={20}
                    step={1}
                    onValueChange={(v) => {
                      setFontSize(v[0]);
                      localStorage.setItem(FONT_KEY, String(v[0]));
                      document.documentElement.style.setProperty("--wa-font-size", `${v[0]}px`);
                    }}
                  />
                </div>
              )}

              {visibleFeatures.length === 0 && (
                <div className="text-center py-12 text-muted-foreground text-sm">
                  No features matching "{search}"
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {visibleFeatures.map((f) => {
                  const Icon = f.icon;
                  const on = !!state[f.id];
                  const isAction = f.id === "invite_links" || f.id === "call_links";
                  return (
                    <FeatureRow
                      key={f.id}
                      icon={<Icon className="h-4 w-4" />}
                      label={f.label}
                      on={on}
                      action={
                        isAction ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleAction(f.id, f.label)}
                          >
                            <LinkIcon className="h-3.5 w-3.5 mr-1" /> Copy
                          </Button>
                        ) : (
                          <Switch checked={on} onCheckedChange={() => toggle(f.id)} />
                        )
                      }
                    />
                  );
                })}
              </div>

              <div className="pt-4 text-[11px] text-muted-foreground text-center">
                Settings are stored locally on this device. Toggles control how features appear in
                your Connect experience.
              </div>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

function FeatureRow({
  icon,
  label,
  on,
  action,
}: {
  icon: ReactNode;
  label: string;
  on: boolean;
  action: ReactNode;
}) {
  return (
    <div
      className={`flex items-center gap-3 rounded-lg border px-3 py-2.5 transition-colors ${
        on ? "bg-background" : "bg-muted/40"
      }`}
    >
      <div
        className={`h-8 w-8 rounded-md flex items-center justify-center shrink-0 ${
          on ? "text-white" : "text-muted-foreground bg-muted"
        }`}
        style={on ? { background: "var(--wa-teal)" } : undefined}
      >
        {icon}
      </div>
      <div className="flex-1 min-w-0 text-sm font-medium truncate">{label}</div>
      {action}
    </div>
  );
}
