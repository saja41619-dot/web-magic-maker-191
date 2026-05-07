import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type FormEvent } from "react";
import { AdminGuard } from "@/components/admin/AdminGuard";
import { supabase } from "@/integrations/supabase/client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil, Trash2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/admin/projects")({
  head: () => ({
    meta: [{ title: "Projects — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AdminGuard>
      <ProjectsPage />
    </AdminGuard>
  ),
});

interface Project {
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  tags: string[];
  link: string | null;
  sort_order: number;
}

function ProjectsPage() {
  const [items, setItems] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Project | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("projects")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this project?")) return;
    const { error } = await supabase.from("projects").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const openNew = () => {
    setEditing({
      id: "",
      title: "",
      description: "",
      image_url: "",
      tags: [],
      link: "",
      sort_order: (items.at(-1)?.sort_order ?? 0) + 10,
    });
    setOpen(true);
  };

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage portfolio items.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      <div className="mt-8 rounded-2xl border border-border bg-card">
        {loading ? (
          <div className="flex h-32 items-center justify-center">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : items.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">No projects yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((p) => (
              <li key={p.id} className="flex items-center justify-between px-5 py-3">
                <div className="min-w-0 flex-1">
                  <div className="font-medium">{p.title}</div>
                  <div className="truncate text-xs text-muted-foreground">{p.description}</div>
                  {p.tags.length > 0 && (
                    <div className="mt-1 flex flex-wrap gap-1">
                      {p.tags.map((t) => (
                        <span key={t} className="rounded bg-secondary/60 px-2 py-0.5 text-[10px] text-muted-foreground">
                          {t}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <div className="ml-4 flex shrink-0 gap-1">
                  <button
                    onClick={() => {
                      setEditing(p);
                      setOpen(true);
                    }}
                    className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                    aria-label="Edit"
                  >
                    <Pencil className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => void remove(p.id)}
                    className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                    aria-label="Delete"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>

      <ProjectDialog
        open={open}
        editing={editing}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        onSaved={() => {
          setOpen(false);
          setEditing(null);
          void load();
        }}
      />
    </div>
  );
}

function ProjectDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Project | null;
  onClose: () => void;
  onSaved: () => void;
}) {
  const [saving, setSaving] = useState(false);
  if (!editing) return null;
  const isNew = !editing.id;

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const payload = {
      title: String(fd.get("title") ?? "").trim(),
      description: String(fd.get("description") ?? "").trim(),
      image_url: String(fd.get("image_url") ?? "").trim() || null,
      link: String(fd.get("link") ?? "").trim() || null,
      tags: String(fd.get("tags") ?? "")
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      sort_order: Number(fd.get("sort_order") ?? 0),
    };
    if (!payload.title) return toast.error("Title is required");
    setSaving(true);
    const { error } = isNew
      ? await supabase.from("projects").insert(payload)
      : await supabase.from("projects").update(payload).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "New project" : "Edit project"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Title" name="title" defaultValue={editing.title} required />
          <Field label="Description" name="description" defaultValue={editing.description} textarea />
          <Field label="Image URL" name="image_url" defaultValue={editing.image_url ?? ""} />
          <Field label="Link" name="link" defaultValue={editing.link ?? ""} />
          <Field label="Tags (comma separated)" name="tags" defaultValue={editing.tags.join(", ")} />
          <Field label="Sort order" name="sort_order" type="number" defaultValue={String(editing.sort_order)} />
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-border px-4 py-2 text-sm hover:bg-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              Save
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function Field({
  label,
  name,
  defaultValue,
  type = "text",
  required,
  textarea,
}: {
  label: string;
  name: string;
  defaultValue?: string;
  type?: string;
  required?: boolean;
  textarea?: boolean;
}) {
  const cls =
    "mt-1.5 w-full rounded-md border border-border bg-background/60 px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
  return (
    <div>
      <label className="text-sm font-medium">{label}</label>
      {textarea ? (
        <textarea name={name} defaultValue={defaultValue} rows={3} className={cls} />
      ) : (
        <input name={name} type={type} defaultValue={defaultValue} required={required} className={cls} />
      )}
    </div>
  );
}
