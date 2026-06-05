## Phased plan — Connect-il features nadappakkal

88 features-um onnichu cheyyaan kazhiyilla (oru turn-il aakkam alla). **Category-by-category** approach edukaam. Total 9 phases.

### Already working in Connect (audit result)

ConnectTab.tsx (3,211 lines) + chatFeatures.ts-il ee features ipo real-aayi work cheyyunnund:

- 1-to-1 chat, Group chat, Voice/Video calls (CallManager + WebRTC)
- Reply, Forward, Edit, Delete for everyone, Reactions, Starred
- Disappearing messages (per-chat seconds), Archive, Wallpapers
- Polls (polls + poll_options + poll_votes tables)
- Voice notes, Image/Video/File attachments, Typing indicators
- Presence (online/last seen), Search messages, Draft saving
- Group create + members, Broadcast (realtime channels)

### Phase order

1. **Messaging Features** (21) — *current phase*
2. Media Sharing (12)
3. Calling (9)
4. Status (7)
5. Community & Groups (9)
6. Privacy & Security (14)
7. Multi-Device (5)
8. Customization (6)
9. Channels (5)

---

## Phase 1 — Messaging Features (ee turn)

Audit cheythappol 21-il **14 already work cheyyunnu**. Pani cheyyaanullath **7**:

| # | Feature | Status | Plan |
|---|---|---|---|
| 1 | Broadcast message | Stub (channels mathram) | `broadcast_lists` table use cheythu broadcast send modal — owner-il ninnu multiple recipients-leku oro DM aayi insert |
| 2 | View once photos/videos | Stub | `direct_messages.view_once boolean` column + opened-il auto-delete attachment |
| 3 | Pin chats | Missing | `user_chat_settings.pinned boolean` (already-ulla table-il) + sidebar-il pinned-aayavar mukalil |
| 4 | Unread filter | Missing | Sidebar-il "Unread" tab/chip — `unread[peerId] > 0` filter |
| 5 | GIF support | Missing | Attachment menu-il GIF picker (Tenor API or simple emoji-picker-react GIF tab) |
| 6 | Stickers | Missing | Sticker picker modal — preset sticker pack send as image attachment |
| 7 | Scheduled messages | Stub | `direct_messages.scheduled_for timestamptz` + client poll/edge cron send-cheyyal |

**Avatar stickers** (#8 in list) — Phase 8 (Customization)-il avatar create cheyyumpol cheyyam.

### Technical changes (Phase 1)

**DB migration:**
- `ALTER TABLE direct_messages ADD COLUMN view_once boolean DEFAULT false, ADD COLUMN view_once_opened_at timestamptz, ADD COLUMN scheduled_for timestamptz`
- `ALTER TABLE user_chat_settings ADD COLUMN pinned boolean DEFAULT false` (already exists check cheyyanam — illenkil add)
- Same for `group_messages` (view_once, scheduled_for)

**UI changes in `src/components/dashboard/ConnectTab.tsx`:**
- Sidebar header: "Unread" filter chip + pin sort
- Chat list item: long-press / context menu → "Pin chat"
- Composer attachment menu: "GIF", "Sticker", "View once" toggle, "Schedule" picker
- Bubble: view-once eye icon + open-once viewer

**New files:**
- `src/components/dashboard/BroadcastModal.tsx` — recipients select + send
- `src/components/dashboard/GifPicker.tsx` — Tenor search (free tier) or curated set
- `src/components/dashboard/StickerPicker.tsx` — preset packs
- `src/components/dashboard/ScheduleMessageDialog.tsx` — datetime picker

**Scheduled send mechanism:**
Client-side: `setInterval` checking own scheduled_for messages every 30s and inserting real message at due time. Simple, works while at-least one device online. (Server cron later if needed.)

**Out of scope (Phase 1):**
Other 8 categories — those come in next turns.

---

Approve cheythaal Phase 1 build cheythu, pinne next phase confirm cheythu munnottu pokaam.
