CREATE TABLE public.user_invites (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  inviter_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invite_code text NOT NULL UNIQUE,
  email text,
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','revoked','expired')),
  accepted_by uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  accepted_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL DEFAULT (now() + interval '7 days')
);

CREATE INDEX idx_user_invites_inviter ON public.user_invites(inviter_id);
CREATE INDEX idx_user_invites_code ON public.user_invites(invite_code);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.user_invites TO authenticated;
GRANT ALL ON public.user_invites TO service_role;

ALTER TABLE public.user_invites ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Inviters can view their invites"
  ON public.user_invites FOR SELECT TO authenticated
  USING (auth.uid() = inviter_id OR auth.uid() = accepted_by);

CREATE POLICY "Authenticated can lookup by code"
  ON public.user_invites FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "Inviters can create invites"
  ON public.user_invites FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Inviters can update own invites"
  ON public.user_invites FOR UPDATE TO authenticated
  USING (auth.uid() = inviter_id)
  WITH CHECK (auth.uid() = inviter_id);

CREATE POLICY "Acceptor can mark accepted"
  ON public.user_invites FOR UPDATE TO authenticated
  USING (status = 'pending' AND expires_at > now())
  WITH CHECK (accepted_by = auth.uid() AND status = 'accepted');

CREATE TRIGGER trg_user_invites_updated
  BEFORE UPDATE ON public.user_invites
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();