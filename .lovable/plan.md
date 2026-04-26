## Admin Panel — Implementation Plan

### 1. Backend Setup (Lovable Cloud / Supabase)
Enable Lovable Cloud and create the following schema:

- **`profiles`** — `id (uuid, FK auth.users)`, `display_name`, `created_at`. Auto-created via trigger on signup.
- **`user_roles`** — separate table (security best practice). Enum `app_role` = `admin | user`. `has_role()` security-definer function for RLS checks.
- **`contact_messages`** — `id`, `name`, `email`, `message`, `created_at`, `read (bool)`. Public INSERT, admin-only SELECT/UPDATE/DELETE.
- **`projects`** — `id`, `title`, `description`, `image_url`, `tags (text[])`, `link`, `sort_order`, `created_at`. Public SELECT, admin-only write.
- **`skills`** — `id`, `name`, `category`, `description` (the "why I use it" text from earlier modal), `sort_order`. Public SELECT, admin-only write.
- **`site_settings`** — single-row table: `name`, `tagline`, `bio`, `photo_url`, `email`, `whatsapp`, `instagram`. Public SELECT, admin-only UPDATE.

All tables get RLS enabled with policies using `has_role(auth.uid(), 'admin')`.

### 2. Auth Setup
- Email/password sign-in via Supabase (no signup UI — admin user seeded manually).
- `/login` route with email + password form using Zod validation.
- Auth state context wired into the router (`createRootRouteWithContext<{ auth }>`).
- `_authenticated` pathless layout route with `beforeLoad` redirect-to-login guard.
- Admin role checked in `_authenticated/admin` layout — non-admins redirected to `/`.

### 3. Admin Routes (under `/admin`)
- **`/admin`** — Dashboard: stats cards (total messages, unread messages, projects count, skills count) + recent messages preview.
- **`/admin/messages`** — Table of contact messages, mark read/unread, delete, view full message in dialog.
- **`/admin/projects`** — List + create/edit/delete dialog (title, description, tags, image URL, link).
- **`/admin/skills`** — List + create/edit/delete dialog (name, category, description used by skill modal).
- **`/admin/settings`** — Form to edit site settings (name, tagline, bio, photo URL, email, WhatsApp, Instagram).
- Shared admin layout with sidebar nav (using existing `shadcn/ui` Sidebar) + logout button.

### 4. Public Site Wiring
Update existing public pages to read from DB instead of hardcoded data:
- **Contact form** (`/contact`) — INSERT into `contact_messages` instead of `mailto:`.
- **Work page** (`/work`) — fetch `skills` and `projects` from DB; existing search + skill modal continue to work, modal uses `description` from DB.
- **Header / About / Footer** — read name, photo, social links from `site_settings`.

Use TanStack Query + `ensureQueryData` in route loaders (queryClient added to router context, `QueryClientProvider` in `__root.tsx`).

### 5. Seeding
- Seed one admin user (you provide email/password during Cloud setup).
- Seed `site_settings` with current hardcoded values (Mihraj, photo, email, WhatsApp, Instagram).
- Migrate current hardcoded skills/projects from `work.tsx` into the DB.

### 6. Validation & Security
- All forms use Zod (client + server function validation).
- RLS enforced server-side; client checks are UX only.
- Admin role stored in `user_roles` (NOT on profiles) to prevent privilege escalation.
- Server functions for admin mutations use `requireSupabaseAuth` middleware + role check.

### Out of scope
- File upload for project/photo images (use URL input for now).
- Self-service signup (admin seeded manually — keeps panel locked down).
- Email notifications when new contact message arrives.

After approval: I'll enable Lovable Cloud, create the schema, build the auth + admin routes, and wire the public pages to the DB.