import { supabase } from "@/integrations/supabase/client";

export type ChatKind = "dm" | "group";

export interface ChatSetting {
  chat_kind: ChatKind;
  chat_key: string;
  pinned: boolean;
  archived: boolean;
  deleted: boolean;
  muted_until: string | null;
  wallpaper: string | null;
  disappearing_seconds: number | null;
}

export interface Reaction {
  id: string;
  message_id: string;
  user_id: string;
  emoji: string;
}

export async function loadChatSettings(userId: string) {
  const { data } = await supabase
    .from("user_chat_settings" as any)
    .select("*")
    .eq("user_id", userId);
  const map: Record<string, ChatSetting> = {};
  ((data ?? []) as any[]).forEach((s) => {
    map[`${s.chat_kind}:${s.chat_key}`] = s as ChatSetting;
  });
  return map;
}

export async function upsertChatSetting(
  userId: string,
  kind: ChatKind,
  key: string,
  patch: Partial<Omit<ChatSetting, "chat_kind" | "chat_key">>,
) {
  const { error } = await supabase
    .from("user_chat_settings" as any)
    .upsert(
      { user_id: userId, chat_kind: kind, chat_key: key, ...patch, updated_at: new Date().toISOString() },
      { onConflict: "user_id,chat_kind,chat_key" },
    );
  if (error) throw error;
}

export async function loadReactions(messageIds: string[]) {
  if (messageIds.length === 0) return {};
  const { data } = await supabase
    .from("message_reactions" as any)
    .select("*")
    .in("message_id", messageIds);
  const map: Record<string, Reaction[]> = {};
  ((data ?? []) as any[]).forEach((r) => {
    map[r.message_id] = [...(map[r.message_id] ?? []), r as Reaction];
  });
  return map;
}

export async function toggleReaction(
  messageId: string,
  kind: ChatKind,
  userId: string,
  emoji: string,
  existing: Reaction[] | undefined,
) {
  const mine = existing?.find((r) => r.user_id === userId && r.emoji === emoji);
  if (mine) {
    await supabase.from("message_reactions" as any).delete().eq("id", mine.id);
  } else {
    await supabase.from("message_reactions" as any).insert({
      message_id: messageId,
      message_kind: kind,
      user_id: userId,
      emoji,
    });
  }
}

export async function loadStars(userId: string) {
  const { data } = await supabase
    .from("starred_messages" as any)
    .select("message_id")
    .eq("user_id", userId);
  const set = new Set<string>();
  ((data ?? []) as any[]).forEach((s) => set.add(s.message_id));
  return set;
}

export async function toggleStar(userId: string, messageId: string, kind: ChatKind, isStarred: boolean) {
  if (isStarred) {
    await supabase
      .from("starred_messages" as any)
      .delete()
      .eq("user_id", userId)
      .eq("message_id", messageId);
  } else {
    await supabase
      .from("starred_messages" as any)
      .insert({ user_id: userId, message_id: messageId, message_kind: kind });
  }
}

export function expiresAtFromSeconds(seconds: number | null | undefined) {
  if (!seconds) return null;
  return new Date(Date.now() + seconds * 1000).toISOString();
}

export const DISAPPEARING_OPTIONS = [
  { label: "Off", value: null },
  { label: "24 hours", value: 86400 },
  { label: "7 days", value: 604800 },
  { label: "90 days", value: 7776000 },
];

export const WALLPAPERS = [
  { label: "Default", value: null },
  { label: "Mint", value: "linear-gradient(135deg, #d4f3e0 0%, #a8e6cf 100%)" },
  { label: "Sunset", value: "linear-gradient(135deg, #ffd6a5 0%, #ffadad 100%)" },
  { label: "Ocean", value: "linear-gradient(135deg, #a0e7ff 0%, #7895cb 100%)" },
  { label: "Lavender", value: "linear-gradient(135deg, #e0c3fc 0%, #8ec5fc 100%)" },
  { label: "Dark", value: "linear-gradient(135deg, #232526 0%, #414345 100%)" },
];
