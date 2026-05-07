
CREATE POLICY "Creators can view their groups"
  ON public.chat_groups FOR SELECT TO authenticated
  USING (auth.uid() = created_by);
