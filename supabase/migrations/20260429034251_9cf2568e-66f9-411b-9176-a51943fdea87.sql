-- profiles additions
alter table public.profiles 
  add column avatar_url text,
  add column bio text,
  add column email_notifications boolean not null default true;

-- contact_messages: link to user
alter table public.contact_messages add column user_id uuid;

create policy "Users can view own messages" on public.contact_messages
  for select to authenticated using (auth.uid() = user_id);

-- favorites
create table public.user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references public.projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);
alter table public.user_favorites enable row level security;

create policy "Users can view own favorites" on public.user_favorites
  for select to authenticated using (auth.uid() = user_id);
create policy "Users can add own favorites" on public.user_favorites
  for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can delete own favorites" on public.user_favorites
  for delete to authenticated using (auth.uid() = user_id);

-- avatars storage bucket
insert into storage.buckets (id, name, public) values ('avatars','avatars',true);

create policy "Avatars are publicly viewable" on storage.objects
  for select using (bucket_id = 'avatars');
create policy "Users upload own avatar" on storage.objects
  for insert to authenticated 
  with check (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users update own avatar" on storage.objects
  for update to authenticated 
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);
create policy "Users delete own avatar" on storage.objects
  for delete to authenticated 
  using (bucket_id = 'avatars' and auth.uid()::text = (storage.foldername(name))[1]);