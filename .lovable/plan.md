# Goal

"Create Account" click cheyyumbol admin login page (`/login`) il pokaruth. Athinu pakaram users-nu vendi oru puthiya `/auth` page (sign up + sign in tabs) varum. `/login` admin-nu mathram aayi nilkkum.

# Changes

### 1. New route: `src/routes/auth.tsx` (public)
Two tabs — **Sign In** and **Sign Up**:
- **Sign Up**: `supabase.auth.signUp({ email, password, options: { emailRedirectTo: window.location.origin } })` → success toast "Check your email to verify".
- **Sign In**: `supabase.auth.signInWithPassword(...)` → on success `navigate({ to: "/" })` (regular users go home, NOT to `/admin`).
- "Forgot password?" link → `resetPasswordForEmail` with `redirectTo: ${origin}/reset-password`.
- Zod validation (valid email + min 6 char password), inline error display, loading spinner, show/hide password toggle.
- Visual style matches the existing `/login` card (gradient button, rounded card) for consistency.
- `head()` with title "Sign in or Create Account" + `noindex` meta.

Note: New signups are normal authenticated users only. Admin status lives in the `user_roles` table and is granted manually — signing up here does NOT make anyone an admin.

### 2. Update `src/components/site/Header.tsx`
In the `moreItems` array (line 23), change:
```ts
{ to: "/login", label: " Create Account", description: "Sign up or log in" }
```
to:
```ts
{ to: "/auth", label: "Create Account", description: "Sign up or sign in" }
```

### 3. Keep `/login` unchanged
`/login` continues to be the admin-only sign-in page (redirects to `/admin`). It is no longer linked from the public nav.

# Out of scope
- No changes to `src/lib/auth.tsx` provider — the existing `signIn` works as-is; `signUp` is called directly via the supabase client inside the new page.
- No profile table / no additional user metadata (can be added later if you want username, avatar, etc.).
- No changes to admin guard or `user_roles` logic.

# Files
- **Create**: `src/routes/auth.tsx`
- **Edit**: `src/components/site/Header.tsx` (one line in `moreItems`)