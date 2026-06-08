
ALTER TABLE public.status_posts DROP CONSTRAINT IF EXISTS status_posts_media_type_check;
ALTER TABLE public.status_posts ADD CONSTRAINT status_posts_media_type_check CHECK (media_type IS NULL OR media_type IN ('image','video','audio'));

CREATE TABLE IF NOT EXISTS public.status_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  status_id uuid NOT NULL REFERENCES public.status_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(status_id, user_id, emoji)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.status_reactions TO authenticated;
GRANT ALL ON public.status_reactions TO service_role;

ALTER TABLE public.status_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users insert own reactions" ON public.status_reactions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users delete own reactions" ON public.status_reactions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "View reactions on visible statuses" ON public.status_reactions
  FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.status_posts s WHERE s.id = status_id AND s.expires_at > now())
  );

ALTER PUBLICATION supabase_realtime ADD TABLE public.status_reactions;
