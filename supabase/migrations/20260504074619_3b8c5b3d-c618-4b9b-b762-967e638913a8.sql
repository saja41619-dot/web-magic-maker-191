
-- Chat groups
CREATE TABLE public.chat_groups (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Group members
CREATE TABLE public.group_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (group_id, user_id)
);

CREATE INDEX idx_group_members_user ON public.group_members(user_id);
CREATE INDEX idx_group_members_group ON public.group_members(group_id);

-- Group messages
CREATE TABLE public.group_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  group_id uuid NOT NULL REFERENCES public.chat_groups(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL,
  content text,
  attachment_url text,
  attachment_type text CHECK (attachment_type IN ('image','file','voice')),
  attachment_name text,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_group_messages_group ON public.group_messages(group_id, created_at DESC);

-- Security definer to avoid recursive RLS on group_members
CREATE OR REPLACE FUNCTION public.is_group_member(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id
  )
$$;

CREATE OR REPLACE FUNCTION public.is_group_admin(_group_id uuid, _user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_members
    WHERE group_id = _group_id AND user_id = _user_id AND role = 'admin'
  )
$$;

-- Enable RLS
ALTER TABLE public.chat_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_messages ENABLE ROW LEVEL SECURITY;

-- chat_groups policies
CREATE POLICY "Authenticated users can create groups"
  ON public.chat_groups FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

CREATE POLICY "Members can view their groups"
  ON public.chat_groups FOR SELECT TO authenticated
  USING (public.is_group_member(id, auth.uid()));

CREATE POLICY "Group admins can update group"
  ON public.chat_groups FOR UPDATE TO authenticated
  USING (public.is_group_admin(id, auth.uid()))
  WITH CHECK (public.is_group_admin(id, auth.uid()));

CREATE POLICY "Group admins can delete group"
  ON public.chat_groups FOR DELETE TO authenticated
  USING (public.is_group_admin(id, auth.uid()));

-- group_members policies
CREATE POLICY "Members can view group membership"
  ON public.group_members FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

-- Allow inserts when: the user is adding themselves, OR the user is the creator of the group (initial setup), OR they are an admin
CREATE POLICY "Add members to group"
  ON public.group_members FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = user_id
    OR EXISTS (SELECT 1 FROM public.chat_groups g WHERE g.id = group_id AND g.created_by = auth.uid())
    OR public.is_group_admin(group_id, auth.uid())
  );

CREATE POLICY "Admins or self can remove member"
  ON public.group_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_group_admin(group_id, auth.uid()));

-- group_messages policies
CREATE POLICY "Members can view group messages"
  ON public.group_messages FOR SELECT TO authenticated
  USING (public.is_group_member(group_id, auth.uid()));

CREATE POLICY "Members can send group messages"
  ON public.group_messages FOR INSERT TO authenticated
  WITH CHECK (
    auth.uid() = sender_id
    AND public.is_group_member(group_id, auth.uid())
    AND ((content IS NOT NULL AND length(trim(content)) BETWEEN 1 AND 4000) OR attachment_url IS NOT NULL)
  );

CREATE POLICY "Sender can delete own group message"
  ON public.group_messages FOR DELETE TO authenticated
  USING (auth.uid() = sender_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.chat_groups;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_members;
ALTER PUBLICATION supabase_realtime ADD TABLE public.group_messages;

-- Updated at trigger for chat_groups
CREATE TRIGGER set_chat_groups_updated_at
BEFORE UPDATE ON public.chat_groups
FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
