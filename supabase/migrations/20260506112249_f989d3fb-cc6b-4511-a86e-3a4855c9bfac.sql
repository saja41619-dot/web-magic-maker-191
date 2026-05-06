
-- =========================================================
-- CALLS
-- =========================================================
CREATE TABLE public.calls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  room_id text NOT NULL UNIQUE,
  kind text NOT NULL CHECK (kind IN ('dm','group')),
  media text NOT NULL CHECK (media IN ('voice','video')),
  caller_id uuid NOT NULL,
  callee_id uuid,
  group_id uuid,
  status text NOT NULL DEFAULT 'ringing' CHECK (status IN ('ringing','active','ended','missed','declined')),
  started_at timestamptz,
  ended_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX idx_calls_caller ON public.calls(caller_id);
CREATE INDEX idx_calls_callee ON public.calls(callee_id);
CREATE INDEX idx_calls_group ON public.calls(group_id);

ALTER TABLE public.calls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Caller can create call" ON public.calls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = caller_id);

CREATE POLICY "Participants can view calls" ON public.calls FOR SELECT TO authenticated
  USING (
    auth.uid() = caller_id
    OR auth.uid() = callee_id
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

CREATE POLICY "Participants can update call" ON public.calls FOR UPDATE TO authenticated
  USING (
    auth.uid() = caller_id
    OR auth.uid() = callee_id
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  )
  WITH CHECK (
    auth.uid() = caller_id
    OR auth.uid() = callee_id
    OR (group_id IS NOT NULL AND public.is_group_member(group_id, auth.uid()))
  );

-- =========================================================
-- BROADCAST LISTS
-- =========================================================
CREATE TABLE public.broadcast_lists (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid NOT NULL,
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.broadcast_lists ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Owner manages broadcast lists" ON public.broadcast_lists FOR ALL TO authenticated
  USING (auth.uid() = owner_id) WITH CHECK (auth.uid() = owner_id);

CREATE TABLE public.broadcast_list_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  list_id uuid NOT NULL REFERENCES public.broadcast_lists(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(list_id, user_id)
);
ALTER TABLE public.broadcast_list_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_broadcast_owner(_list_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.broadcast_lists WHERE id = _list_id AND owner_id = _user_id)
$$;

CREATE POLICY "Owner manages members" ON public.broadcast_list_members FOR ALL TO authenticated
  USING (public.is_broadcast_owner(list_id, auth.uid()))
  WITH CHECK (public.is_broadcast_owner(list_id, auth.uid()));

CREATE POLICY "Members can view own membership" ON public.broadcast_list_members FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

-- =========================================================
-- COMMUNITIES
-- =========================================================
CREATE TABLE public.communities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) BETWEEN 1 AND 100),
  description text,
  created_by uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.communities ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.community_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  community_id uuid NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(community_id, user_id)
);
ALTER TABLE public.community_members ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.is_community_member(_community_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.community_members WHERE community_id = _community_id AND user_id = _user_id)
$$;

CREATE OR REPLACE FUNCTION public.is_community_admin(_community_id uuid, _user_id uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.communities WHERE id = _community_id AND created_by = _user_id)
$$;

CREATE POLICY "Anyone can create community" ON public.communities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Members view community" ON public.communities FOR SELECT TO authenticated
  USING (auth.uid() = created_by OR public.is_community_member(id, auth.uid()));
CREATE POLICY "Admin updates community" ON public.communities FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Admin deletes community" ON public.communities FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Members view membership" ON public.community_members FOR SELECT TO authenticated
  USING (public.is_community_member(community_id, auth.uid()));
CREATE POLICY "Self or admin add member" ON public.community_members FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id OR public.is_community_admin(community_id, auth.uid()));
CREATE POLICY "Self or admin remove member" ON public.community_members FOR DELETE TO authenticated
  USING (auth.uid() = user_id OR public.is_community_admin(community_id, auth.uid()));

ALTER TABLE public.chat_groups ADD COLUMN community_id uuid REFERENCES public.communities(id) ON DELETE SET NULL;

-- =========================================================
-- POLLS
-- =========================================================
CREATE TABLE public.polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL,
  question text NOT NULL CHECK (length(trim(question)) BETWEEN 1 AND 300),
  multiple_choice boolean NOT NULL DEFAULT false,
  closed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.polls ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  label text NOT NULL CHECK (length(trim(label)) BETWEEN 1 AND 200),
  position int NOT NULL DEFAULT 0
);
ALTER TABLE public.poll_options ENABLE ROW LEVEL SECURITY;

CREATE TABLE public.poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES public.polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES public.poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(option_id, user_id)
);
ALTER TABLE public.poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls referenced by messages
ALTER TABLE public.direct_messages ADD COLUMN poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;
ALTER TABLE public.group_messages ADD COLUMN poll_id uuid REFERENCES public.polls(id) ON DELETE SET NULL;

CREATE POLICY "Authenticated view polls" ON public.polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated create polls" ON public.polls FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator updates polls" ON public.polls FOR UPDATE TO authenticated
  USING (auth.uid() = created_by) WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Creator deletes polls" ON public.polls FOR DELETE TO authenticated
  USING (auth.uid() = created_by);

CREATE POLICY "Authenticated view options" ON public.poll_options FOR SELECT TO authenticated USING (true);
CREATE POLICY "Poll creator manages options" ON public.poll_options FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()))
  WITH CHECK (EXISTS (SELECT 1 FROM public.polls p WHERE p.id = poll_id AND p.created_by = auth.uid()));

CREATE POLICY "Authenticated view votes" ON public.poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users vote as self" ON public.poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users delete own vote" ON public.poll_votes FOR DELETE TO authenticated
  USING (auth.uid() = user_id);
