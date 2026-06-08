import { useEffect, useState } from "react";
import { BarChart3, Check, Lock } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";
import { cn } from "@/lib/utils";

interface Poll {
  id: string;
  created_by: string;
  question: string;
  multiple_choice: boolean;
  closed: boolean;
}

interface Option {
  id: string;
  poll_id: string;
  label: string;
  position: number;
}

interface Vote {
  id: string;
  poll_id: string;
  option_id: string;
  user_id: string;
}

export function PollDisplay({ pollId, mine }: { pollId: string; mine: boolean }) {
  const { user } = useAuth();
  const [poll, setPoll] = useState<Poll | null>(null);
  const [options, setOptions] = useState<Option[]>([]);
  const [votes, setVotes] = useState<Vote[]>([]);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [{ data: p }, { data: o }, { data: v }] = await Promise.all([
        supabase.from("polls").select("*").eq("id", pollId).maybeSingle(),
        supabase.from("poll_options").select("*").eq("poll_id", pollId).order("position"),
        supabase.from("poll_votes").select("*").eq("poll_id", pollId),
      ]);
      if (cancelled) return;
      setPoll(p as Poll | null);
      setOptions((o ?? []) as Option[]);
      setVotes((v ?? []) as Vote[]);
    })();

    const ch = supabase
      .channel(`poll-${pollId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "poll_votes", filter: `poll_id=eq.${pollId}` },
        async () => {
          const { data } = await supabase.from("poll_votes").select("*").eq("poll_id", pollId);
          setVotes((data ?? []) as Vote[]);
        },
      )
      .subscribe();
    return () => {
      cancelled = true;
      void supabase.removeChannel(ch);
    };
  }, [pollId]);

  if (!poll) return null;

  const totalVoters = new Set(votes.map((v) => v.user_id)).size;
  const myVotes = new Set(votes.filter((v) => v.user_id === user?.id).map((v) => v.option_id));
  const isOwner = user?.id === poll.created_by;

  const vote = async (optionId: string) => {
    if (!user || poll.closed) return;
    setBusy(true);
    try {
      if (myVotes.has(optionId)) {
        await supabase
          .from("poll_votes")
          .delete()
          .eq("user_id", user.id)
          .eq("option_id", optionId);
      } else {
        if (!poll.multiple_choice && myVotes.size > 0) {
          await supabase.from("poll_votes").delete().eq("user_id", user.id).eq("poll_id", pollId);
        }
        await supabase
          .from("poll_votes")
          .insert({ poll_id: pollId, option_id: optionId, user_id: user.id });
      }
    } finally {
      setBusy(false);
    }
  };

  const closePoll = async () => {
    await supabase.from("polls").update({ closed: true }).eq("id", pollId);
    setPoll((p) => (p ? { ...p, closed: true } : p));
  };

  return (
    <div className={cn("min-w-[240px] max-w-[320px]", mine ? "text-foreground" : "text-foreground")}>
      <div className="mb-2 flex items-start gap-2">
        <BarChart3 className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <div className="flex-1">
          <p className="font-semibold text-sm break-words">{poll.question}</p>
          <p className="mt-0.5 text-[10px] opacity-60">
            {poll.multiple_choice ? "Multiple choice" : "Single choice"} · {totalVoters}{" "}
            {totalVoters === 1 ? "vote" : "votes"}
            {poll.closed && (
              <span className="ml-1 inline-flex items-center gap-0.5">
                · <Lock className="h-2.5 w-2.5" /> Closed
              </span>
            )}
          </p>
        </div>
      </div>
      <div className="space-y-1.5">
        {options.map((opt) => {
          const count = votes.filter((v) => v.option_id === opt.id).length;
          const pct = totalVoters === 0 ? 0 : Math.round((count / totalVoters) * 100);
          const selected = myVotes.has(opt.id);
          return (
            <button
              key={opt.id}
              onClick={() => void vote(opt.id)}
              disabled={busy || poll.closed}
              className={cn(
                "relative w-full overflow-hidden rounded-lg border px-3 py-1.5 text-left text-xs transition",
                selected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-background hover:bg-secondary",
                (busy || poll.closed) && "opacity-70 cursor-default",
              )}
            >
              <div
                className="absolute inset-y-0 left-0 bg-primary/15 transition-all"
                style={{ width: `${pct}%` }}
              />
              <div className="relative flex items-center justify-between gap-2">
                <span className="flex items-center gap-1.5 truncate">
                  {selected && <Check className="h-3 w-3 text-primary" />}
                  {opt.label}
                </span>
                <span className="text-[10px] opacity-70 shrink-0">
                  {count} · {pct}%
                </span>
              </div>
            </button>
          );
        })}
      </div>
      {isOwner && !poll.closed && (
        <button
          onClick={() => void closePoll()}
          className="mt-2 text-[10px] text-muted-foreground hover:underline"
        >
          Close voting
        </button>
      )}
    </div>
  );
}
