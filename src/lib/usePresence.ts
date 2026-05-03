import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function usePresenceHeartbeat() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    const upsert = async (online: boolean) => {
      await supabase.from("user_presence").upsert(
        {
          user_id: user.id,
          is_online: online,
          last_seen_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );
    };

    void upsert(true);
    const interval = setInterval(() => {
      if (!cancelled) void upsert(true);
    }, 25000);

    const onVisibility = () => {
      void upsert(document.visibilityState === "visible");
    };
    document.addEventListener("visibilitychange", onVisibility);
    const onUnload = () => {
      void upsert(false);
    };
    window.addEventListener("beforeunload", onUnload);

    return () => {
      cancelled = true;
      clearInterval(interval);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("beforeunload", onUnload);
      void upsert(false);
    };
  }, [user]);
}
