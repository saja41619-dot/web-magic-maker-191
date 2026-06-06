
ALTER TABLE public.direct_messages DROP CONSTRAINT IF EXISTS direct_messages_attachment_type_check;
ALTER TABLE public.direct_messages ADD CONSTRAINT direct_messages_attachment_type_check
  CHECK (attachment_type IS NULL OR attachment_type = ANY (ARRAY['image','file','voice','video','gif','sticker','contact','location','live_location']));

ALTER TABLE public.group_messages DROP CONSTRAINT IF EXISTS group_messages_attachment_type_check;
ALTER TABLE public.group_messages ADD CONSTRAINT group_messages_attachment_type_check
  CHECK (attachment_type IS NULL OR attachment_type = ANY (ARRAY['image','file','voice','video','gif','sticker','contact','location','live_location']));

ALTER TABLE public.direct_messages ADD COLUMN IF NOT EXISTS live_location_until timestamptz;
ALTER TABLE public.group_messages ADD COLUMN IF NOT EXISTS live_location_until timestamptz;
