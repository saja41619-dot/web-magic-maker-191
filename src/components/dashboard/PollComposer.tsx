import { useState } from "react";
import { X, Plus, Loader2, BarChart3 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { toast } from "sonner";

export function PollComposer({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (pollId: string) => void | Promise<void>;
}) {
  const { user } = useAuth();
  const [question, setQuestion] = useState("");
  const [options, setOptions] = useState<string[]>(["", ""]);
  const [multi, setMulti] = useState(false);
  const [posting, setPosting] = useState(false);

  if (!open) return null;

  const updateOption = (idx: number, v: string) =>
    setOptions((prev) => prev.map((o, i) => (i === idx ? v : o)));

  const submit = async () => {
    if (!user) return;
    const q = question.trim();
    const opts = options.map((o) => o.trim()).filter(Boolean);
    if (!q || opts.length < 2) {
      toast.error("Question and at least 2 options are required");
      return;
    }
    setPosting(true);
    try {
      const { data: poll, error: pErr } = await supabase
        .from("polls")
        .insert({ created_by: user.id, question: q, multiple_choice: multi })
        .select("id")
        .single();
      if (pErr || !poll) throw pErr ?? new Error("Failed");
      const { error: oErr } = await supabase.from("poll_options").insert(
        opts.map((label, position) => ({ poll_id: poll.id, label, position })),
      );
      if (oErr) throw oErr;
      await onCreated(poll.id);
      onClose();
      setQuestion("");
      setOptions(["", ""]);
      setMulti(false);
    } catch (err: any) {
      toast.error(err.message ?? "Failed to create poll");
    } finally {
      setPosting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md rounded-2xl bg-card shadow-elegant"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-border p-4">
          <h3 className="font-display font-semibold flex items-center gap-2">
            <BarChart3 className="h-5 w-5" /> Create poll
          </h3>
          <button onClick={onClose} className="rounded-lg p-1 hover:bg-secondary">
            <X className="h-4 w-4" />
          </button>
        </div>
        <div className="p-4 space-y-3">
          <input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            placeholder="Ask a question…"
            maxLength={300}
            className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
          />
          <div className="space-y-2">
            {options.map((o, i) => (
              <div key={i} className="flex gap-2">
                <input
                  value={o}
                  onChange={(e) => updateOption(i, e.target.value)}
                  placeholder={`Option ${i + 1}`}
                  maxLength={200}
                  className="flex-1 rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary"
                />
                {options.length > 2 && (
                  <button
                    onClick={() => setOptions((p) => p.filter((_, idx) => idx !== i))}
                    className="rounded-lg p-2 text-muted-foreground hover:text-destructive"
                  >
                    <X className="h-4 w-4" />
                  </button>
                )}
              </div>
            ))}
            {options.length < 10 && (
              <button
                onClick={() => setOptions((p) => [...p, ""])}
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                <Plus className="h-3 w-3" /> Add option
              </button>
            )}
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={multi} onChange={(e) => setMulti(e.target.checked)} />
            Allow multiple choices
          </label>
        </div>
        <div className="flex gap-2 border-t border-border p-3">
          <button
            onClick={onClose}
            className="flex-1 rounded-lg border border-border py-2 text-sm hover:bg-secondary"
          >
            Cancel
          </button>
          <button
            onClick={() => void submit()}
            disabled={posting}
            className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg bg-gradient-primary py-2 text-sm font-semibold text-primary-foreground disabled:opacity-50"
          >
            {posting && <Loader2 className="h-4 w-4 animate-spin" />}
            Send poll
          </button>
        </div>
      </div>
    </div>
  );
}
