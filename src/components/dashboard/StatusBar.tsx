import { useEffect, useRef, useState } from "react";
import { Plus, X, Eye, Loader2, Camera, Type } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Profile {
  id: string;
  display_name: string | null;
  avatar_url: string | null;
}

interface StatusPost {
  id: string;
  user_id: string;
  content: string | null;
  media_url: string | null;
  media_type: "image" | "video" | null;
  background: string | null;
  created_at: string;
  expires_at: string;
}

const BG_OPTIONS = [
  "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
  "linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)",
  "linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)",
  "linear-gradient(135deg, #fa709a 0%, #fee140 100%)",
  "linear-gradient(135deg, #30cfd0 0%, #330867 100%)",
];

export function StatusBar({ users }: { users: Profile[] }) {
  const { user } = useAuth();
  const [statuses, setStatuses] = useState<StatusPost[]>([]);
  const [showComposer, setShowComposer] = useState(false);
  const [viewingUserId, setViewingUserId] = useState<string | null>(null);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("status_posts" as any)
        .select("*")
        .order("created_at", { ascending: false });
      if (cancelled) return;
      setStatuses(((data ?? []) as any[]) as StatusPost[]);
    })();
    const ch = supabase
      .channel("status-feed")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "status_posts" },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setStatuses((prev) => [payload.new as StatusPost, ...prev]);
          } else if (payload.eventType === "DELETE") {
            setStatuses((prev) => prev.filter((s) => s.id !== (payload.old as any).id));
          }
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [user]);

  // Group by user
  const byUser = new Map<string, StatusPost[]>();
  statuses.forEach((s) => {
    byUser.set(s.user_id, [...(byUser.get(s.user_id) ?? []), s]);
  });

  const myStatuses = user ? byUser.get(user.id) ?? [] : [];
  const otherUserIds = Array.from(byUser.keys()).filter((id) => id !== user?.id);

  const profileFor = (id: string) =>
    id === user?.id
      ? { id: user.id, display_name: "You", avatar_url: null as string | null }
      : users.find((u) => u.id === id) ?? { id, display_name: "User", avatar_url: null };

  return (
    <>
      <div className="border-b border-border px-3 py-3">
        <h3 className="mb-2 px-1 text-[10px] font-bold uppercase tracking-wider text-muted-foreground/70">
          Status
        </h3>
        <div className="flex gap-3 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {/* My status */}
          <button
            onClick={() => (myStatuses.length ? setViewingUserId(user!.id) : setShowComposer(true))}
            className="flex shrink-0 flex-col items-center gap-1 w-14"
          >
            <div className="relative h-12 w-12">
              <div
                className={cn(
                  "h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-base font-bold overflow-hidden",
                  myStatuses.length && "ring-2 ring-primary ring-offset-2 ring-offset-background",
                )}
              >
                {(user?.email ?? "U").charAt(0).toUpperCase()}
              </div>
              {myStatuses.length === 0 && (
                <span className="absolute -bottom-0.5 -right-0.5 flex h-5 w-5 items-center justify-center rounded-full bg-primary text-primary-foreground border-2 border-background">
                  <Plus className="h-3 w-3" />
                </span>
              )}
            </div>
            <span className="truncate text-[10px] text-muted-foreground w-full text-center">
              {myStatuses.length ? "My status" : "Add"}
            </span>
          </button>

          {otherUserIds.map((uid) => {
            const p = profileFor(uid);
            return (
              <button
                key={uid}
                onClick={() => setViewingUserId(uid)}
                className="flex shrink-0 flex-col items-center gap-1 w-14"
              >
                <div className="h-12 w-12 rounded-full bg-gradient-primary flex items-center justify-center text-primary-foreground text-base font-bold overflow-hidden ring-2 ring-green-500 ring-offset-2 ring-offset-background">
                  {p.avatar_url ? (
                    <img src={p.avatar_url} alt="" className="h-full w-full object-cover" />
                  ) : (
                    (p.display_name ?? "U").charAt(0).toUpperCase()
                  )}
                </div>
                <span className="truncate text-[10px] text-muted-foreground w-full text-center">
                  {p.display_name}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {showComposer && <StatusComposer onClose={() => setShowComposer(false)} />}
      {viewingUserId && (
        <StatusViewer
          posts={byUser.get(viewingUserId) ?? []}
          owner={profileFor(viewingUserId)}
          isOwner={viewingUserId === user?.id}
          onClose={() => setViewingUserId(null)}
        />
      )}
    </>
  );
}

function StatusComposer({ onClose }: { onClose: () => void }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [bg, setBg] = useState(BG_OPTIONS[0]);
  const [posting, setPosting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const postText = async () => {
    if (!user || !text.trim()) return;
    setPosting(true);
    try {
      await supabase
        .from("status_posts" as any)
        .insert({ user_id: user.id, content: text.trim(), background: bg });
      onClose();
    } finally {
      setPosting(false);
    }
  };

  const postImage = async (file: File) => {
    if (!user) return;
    setPosting(true);
    try {
      const ext = file.name.split(".").pop() ?? "jpg";
      const path = `status/${user.id}/${Date.now()}.${ext}`;
      await supabase.storage.from("chat-attachments").upload(path, file, { contentType: file.type });
      const { data: signed } = await supabase.storage
        .from("chat-attachments")
        .createSignedUrl(path, 60 * 60 * 25);
      await supabase.from("status_posts" as any).insert({
        user_id: user.id,
        media_url: signed?.signedUrl,
        media_type: "image",
      });
      onClose();
    } finally {
      setPosting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-card shadow-elegant">
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display font-semibold">New status</h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div
          className="flex aspect-square items-center justify-center p-6"
          style={{ background: bg }}
        >
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type your status…"
            className="h-full w-full resize-none bg-transparent text-center text-2xl font-bold text-white placeholder:text-white/70 outline-none"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto p-3 border-b border-border">
          {BG_OPTIONS.map((b) => (
            <button
              key={b}
              onClick={() => setBg(b)}
              className={cn(
                "h-8 w-8 shrink-0 rounded-full ring-offset-2 ring-offset-card",
                bg === b && "ring-2 ring-primary",
              )}
              style={{ background: b }}
            />
          ))}
        </div>
        <div className="flex gap-2 p-4">
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void postImage(f);
            }}
          />
          <button
            onClick={() => fileRef.current?.click()}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl border border-border py-2.5 text-sm font-medium hover:bg-secondary"
          >
            <Camera className="h-4 w-4" /> Photo
          </button>
          <button
            onClick={() => void postText()}
            disabled={!text.trim() || posting}
            className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-primary py-2.5 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {posting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Type className="h-4 w-4" />}
            Post
          </button>
        </div>
      </div>
    </div>
  );
}

function StatusViewer({
  posts,
  owner,
  isOwner,
  onClose,
}: {
  posts: StatusPost[];
  owner: Profile;
  isOwner: boolean;
  onClose: () => void;
}) {
  const { user } = useAuth();
  const [idx, setIdx] = useState(0);
  const [viewers, setViewers] = useState<number>(0);
  const post = posts[idx];

  useEffect(() => {
    if (!post || !user) return;
    // record view (skip if own)
    if (post.user_id !== user.id) {
      void supabase
        .from("status_views" as any)
        .insert({ status_id: post.id, viewer_id: user.id })
        .then(() => {});
    }
    if (isOwner) {
      void supabase
        .from("status_views" as any)
        .select("id", { count: "exact", head: true })
        .eq("status_id", post.id)
        .then(({ count }) => setViewers(count ?? 0));
    }
    const t = setTimeout(() => {
      if (idx < posts.length - 1) setIdx(idx + 1);
      else onClose();
    }, 5000);
    return () => clearTimeout(t);
  }, [post?.id, idx]);

  if (!post) return null;

  const handleDelete = async () => {
    await supabase.from("status_posts" as any).delete().eq("id", post.id);
    if (posts.length === 1) onClose();
    else setIdx(Math.max(0, idx - 1));
  };

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black">
      <div className="flex gap-1 p-2">
        {posts.map((_, i) => (
          <div key={i} className="h-0.5 flex-1 overflow-hidden rounded-full bg-white/30">
            <div
              className={cn(
                "h-full bg-white transition-all",
                i < idx ? "w-full" : i === idx ? "w-full animate-[grow_5s_linear]" : "w-0",
              )}
              style={i === idx ? { animation: "grow 5s linear forwards" } : undefined}
            />
          </div>
        ))}
      </div>
      <style>{`@keyframes grow { from { width: 0 } to { width: 100% } }`}</style>
      <div className="flex items-center justify-between px-4 py-2 text-white">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-white/20 flex items-center justify-center text-sm font-bold">
            {(owner.display_name ?? "U").charAt(0).toUpperCase()}
          </div>
          <div className="text-sm font-medium">{owner.display_name}</div>
        </div>
        <button onClick={onClose} className="rounded-lg p-2 hover:bg-white/10">
          <X className="h-5 w-5" />
        </button>
      </div>
      <div
        className="flex flex-1 items-center justify-center p-6 cursor-pointer"
        style={post.background ? { background: post.background } : undefined}
        onClick={() => (idx < posts.length - 1 ? setIdx(idx + 1) : onClose())}
      >
        {post.media_url ? (
          <img src={post.media_url} alt="" className="max-h-full max-w-full object-contain" />
        ) : (
          <p className="text-center text-3xl font-bold text-white">{post.content}</p>
        )}
      </div>
      {isOwner && (
        <div className="flex items-center justify-between px-4 py-3 text-white border-t border-white/10">
          <div className="flex items-center gap-1.5 text-sm">
            <Eye className="h-4 w-4" /> {viewers} {viewers === 1 ? "view" : "views"}
          </div>
          <button
            onClick={handleDelete}
            className="rounded-lg px-3 py-1.5 text-xs bg-white/10 hover:bg-white/20"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
}
