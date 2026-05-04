## My Dashboard – Expansion Plan

Dashboard-il ee sections ellam chErkkam. Tab-based layout aakum so dashboard clean aayi irikkum.

### New Dashboard Layout

```text
/dashboard
 ├── Header (avatar + name + email + Sign out)
 └── Tabs:
      ├── Profile        → picture upload, display name, bio
      ├── My Messages    → user ayachatha contact form messages
      ├── Favorites      → bookmark cheytha projects
      └── Settings       → password change, notifications, delete account
```

### 1. Profile tab (picture + bio)

**Database changes:**
- `profiles` table-il puthiya columns: `avatar_url text`, `bio text`
- Storage bucket: `avatars` (public) — RLS: users can upload/update only their own folder (`{user_id}/...`)

**UI:**
- Avatar upload (click cheythu image select, preview, upload to storage)
- Display name input (already exists)
- Bio textarea (max 500 chars)
- Save button — updates `profiles` row

### 2. My Messages tab

**Database changes:**
- `contact_messages` table-il `user_id uuid` column add cheyyam (nullable — anonymous users-um message ayakkam)
- New RLS policy: "Users can view own messages" — `auth.uid() = user_id`
- Contact form update: logged-in aanenkil `user_id` set cheyyam

**UI:**
- User-nte ayacha messages list (date, message preview, read status by admin)

### 2.1 Group Chat tab (New)

**Database changes:**
- New table `chat_messages`:
  - `id uuid pk`, `user_id uuid references profiles(id)`, `content text`, `file_url text`, `reply_to uuid references chat_messages(id)`, `is_read boolean default false`, `created_at timestamptz`
- New table `chat_reactions`:
  - `id uuid pk`, `message_id uuid references chat_messages(id)`, `user_id uuid references profiles(id)`, `emoji text`, `created_at timestamptz`
- RLS: "Authenticated users can read and insert messages"
- Supabase Realtime & Presence: Enable for instant updates, typing indicators, and online status.

**UI:**
- Scrollable message area with automatic scroll to bottom.
- Message bubbles (Left for others, Right for self).
- Image attachment button using Storage.
- **Typing Indicator:** "Someone is typing..." notification using Presence.
- **Online Status:** Green dot for active users.
- **Replies:** Swipe or click to reply to a specific message.
- **Reactions:** Long press or hover to add emojis to a message.

### 3. Favorites tab

**Database changes:**
- New table `user_favorites`:
  - `id uuid pk`, `user_id uuid`, `project_id uuid references projects(id) on delete cascade`, `created_at timestamptz`
  - Unique (user_id, project_id)
- RLS: users can select/insert/delete only their own favorites

**UI:**
- Saved projects grid (title, image, link, remove button)
- Projects/Work page-il oru "heart" icon — click cheythu favorite/unfavorite

### 4. Settings tab

**Password change:**
- Current password verify (re-signin) + new password input
- `supabase.auth.updateUser({ password })`

**Notification preferences:**
- `profiles` table-il `email_notifications boolean default true` column
- Toggle switch save cheyyumbol update

**Delete account:**
- Confirmation dialog ("type DELETE to confirm")
- Server function (`createServerFn` + service role client) — `supabaseAdmin.auth.admin.deleteUser(userId)`
- Delete cheythatinushesham `/` page-ilekk redirect

### Technical Files

**New / edited:**
- `src/routes/dashboard.tsx` — tabs structure (uses existing `Tabs` ui component)
- `src/components/dashboard/ProfileTab.tsx`
- `src/components/dashboard/MessagesTab.tsx`
- `src/components/dashboard/FavoritesTab.tsx`
- `src/components/dashboard/SettingsTab.tsx`
- `src/components/dashboard/ChatTab.tsx`
- `src/components/dashboard/ChatBubble.tsx`
- `src/server/account.functions.ts` — `deleteAccount` server function (service role)
- `src/integrations/supabase/types.ts` — auto-regenerated after migration
- `src/routes/contact.tsx` — set `user_id` if logged in
- `src/routes/work.tsx` (or projects card component) — favorite heart toggle

**Migration (single SQL):**
```sql
-- profiles additions
alter table profiles 
  add column avatar_url text,
  add column bio text,
  add column email_notifications boolean not null default true;

-- contact_messages: link to user
alter table contact_messages add column user_id uuid;
create policy "Users can view own messages" on contact_messages
  for select to authenticated using (auth.uid() = user_id);

-- favorites
create table user_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  project_id uuid not null references projects(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, project_id)
);
alter table user_favorites enable row level security;
create policy "Users manage own favorites" on user_favorites
  for all to authenticated 
  using (auth.uid() = user_id) 
  with check (auth.uid() = user_id);

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

-- Chat table with reply support
create table chat_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  content text,
  file_url text,
  reply_to uuid references chat_messages(id) on delete set null,
  is_read boolean default false,
  created_at timestamptz default now()
);
alter table chat_messages enable row level security;
create policy "Anyone authenticated can read chat" on chat_messages for select to authenticated using (true);
create policy "Anyone authenticated can post to chat" on chat_messages for insert to authenticated with check (auth.uid() = user_id);

-- Chat Reactions table
create table chat_reactions (
  id uuid primary key default gen_random_uuid(),
  message_id uuid references chat_messages(id) on delete cascade not null,
  user_id uuid references profiles(id) on delete cascade not null,
  emoji text not null,
  created_at timestamptz default now(),
  unique(message_id, user_id, emoji)
);
alter table chat_reactions enable row level security;
create policy "Anyone authenticated can view reactions" on chat_reactions for select to authenticated using (true);
create policy "Anyone authenticated can react" on chat_reactions for insert to authenticated with check (auth.uid() = user_id);
create policy "Users can remove own reactions" on chat_reactions for delete to authenticated using (auth.uid() = user_id);

-- Enable Realtime
alter publication supabase_realtime add table chat_messages, chat_reactions;
```

### Summary

Dashboard-il 4 tabs varum: **Profile** (picture + bio + name), **My Messages** (ningal ayachatha contact messages), **Favorites** (bookmark cheytha projects), **Settings** (password change, email notifications toggle, delete account). Database-il avatar/bio columns, favorites table, avatars storage bucket — ellam proper RLS-od koode set cheyyum.
