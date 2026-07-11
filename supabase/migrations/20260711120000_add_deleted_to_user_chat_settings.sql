ALTER TABLE public.user_chat_settings
ADD COLUMN IF NOT EXISTS deleted boolean NOT NULL DEFAULT false;
