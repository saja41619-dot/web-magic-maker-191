
ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS reply_to_id uuid REFERENCES public.group_messages(id) ON DELETE SET NULL;

CREATE TABLE IF NOT EXISTS public.group_message_reads (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  message_id uuid NOT NULL REFERENCES public.group_messages(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  read_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (message_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_gmr_message ON public.group_message_reads(message_id);
CREATE INDEX IF NOT EXISTS idx_gmr_group_user ON public.group_message_reads(group_id, user_id);

ALTER TABLE public.group_message_reads ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Members can view group reads" ON public.group_message_reads;
CREATE POLICY "Members can view group reads"
  ON public.group_message_reads FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

DROP POLICY IF EXISTS "Members can mark own reads" ON public.group_message_reads;
CREATE POLICY "Members can mark own reads"
  ON public.group_message_reads FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id AND public.is_group_member(group_id, auth.uid()));

DO $$ BEGIN
  PERFORM 1 FROM pg_publication_tables WHERE pubname='supabase_realtime' AND schemaname='public' AND tablename='group_message_reads';
  IF NOT FOUND THEN
    EXECUTE 'ALTER PUBLICATION supabase_realtime ADD TABLE public.group_message_reads';
  END IF;
END $$;
