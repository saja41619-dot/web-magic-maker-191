# Connect Chat Redesign — iMessage Blue

Redesign the Connect surface with a clean iMessage-style aesthetic. All existing features (DMs, groups, calls, status, polls, invites, etc.) stay wired — only the visual shell and layout change.

## Design commitments

**Palette** (scoped to Connect via new `.im` wrapper, replacing `.wa` skin)
- Background: `#ffffff` chat, `#f5f5f7` sidebar
- Bubble mine: `#007aff` → white text
- Bubble other: `#e9e9eb` → `#1c1c1e` text
- Accent green (online / send): `#34c759`
- Divider: `#d1d1d6`; muted text: `#8e8e93`

**Typography**
- Headings: Space Grotesk (loaded via `<link>` in `__root.tsx`)
- Body: DM Sans
- Applied only inside the Connect surface

**Layout — Classic Split (sidebar)**
```text
┌──────────────────────────────────────────────────────┐
│ 320px sidebar        │  chat pane                    │
│ ─────────────────    │ ─────────────────────────     │
│ profile + search     │ contact header (avatar,       │
│ status stories row   │ name, presence, call/video)   │
│ pinned chats         │                               │
│ conversation list    │ message stream (rounded       │
│ (avatar + name +     │ bubbles with tails, day       │
│ last msg + time      │ dividers, read receipts)      │
│ + unread pill)       │                               │
│                      │ composer (pill input,         │
│ bottom: new chat /   │ +, emoji, mic, arrow-up       │
│ new group / calls    │ send in blue circle)          │
└──────────────────────────────────────────────────────┘
```

Mobile: sidebar full-width; opening a chat slides the pane in (existing single-pane behavior preserved).

## Visual details

- **Bubbles**: 18px radius, tail on last in run only, grouped bubbles tighten to 4px gap, own = blue gradient (`#007aff` → `#0a84ff`), other = light gray
- **Sidebar rows**: 68px tall, 44px circular avatar with 2px white ring + green online dot, name in Space Grotesk 15px semibold, preview in DM Sans 13px muted, right-aligned timestamp + blue unread pill
- **Header**: white with hairline bottom border, avatar + name + "online" / "typing…" in green, phone / video / info icons on right
- **Composer**: rounded-full white input inside `#f5f5f7` bar, iOS-style expanding textarea, blue circular send button appears when text present
- **Status bar**: horizontal scroll of gradient rings above chat list
- **Empty state**: centered app icon + "Select a chat to start messaging" in Space Grotesk

## Technical changes

1. **`src/styles.css`**: add new `.im` scope block (mirroring current `.wa` structure) with the iMessage tokens, bubble styles, tail pseudo-elements, row hover, composer, unread pill, scrollbar. Keep `.wa` intact but unused.
2. **`src/routes/__root.tsx`**: add `<link>` for Space Grotesk + DM Sans (Google Fonts).
3. **`src/components/dashboard/ConnectTab.tsx`**: swap the root `wa` className to `im`; restructure sidebar + chat header + composer JSX to the split layout above; replace WhatsApp bubble classnames with new iMessage bubble classnames. No changes to state, data, or handlers.
4. **`src/components/dashboard/ChatBubble.tsx`**: restyle to iMessage bubble (blue/gray, tail, grouped runs).
5. **`src/components/dashboard/StatusBar.tsx`**: light-mode rings, blue accent.

## Out of scope
- No new features (calls, polls, invites, groups all keep current behavior)
- No DB changes
- No routing changes
- `.wa` styles remain in `styles.css` (dead but harmless) unless you want them removed

Approve to build.
