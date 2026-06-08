import { useEffect, useState } from "react";
import { X, Shield, Eye, Bell, MessageCircle, Clock } from "lucide-react";

interface Prefs {
  readReceipts: boolean;
  lastSeen: "everyone" | "contacts" | "nobody";
  enterToSend: boolean;
  notificationSound: boolean;
  defaultDisappearing: 0 | 86400 | 604800 | 7776000;
}

const KEY = "advanced-chat-prefs";

const defaults: Prefs = {
  readReceipts: true,
  lastSeen: "everyone",
  enterToSend: true,
  notificationSound: true,
  defaultDisappearing: 0,
};

export function loadPrefs(): Prefs {
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return defaults;
    return { ...defaults, ...(JSON.parse(raw) as Partial<Prefs>) };
  } catch {
    return defaults;
  }
}

function savePrefs(p: Prefs) {
  localStorage.setItem(KEY, JSON.stringify(p));
  window.dispatchEvent(new CustomEvent("chat-prefs-changed", { detail: p }));
}

export function AdvancedSettingsModal({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [prefs, setPrefs] = useState<Prefs>(defaults);

  useEffect(() => {
    if (open) setPrefs(loadPrefs());
  }, [open]);

  if (!open) return null;

  const update = <K extends keyof Prefs>(k: K, v: Prefs[K]) => {
    const next = { ...prefs, [k]: v };
    setPrefs(next);
    savePrefs(next);
  };

  return (
    <div
      className="fixed inset-0 z-[110] flex items-center justify-center bg-background/90 backdrop-blur-sm p-4"
      onClick={() => onOpenChange(false)}
    >
      <div
        className="w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl bg-card shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h2 className="font-display text-lg font-semibold flex items-center gap-2">
            <Shield className="h-5 w-5" /> Advanced settings
          </h2>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="p-4 space-y-5">
          <Section title="Privacy" icon={<Eye className="h-4 w-4" />}>
            <Toggle
              label="Read receipts"
              hint="Let others see when you've read their messages"
              checked={prefs.readReceipts}
              onChange={(v) => update("readReceipts", v)}
            />
            <Select
              label="Last seen"
              value={prefs.lastSeen}
              onChange={(v) => update("lastSeen", v as Prefs["lastSeen"])}
              options={[
                { v: "everyone", l: "Everyone" },
                { v: "contacts", l: "Contacts only" },
                { v: "nobody", l: "Nobody" },
              ]}
            />
          </Section>

          <Section title="Chats" icon={<MessageCircle className="h-4 w-4" />}>
            <Toggle
              label="Enter is send"
              hint="Press Enter to send messages (Shift+Enter for newline)"
              checked={prefs.enterToSend}
              onChange={(v) => update("enterToSend", v)}
            />
          </Section>

          <Section title="Notifications" icon={<Bell className="h-4 w-4" />}>
            <Toggle
              label="Notification sound"
              hint="Play a sound for new messages"
              checked={prefs.notificationSound}
              onChange={(v) => update("notificationSound", v)}
            />
          </Section>

          <Section title="Disappearing messages" icon={<Clock className="h-4 w-4" />}>
            <Select
              label="Default for new chats"
              value={String(prefs.defaultDisappearing)}
              onChange={(v) =>
                update("defaultDisappearing", Number(v) as Prefs["defaultDisappearing"])
              }
              options={[
                { v: "0", l: "Off" },
                { v: "86400", l: "24 hours" },
                { v: "604800", l: "7 days" },
                { v: "7776000", l: "90 days" },
              ]}
            />
          </Section>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  icon,
  children,
}: {
  title: string;
  icon: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div>
      <h3 className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
        {icon}
        {title}
      </h3>
      <div className="space-y-2 rounded-xl border border-border p-3">{children}</div>
    </div>
  );
}

function Toggle({
  label,
  hint,
  checked,
  onChange,
}: {
  label: string;
  hint?: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <label className="flex items-center justify-between gap-3 cursor-pointer">
      <div className="flex-1">
        <div className="text-sm font-medium">{label}</div>
        {hint && <div className="text-xs text-muted-foreground">{hint}</div>}
      </div>
      <button
        type="button"
        onClick={() => onChange(!checked)}
        className={`relative h-5 w-9 rounded-full transition ${
          checked ? "bg-primary" : "bg-secondary"
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            checked ? "left-[18px]" : "left-0.5"
          }`}
        />
      </button>
    </label>
  );
}

function Select({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { v: string; l: string }[];
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <div className="text-sm font-medium">{label}</div>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-lg border border-border bg-background px-2 py-1 text-sm outline-none focus:border-primary"
      >
        {options.map((o) => (
          <option key={o.v} value={o.v}>
            {o.l}
          </option>
        ))}
      </select>
    </div>
  );
}
