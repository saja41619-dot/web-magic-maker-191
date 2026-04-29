import { useEffect, useRef, useState, type FormEvent } from "react";
import { Loader2, Save, Upload, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

export function ProfileTab() {
  const { user } = useAuth();
  const fileRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [displayName, setDisplayName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [initial, setInitial] = useState({ displayName: "", bio: "" });

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("profiles")
        .select("display_name, bio, avatar_url")
        .eq("id", user.id)
        .maybeSingle();
      if (cancelled) return;
      const name = data?.display_name ?? "";
      const b = data?.bio ?? "";
      setDisplayName(name);
      setBio(b);
      setAvatarUrl(data?.avatar_url ?? null);
      setInitial({ displayName: name, bio: b });
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const handleAvatar = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error("Image must be under 2MB");
      return;
    }
    setUploading(true);
    const ext = file.name.split(".").pop() ?? "png";
    const path = `${user.id}/avatar-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("avatars").upload(path, file, {
      cacheControl: "3600",
      upsert: true,
    });
    if (error) {
      setUploading(false);
      toast.error(error.message);
      return;
    }
    const { data: pub } = supabase.storage.from("avatars").getPublicUrl(path);
    const { error: upErr } = await supabase
      .from("profiles")
      .update({ avatar_url: pub.publicUrl })
      .eq("id", user.id);
    setUploading(false);
    if (upErr) {
      toast.error(upErr.message);
      return;
    }
    setAvatarUrl(pub.publicUrl);
    toast.success("Avatar updated");
  };

  const handleSave = async (e: FormEvent) => {
    e.preventDefault();
    if (!user) return;
    const name = displayName.trim();
    if (name.length < 1 || name.length > 80) {
      toast.error("Display name must be 1-80 characters");
      return;
    }
    if (bio.length > 500) {
      toast.error("Bio must be under 500 characters");
      return;
    }
    setSaving(true);
    const { error } = await supabase
      .from("profiles")
      .update({ display_name: name, bio })
      .eq("id", user.id);
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setInitial({ displayName: name, bio });
    toast.success("Profile saved");
  };

  const dirty = displayName.trim() !== initial.displayName || bio !== initial.bio;
  const initLetter = (displayName || user?.email || "U").trim().charAt(0).toUpperCase();

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <UserIcon className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Profile</h2>
      </div>

      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-full bg-gradient-primary text-2xl font-bold text-primary-foreground shadow-glow">
          {avatarUrl ? (
            <img src={avatarUrl} alt="Avatar" className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-center justify-center">{initLetter}</div>
          )}
        </div>
        <div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleAvatar}
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={uploading}
            className="inline-flex items-center gap-2 rounded-md border border-border bg-background px-3 py-2 text-sm font-medium transition-smooth hover:bg-secondary/60 disabled:opacity-60"
          >
            {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            {uploading ? "Uploading..." : "Change avatar"}
          </button>
          <p className="mt-1 text-xs text-muted-foreground">PNG/JPG, max 2MB</p>
        </div>
      </div>

      <form onSubmit={handleSave} className="mt-6 space-y-4">
        <div>
          <label htmlFor="displayName" className="text-sm font-medium">Display name</label>
          <input
            id="displayName"
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            disabled={loading}
            placeholder="Your name"
            className="mt-1.5 w-full rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
        </div>
        <div>
          <label htmlFor="bio" className="text-sm font-medium">Bio</label>
          <textarea
            id="bio"
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            disabled={loading}
            rows={4}
            maxLength={500}
            placeholder="Tell us about yourself..."
            className="mt-1.5 w-full resize-none rounded-md border border-border bg-background/60 px-4 py-2.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30 disabled:opacity-60"
          />
          <p className="mt-1 text-xs text-muted-foreground">{bio.length}/500</p>
        </div>
        <button
          type="submit"
          disabled={saving || loading || !dirty}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
        >
          {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
          Save changes
        </button>
      </form>
    </section>
  );
}
