import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { ArrowUpRight, Search, X, Heart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { projectsQuery, skillsQuery } from "@/lib/queries";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

const workSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/work")({
  validateSearch: zodValidator(workSearchSchema),
  head: () => ({
    meta: [
      { title: "Work — Mihraj" },
      {
        name: "description",
        content: "Selected projects and skills by Mihraj — freelance designer and developer.",
      },
      { property: "og:title", content: "Work — Mihraj" },
      {
        property: "og:description",
        content: "Selected freelance projects across web, mobile, and brand.",
      },
    ],
  }),
  component: WorkPage,
});

const fallbackGradient = "from-purple-500/30 to-blue-500/30";

function WorkPage() {
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/work" });
  const [activeSkillId, setActiveSkillId] = useState<string | null>(null);
  const { user, isAuthenticated } = useAuth();
  const [favorites, setFavorites] = useState<Map<string, string>>(new Map());

  const { data: skills = [] } = useQuery(skillsQuery());
  const { data: projects = [] } = useQuery(projectsQuery());

  useEffect(() => {
    if (!user) {
      setFavorites(new Map());
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("user_favorites")
        .select("id, project_id")
        .eq("user_id", user.id);
      if (cancelled) return;
      const map = new Map<string, string>();
      for (const r of data ?? []) map.set(r.project_id, r.id);
      setFavorites(map);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const toggleFavorite = async (projectId: string) => {
    if (!isAuthenticated || !user) {
      toast.error("Sign in to save favorites");
      return;
    }
    const existing = favorites.get(projectId);
    if (existing) {
      const { error } = await supabase.from("user_favorites").delete().eq("id", existing);
      if (error) {
        toast.error(error.message);
        return;
      }
      const next = new Map(favorites);
      next.delete(projectId);
      setFavorites(next);
    } else {
      const { data, error } = await supabase
        .from("user_favorites")
        .insert({ user_id: user.id, project_id: projectId })
        .select("id")
        .single();
      if (error) {
        toast.error(error.message);
        return;
      }
      const next = new Map(favorites);
      next.set(projectId, data.id);
      setFavorites(next);
      toast.success("Added to favorites");
    }
  };


  const query = q.trim().toLowerCase();

  const skillGroups = useMemo(() => {
    const map = new Map<string, typeof skills>();
    for (const s of skills) {
      const list = map.get(s.category) ?? [];
      list.push(s);
      map.set(s.category, list);
    }
    return Array.from(map.entries()).map(([title, items]) => ({ title, items }));
  }, [skills]);

  const filteredGroups = useMemo(() => {
    if (!query) return skillGroups;
    return skillGroups
      .map((g) => {
        const groupMatches = g.title.toLowerCase().includes(query);
        const items = groupMatches
          ? g.items
          : g.items.filter((s) => s.name.toLowerCase().includes(query));
        return { ...g, items };
      })
      .filter((g) => g.items.length > 0);
  }, [skillGroups, query]);

  const totalMatches = filteredGroups.reduce((sum, g) => sum + g.items.length, 0);
  const activeSkill = skills.find((s) => s.id === activeSkillId) ?? null;

  const highlight = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-primary/30 px-0.5 text-foreground">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <span className="text-sm font-medium uppercase tracking-wider text-primary">
          Selected work
        </span>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
          Things I've <span className="text-gradient">built & designed</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A small selection of recent projects spanning design, development, and product strategy.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl font-bold">Skills</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) =>
                navigate({ search: { q: e.target.value }, replace: true })
              }
              placeholder="Search skills..."
              aria-label="Search skills"
              className="w-full rounded-md border border-border bg-background/60 py-2 pl-9 pr-9 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            {q && (
              <button
                type="button"
                onClick={() => navigate({ search: { q: "" }, replace: true })}
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {query && (
          <p className="mt-3 text-sm text-muted-foreground">
            {totalMatches > 0
              ? `${totalMatches} match${totalMatches === 1 ? "" : "es"} for "${q}"`
              : `No skills match "${q}"`}
          </p>
        )}

        {filteredGroups.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {filteredGroups.map((g) => (
              <div key={g.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {highlight(g.title)}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.items.map((s) => (
                    <li key={s.id}>
                      <button
                        type="button"
                        onClick={() => setActiveSkillId(s.id)}
                        className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-medium transition-smooth hover:border-primary hover:bg-secondary hover:text-primary"
                      >
                        {highlight(s.name)}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            {skills.length === 0
              ? "No skills yet — add some from the admin panel."
              : 'Try a different keyword.'}
          </div>
        )}
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Projects</h2>
        {projects.length === 0 ? (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            No projects yet — add some from the admin panel.
          </div>
        ) : (
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {projects.map((p) => {
              const isFav = favorites.has(p.id);
              return (
                <div
                  key={p.id}
                  className="group relative overflow-hidden rounded-2xl border border-border bg-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
                >
                  <button
                    type="button"
                    onClick={() => void toggleFavorite(p.id)}
                    aria-label={isFav ? "Remove from favorites" : "Add to favorites"}
                    className="absolute left-4 top-4 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-background/80 text-foreground backdrop-blur transition-smooth hover:scale-110"
                  >
                    <Heart
                      className={`h-4 w-4 ${isFav ? "fill-primary text-primary" : "text-muted-foreground"}`}
                    />
                  </button>
                  <a
                    href={p.link ?? "#"}
                    target={p.link ? "_blank" : undefined}
                    rel={p.link ? "noopener noreferrer" : undefined}
                    className="block"
                  >
                    <div
                      className={`relative aspect-[4/3] flex items-center justify-center ${
                        p.image_url ? "" : `bg-gradient-to-br ${fallbackGradient}`
                      }`}
                    >
                      {p.image_url ? (
                        <img
                          src={p.image_url}
                          alt={p.title}
                          loading="lazy"
                          decoding="async"
                          className="h-full w-full object-cover"
                        />
                      ) : (
                        <span className="font-display text-xl font-bold text-foreground/60">
                          {p.title}
                        </span>
                      )}
                      <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur transition-smooth group-hover:opacity-100">
                        <ArrowUpRight className="h-4 w-4" />
                      </div>
                    </div>
                    <div className="p-5">
                      <h3 className="font-semibold">{p.title}</h3>
                      <p className="mt-1 text-sm text-muted-foreground">{p.description}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {p.tags.map((t) => (
                          <span
                            key={t}
                            className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground"
                          >
                            {t}
                          </span>
                        ))}
                      </div>
                    </div>
                  </a>
                </div>
              );
            })}
          </div>
        )}
      </section>

      <Dialog
        open={activeSkill !== null}
        onOpenChange={(open) => !open && setActiveSkillId(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{activeSkill?.name}</DialogTitle>
            <DialogDescription className="pt-2">
              {activeSkill?.what || "A core part of my toolkit — details coming soon."}
            </DialogDescription>
          </DialogHeader>
          {activeSkill?.why && (
            <div className="mt-2 rounded-lg border border-border bg-secondary/40 p-4">
              <div className="text-xs font-semibold uppercase tracking-wider text-primary">
                Why I use it
              </div>
              <p className="mt-1 text-sm text-foreground">{activeSkill.why}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
