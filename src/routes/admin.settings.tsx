import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Field } from "./admin.projects";

export const Route = createFileRoute("/admin/settings")({
  head: () => ({
    meta: [{ title: "Settings — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AdminGuard>
      <SettingsPage />
    </AdminGuard>
  ),
});

interface Settings {
  name: string;
  tagline: string;
  bio: string;
  photo_url: string | null;
  email: string | null;
  whatsapp: string | null;
  instagram: string | null;
}

function SettingsPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase.from("site_settings").select("*").eq("id", 1).single();
      if (error) toast.error(error.message);
      setSettings(data);
      setLoading(false);
    })();
  }, []);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      name: String(fd.get("name") ?? "").trim(),
      tagline: String(fd.get("tagline") ?? "").trim(),
      bio: String(fd.get("bio") ?? "").trim(),
      photo_url: String(fd.get("photo_url") ?? "").trim() || null,
      email: String(fd.get("email") ?? "").trim() || null,
      whatsapp: String(fd.get("whatsapp") ?? "").trim() || null,
      instagram: String(fd.get("instagram") ?? "").trim() || null,
    };
    setSaving(true);
    const { error } = await supabase.from("site_settings").update(payload).eq("id", 1);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Settings saved");
    setSettings(payload as Settings);
  };

  if (loading || !settings) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-3xl font-bold">Site settings</h1>
      <p className="mt-1 text-sm text-muted-foreground">Edit your name, bio, and contact info.</p>

      <form onSubmit={handleSubmit} className="mt-8 space-y-4 rounded-2xl border border-border bg-card p-6">
        <Field label="Name" name="name" defaultValue={settings.name} required />
        <Field label="Tagline" name="tagline" defaultValue={settings.tagline} />
        <Field label="Bio" name="bio" defaultValue={settings.bio} textarea />
        <Field label="Photo URL" name="photo_url" defaultValue={settings.photo_url ?? ""} />
        <Field label="Email" name="email" defaultValue={settings.email ?? ""} />
        <Field label="WhatsApp (e.g. +919792313786)" name="whatsapp" defaultValue={settings.whatsapp ?? ""} />
        <Field label="Instagram URL" name="instagram" defaultValue={settings.instagram ?? ""} />
        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={saving}
            className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
          >
            {saving && <Loader2 className="h-4 w-4 animate-spin" />}
            Save changes
          </button>
        </div>
      </form>
    </div>
  );
}
