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
import { Field } from "./admin.projects";

export const Route = createFileRoute("/admin/skills")({
  head: () => ({
    meta: [{ title: "Skills — Admin" }, { name: "robots", content: "noindex, nofollow" }],
  }),
  component: () => (
    <AdminGuard>
      <SkillsPage />
    </AdminGuard>
  ),
});

interface Skill {
  id: string;
  name: string;
  category: string;
  what: string;
  why: string;
  sort_order: number;
}

function SkillsPage() {
  const [items, setItems] = useState<Skill[]>([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<Skill | null>(null);
  const [open, setOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("skills")
      .select("*")
      .order("category")
      .order("sort_order");
    if (error) toast.error(error.message);
    setItems(data ?? []);
    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const remove = async (id: string) => {
    if (!confirm("Delete this skill?")) return;
    const { error } = await supabase.from("skills").delete().eq("id", id);
    if (error) return toast.error(error.message);
    toast.success("Deleted");
    void load();
  };

  const openNew = () => {
    setEditing({
      id: "",
      name: "",
      category: "",
      what: "",
      why: "",
      sort_order: (items.at(-1)?.sort_order ?? 0) + 10,
    });
    setOpen(true);
  };

  // Group by category
  const grouped = items.reduce<Record<string, Skill[]>>((acc, s) => {
    (acc[s.category] ||= []).push(s);
    return acc;
  }, {});

  return (
    <div className="mx-auto max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold">Skills</h1>
          <p className="mt-1 text-sm text-muted-foreground">Manage skills shown on Work page.</p>
        </div>
        <button
          onClick={openNew}
          className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow"
        >
          <Plus className="h-4 w-4" /> New
        </button>
      </div>

      {loading ? (
        <div className="mt-8 flex h-32 items-center justify-center">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <div className="mt-8 space-y-6">
          {Object.entries(grouped).map(([cat, skills]) => (
            <div key={cat} className="rounded-2xl border border-border bg-card">
              <div className="border-b border-border px-5 py-3 text-sm font-semibold uppercase tracking-wider text-primary">
                {cat}
              </div>
              <ul className="divide-y divide-border">
                {skills.map((s) => (
                  <li key={s.id} className="flex items-center justify-between px-5 py-3">
                    <div className="min-w-0 flex-1">
                      <div className="font-medium">{s.name}</div>
                      <div className="truncate text-xs text-muted-foreground">{s.what}</div>
                    </div>
                    <div className="ml-4 flex shrink-0 gap-1">
                      <button
                        onClick={() => {
                          setEditing(s);
                          setOpen(true);
                        }}
                        className="rounded p-2 text-muted-foreground hover:bg-secondary hover:text-foreground"
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => void remove(s.id)}
                        className="rounded p-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          {items.length === 0 && (
            <div className="rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
              No skills yet.
            </div>
          )}
        </div>
      )}

      <SkillDialog
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

function SkillDialog({
  open,
  editing,
  onClose,
  onSaved,
}: {
  open: boolean;
  editing: Skill | null;
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
      name: String(fd.get("name") ?? "").trim(),
      category: String(fd.get("category") ?? "").trim(),
      what: String(fd.get("what") ?? "").trim(),
      why: String(fd.get("why") ?? "").trim(),
      sort_order: Number(fd.get("sort_order") ?? 0),
    };
    if (!payload.name || !payload.category) return toast.error("Name and category are required");
    setSaving(true);
    const { error } = isNew
      ? await supabase.from("skills").insert(payload)
      : await supabase.from("skills").update(payload).eq("id", editing.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Saved");
    onSaved();
  };

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isNew ? "New skill" : "Edit skill"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field label="Name" name="name" defaultValue={editing.name} required />
          <Field label="Category" name="category" defaultValue={editing.category} required />
          <Field label="What it is" name="what" defaultValue={editing.what} textarea />
          <Field label="Why I use it" name="why" defaultValue={editing.why} textarea />
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
