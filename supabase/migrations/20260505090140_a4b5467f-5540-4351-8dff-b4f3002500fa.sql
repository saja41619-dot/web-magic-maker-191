
-- Add columns to direct_messages
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid,
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

-- Allow sender to update own message (edit / delete-for-all)
DROP POLICY IF EXISTS "Sender can update own message" ON public.direct_messages;
CREATE POLICY "Sender can update own message"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Allow sender to update group message
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS edited_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS deleted_for_all boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS forwarded boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS expires_at timestamp with time zone;

DROP POLICY IF EXISTS "Sender can update own group message" ON public.group_messages;
CREATE POLICY "Sender can update own group message"
  ON public.group_messages FOR UPDATE TO authenticated
  USING (auth.uid() = sender_id)
  WITH CHECK (auth.uid() = sender_id);

-- Reactions
CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid NOT NULL,
  message_kind text NOT NULL CHECK (message_kind IN ('dm','group')),
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id, emoji)
);
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users view reactions on accessible messages"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (
    (message_kind = 'dm' AND EXISTS (
      SELECT 1 FROM public.direct_messages dm
      WHERE dm.id = message_reactions.message_id
        AND (auth.uid() = dm.sender_id OR auth.uid() = dm.recipient_id)
    ))
    OR
    (message_kind = 'group' AND EXISTS (
      SELECT 1 FROM public.group_messages gm
      WHERE gm.id = message_reactions.message_id
        AND public.is_group_member(gm.group_id, auth.uid())
    ))
  );

CREATE POLICY "Users add own reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Starred / Pinned / Archived / Muted (per user, per chat)
CREATE TABLE IF NOT EXISTS public.user_chat_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  chat_kind text NOT NULL CHECK (chat_kind IN ('dm','group')),
  chat_key text NOT NULL, -- other user_id (dm) or group_id
  pinned boolean NOT NULL DEFAULT false,
  archived boolean NOT NULL DEFAULT false,
  muted_until timestamptz,
  wallpaper text,
  disappearing_seconds integer, -- null = off
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, chat_kind, chat_key)
);
ALTER TABLE public.user_chat_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own chat settings"
  ON public.user_chat_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Starred messages
CREATE TABLE IF NOT EXISTS public.starred_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  message_id uuid NOT NULL,
  message_kind text NOT NULL CHECK (message_kind IN ('dm','group')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (user_id, message_id)
);
ALTER TABLE public.starred_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own stars"
  ON public.starred_messages FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Status / Stories
CREATE TABLE IF NOT EXISTS public.status_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  content text,
  media_url text,
  media_type text CHECK (media_type IN ('image','video')),
  background text,
  created_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '24 hours')
);
ALTER TABLE public.status_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated view active statuses"
  ON public.status_posts FOR SELECT TO authenticated
  USING (expires_at > now());

CREATE POLICY "Users insert own status"
  ON public.status_posts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own status"
  ON public.status_posts FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

-- Status views
CREATE TABLE IF NOT EXISTS public.status_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL,
  viewer_id uuid NOT NULL,
  viewed_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (status_id, viewer_id)
);
ALTER TABLE public.status_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "View own & viewers of own status"
  ON public.status_views FOR SELECT TO authenticated
  USING (
    auth.uid() = viewer_id
    OR EXISTS (SELECT 1 FROM public.status_posts s WHERE s.id = status_views.status_id AND s.user_id = auth.uid())
  );

CREATE POLICY "Users record own views"
  ON public.status_views FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = viewer_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_reactions;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_chat_settings;
ALTER PUBLICATION supabase_realtime ADD TABLE public.starred_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_posts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.status_views;

-- Cron-like cleanup of expired statuses & disappearing msgs (function)
CREATE OR REPLACE FUNCTION public.cleanup_expired_messages()
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  DELETE FROM public.status_posts WHERE expires_at <= now();
  DELETE FROM public.direct_messages WHERE expires_at IS NOT NULL AND expires_at <= now();
  DELETE FROM public.group_messages WHERE expires_at IS NOT NULL AND expires_at <= now();
$$;
