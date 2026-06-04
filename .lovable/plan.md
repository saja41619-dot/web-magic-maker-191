## Connect → Invite User feature

Connect tab-il puthiya users-ne invite cheyyaan oru "Invite" option cheyyam — link share + email invite.

### UI changes (`ConnectTab.tsx`)
- Sidebar header-il `UserPlus` icon button (Features Hub button-inte adutht).
- Click cheytaal `InviteUserModal` thurakkum.

### New component: `src/components/dashboard/InviteUserModal.tsx`
Three tabs / sections:
1. **Invite Link** — User-inte unique invite link auto-generate cheyyum (`{origin}/auth?invite={code}`). Copy-to-clipboard + Web Share API ("Share via WhatsApp/Email/etc").
2. **Email Invite** — Email input + optional personal message → server function vech invite ayakkum.
3. **Pending Invites** — Current user ayachcha invites-inte list (email, status: pending/accepted, sent date, resend/revoke).

### Database (`supabase--migration`)
New table `public.user_invites`:
- `id`, `inviter_id` (uuid → auth.users), `invite_code` (text unique), `email` (text, nullable for link-only), `message` (text), `status` (pending/accepted/revoked), `accepted_by` (uuid), `accepted_at`, `created_at`, `expires_at` (default now()+7d).
- RLS: inviter can view/insert/update own rows; authenticated users can SELECT by `invite_code` (for accept flow).
- GRANT to authenticated + service_role.

### Server function: `src/lib/invites.functions.ts`
- `createInvite({ email?, message? })` — generates code, inserts row, (if email) sends invite email via Lovable AI / Resend stub → for now just stores row + returns link. Email sending UI-toggle mathram (no real SMTP unless connector added).
- `listMyInvites()` — returns inviter's invites.
- `revokeInvite({ id })` — marks revoked.
- `acceptInvite({ code })` — called post-signup; marks accepted, optionally auto-creates DM between inviter and acceptor.

### Accept flow (`src/routes/auth.tsx`)
- Read `?invite=<code>` from URL, store in localStorage before signup.
- After successful signup/login, call `acceptInvite` → toast "Invited by <name>" + open Connect DM with inviter.

### Files to create / edit
- `supabase/migrations/<ts>_user_invites.sql` (new)
- `src/lib/invites.functions.ts` (new)
- `src/components/dashboard/InviteUserModal.tsx` (new)
- `src/components/dashboard/ConnectTab.tsx` (add button + modal mount)
- `src/routes/auth.tsx` (capture + accept invite code)

### Out of scope (v1)
- Real outgoing email delivery (UI shows "link copied / share" — email send-il visible toast mathram). Real SMTP/Resend connector pinneed cheyyaam.
- Bulk CSV invite.
