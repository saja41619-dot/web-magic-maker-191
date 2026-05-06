# Connect → WhatsApp Complete

Full WhatsApp parity for the Connect tab with the classic green design language.

## 1. Design overhaul — "WhatsApp Classic"

Theme tokens added to `src/styles.css` (scoped via a `.wa` wrapper so the rest of the dashboard stays unchanged):

- `--wa-teal-dark: #075e54`, `--wa-teal: #128c7e`, `--wa-green: #25d366`, `--wa-bg: #ece5dd`, `--wa-bubble-out: #dcf8c6`, `--wa-bubble-in: #ffffff`, `--wa-panel: #f0f2f5`, `--wa-tick: #34b7f1`.
- Doodle SVG chat background (subtle, ~6% opacity) as default wallpaper.
- Three-pane desktop layout: left rail (icons) · chat list · conversation. Mobile: list ↔ conversation slide.
- New header bar (teal-dark), search bar (panel), bubble shapes with tail, blue double-tick read receipts, date dividers, system messages pill.

## 2. New features (DB + UI)

### Voice & video calls (1:1 + group)
- New table `calls` (caller, callee_or_group, kind dm|group, media voice|video, status ringing|active|ended|missed, started_at, ended_at, room_id).
- WebRTC via Supabase Realtime signaling channel (`call:{room_id}`).
- Ringing UI (incoming modal w/ accept/decline), in-call screen (mute, camera, end, switch).
- Audio/video buttons in chat header.

### Broadcast lists
- Tables `broadcast_lists`, `broadcast_list_members`. Sending fan-outs into `direct_messages` to each member.

### Communities
- Tables `communities`, `community_members`, link `chat_groups.community_id`. UI tab showing community → grouped sub-groups.

### Polls
- Tables `polls`, `poll_options`, `poll_votes`. Inline poll bubble in messages (`message_id` link via new `poll_id` columns on dm/group messages).

### Location & contact share
- Reuse `attachment_*` columns: `attachment_type='location'` with JSON in content (lat,lng,label) → render a static map preview (Google Maps static URL placeholder + open link).
- `attachment_type='contact'` with vCard JSON.

### Search in chat
- Client-side full-text filter inside open conversation, with highlight + jump.

### Chat export
- Button in chat menu → generate `.txt` (WhatsApp-style `[date, time] sender: msg`) and download.

### Backup
- Button in settings menu → exports all user DMs + group msgs as JSON, downloads. (Restore is out-of-scope for v1.)

## 3. File plan

- `supabase/migrations/<ts>_whatsapp_complete.sql` — all new tables + RLS.
- `src/styles.css` — WA tokens + doodle background.
- `src/components/dashboard/connect/` (new folder, splitting the 2.6k-line file):
  - `ConnectShell.tsx` (3-pane layout)
  - `ChatList.tsx`
  - `ChatHeader.tsx`
  - `MessageList.tsx`, `MessageBubble.tsx`, `DateDivider.tsx`
  - `Composer.tsx` (text + emoji + attach menu: photo / doc / poll / location / contact / voice)
  - `CallButtons.tsx` + `CallScreen.tsx` + `IncomingCallModal.tsx`
  - `PollBubble.tsx`, `LocationBubble.tsx`, `ContactBubble.tsx`
  - `BroadcastsPanel.tsx`, `CommunitiesPanel.tsx`, `StatusPanel.tsx`
  - `SearchInChat.tsx`
  - `useConnect.ts` (state hook), `useWebRTC.ts`, `chatExport.ts`, `chatBackup.ts`
- `src/components/dashboard/ConnectTab.tsx` — slimmed down, just renders `ConnectShell`.
- Existing `StatusBar.tsx`, `NewGroupModal.tsx`, `chatFeatures.ts`, `callManager.ts`, `CallUI.tsx` — refactored / re-used where possible.

## 4. Order of execution

1. Run DB migration (calls, broadcasts, communities, polls).
2. Add WA design tokens + doodle background.
3. Build new `connect/` components and wire to existing data.
4. Replace ConnectTab to mount the shell.
5. WebRTC signaling + call screens.
6. Polls, location, contact attachments.
7. Search-in-chat, export, backup.
8. QA on desktop (1336×830) and mobile widths.

## 5. Notes / trade-offs

- Communities & broadcasts get functional but minimal UI in v1.
- WebRTC uses STUN only (Google public). No TURN, so calls may fail behind strict NATs — acceptable for v1.
- Backup is JSON export (not encrypted, not restorable yet).
- This is a large change touching ~15 files. Single migration, single PR-style commit.
