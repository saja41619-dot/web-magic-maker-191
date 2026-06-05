
ALTER TABLE public.direct_messages
  ADD COLUMN IF NOT EXISTS view_once boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz,
  ADD COLUMN IF NOT EXISTS is_broadcast boolean NOT NULL DEFAULT false;

ALTER TABLE public.group_messages
  ADD COLUMN IF NOT EXISTS view_once boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS view_once_opened_at timestamptz,
  ADD COLUMN IF NOT EXISTS scheduled_for timestamptz;

ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_attachment_type_check;
ALTER TABLE public.direct_messages
  ADD CONSTRAINT direct_messages_attachment_type_check
  CHECK (attachment_type IS NULL OR attachment_type = ANY (ARRAY['image','file','voice','video','gif','sticker']));

ALTER TABLE public.group_messages DROP CONSTRAINT IF EXISTS group_messages_attachment_type_check;
ALTER TABLE public.group_messages
  ADD CONSTRAINT group_messages_attachment_type_check
  CHECK (attachment_type IS NULL OR attachment_type = ANY (ARRAY['image','file','voice','video','gif','sticker']));

CREATE INDEX IF NOT EXISTS idx_dm_scheduled ON public.direct_messages (sender_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_gm_scheduled ON public.group_messages (sender_id, scheduled_for) WHERE scheduled_for IS NOT NULL;
