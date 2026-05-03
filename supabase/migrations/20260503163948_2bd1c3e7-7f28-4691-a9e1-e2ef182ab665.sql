-- Direct messages table for 1-to-1 chat
CREATE TABLE public.direct_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL,
  recipient_id uuid NOT NULL,
  content text,
  attachment_url text,
  attachment_type text CHECK (attachment_type IN ('image','file','voice')),
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now(),
  read_at timestamptz,
  CHECK (sender_id <> recipient_id),
  CHECK (content IS NOT NULL OR attachment_url IS NOT NULL)
);

CREATE INDEX idx_dm_pair ON public.direct_messages (sender_id, recipient_id, created_at DESC);
CREATE INDEX idx_dm_recipient ON public.direct_messages (recipient_id, created_at DESC);

ALTER TABLE public.direct_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own conversations"
  ON public.direct_messages FOR SELECT TO authenticated
  USING (auth.uid() = sender_id OR auth.uid() = recipient_id);

CREATE POLICY "Users can send messages"
  ON public.direct_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND (
      (content IS NOT NULL AND length(trim(content)) BETWEEN 1 AND 4000)
      OR attachment_url IS NOT NULL
    )
  );

-- Recipients can mark messages as read; senders cannot edit content
CREATE POLICY "Recipient can mark read"
  ON public.direct_messages FOR UPDATE TO authenticated
  USING (auth.uid() = recipient_id)
  WITH CHECK (auth.uid() = recipient_id);

CREATE POLICY "Sender can delete own message"
  ON public.direct_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Presence tracking (online / last seen)
CREATE TABLE public.user_presence (
  user_id uuid PRIMARY KEY,
  last_seen_at timestamptz NOT NULL DEFAULT now(),
  is_online boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_presence ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view presence"
  ON public.user_presence FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Users can upsert own presence"
  ON public.user_presence FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own presence"
  ON public.user_presence FOR UPDATE TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER trg_user_presence_updated
  BEFORE UPDATE ON public.user_presence
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Allow searching/looking up other users' display info for chat
CREATE POLICY "Authenticated users can view profiles for chat"
  ON public.profiles FOR SELECT TO authenticated
  USING (true);

-- Realtime
ALTER TABLE public.direct_messages REPLICA IDENTITY FULL;
ALTER TABLE public.user_presence REPLICA IDENTITY FULL;
ALTER PUBLICATION supabase_realtime ADD TABLE public.direct_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.user_presence;

-- Storage bucket for chat attachments (private)
INSERT INTO storage.buckets (id, name, public) VALUES ('chat-attachments', 'chat-attachments', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can upload to own folder in chat-attachments"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Authenticated can read chat attachments"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'chat-attachments');

CREATE POLICY "Owner can delete chat attachments"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'chat-attachments'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );
