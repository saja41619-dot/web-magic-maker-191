import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { Session, User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";

export interface AuthState {
  session: Session | null;
  user: User | null;
  isAuthenticated: boolean;
  isAdmin: boolean;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const defaultAuthState: AuthState = {
  session: null,
  user: null,
  isAuthenticated: false,
  isAdmin: false,
  loading: true,
  signIn: async () => {
    throw new Error("Authentication is not ready yet");
  },
  signOut: async () => {},
};

const AuthContext = createContext<AuthState>(defaultAuthState);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const SESSION_KEY = "auth_signin_at";
    const MAX_AGE_MS = 6 * 60 * 60 * 1000; // 6 hours

    const isExpired = () => {
      if (typeof window === "undefined") return false;
      const ts = window.localStorage.getItem(SESSION_KEY);
      if (!ts) return true;
      return Date.now() - Number(ts) > MAX_AGE_MS;
    };

    let expiryTimer: ReturnType<typeof setTimeout> | undefined;
    const scheduleExpiry = () => {
      if (expiryTimer) clearTimeout(expiryTimer);
      if (typeof window === "undefined") return;
      const ts = Number(window.localStorage.getItem(SESSION_KEY) ?? 0);
      if (!ts) return;
      const remaining = ts + MAX_AGE_MS - Date.now();
      if (remaining <= 0) {
        void supabase.auth.signOut();
        return;
      }
      expiryTimer = setTimeout(() => {
        void supabase.auth.signOut();
      }, remaining);
    };

    // Set up listener BEFORE checking session
    const { data: sub } = supabase.auth.onAuthStateChange((event, sess) => {
      if (event === "SIGNED_IN" && sess && typeof window !== "undefined") {
        window.localStorage.setItem(SESSION_KEY, String(Date.now()));
        scheduleExpiry();
      }
      if (event === "SIGNED_OUT" && typeof window !== "undefined") {
        window.localStorage.removeItem(SESSION_KEY);
        if (expiryTimer) clearTimeout(expiryTimer);
      }
      setSession(sess);
      if (sess?.user) {
        setTimeout(() => {
          void checkAdmin(sess.user.id).then(setIsAdmin);
        }, 0);
      } else {
        setIsAdmin(false);
      }
    });

    void supabase.auth.getSession().then(async ({ data }) => {
      if (data.session && isExpired()) {
        await supabase.auth.signOut();
        setSession(null);
        setLoading(false);
        return;
      }
      setSession(data.session);
      if (data.session?.user) {
        setIsAdmin(await checkAdmin(data.session.user.id));
        scheduleExpiry();
      }
      setLoading(false);
    });

    return () => {
      sub.subscription.unsubscribe();
      if (expiryTimer) clearTimeout(expiryTimer);
    };
  }, []);

  const value = useMemo<AuthState>(
    () => ({
      session,
      user: session?.user ?? null,
      isAuthenticated: !!session,
      isAdmin,
      loading,
      signIn: async (email, password) => {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      },
      signOut: async () => {
        await supabase.auth.signOut();
      },
    }),
    [session, isAdmin, loading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

async function checkAdmin(userId: string): Promise<boolean> {
  const { data } = await supabase
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .eq("role", "admin")
    .maybeSingle();
  return !!data;
}

export function useAuth(): AuthState {
  return useContext(AuthContext);
}
