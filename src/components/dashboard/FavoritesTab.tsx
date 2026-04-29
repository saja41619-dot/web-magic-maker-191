import { useEffect, useState } from "react";
import { Heart, Loader2, ArrowUpRight, X } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/lib/auth";

interface FavProject {
  fav_id: string;
  id: string;
  title: string;
  description: string;
  image_url: string | null;
  link: string | null;
}

export function FavoritesTab() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<FavProject[]>([]);

  useEffect(() => {
    if (!user) return;
    let cancelled = false;
    void (async () => {
      const { data } = await supabase
        .from("user_favorites")
        .select("id, projects:project_id (id, title, description, image_url, link)")
        .eq("user_id", user.id);
      if (cancelled) return;
      const list: FavProject[] = (data ?? [])
        .filter((r: any) => r.projects)
        .map((r: any) => ({
          fav_id: r.id,
          id: r.projects.id,
          title: r.projects.title,
          description: r.projects.description,
          image_url: r.projects.image_url,
          link: r.projects.link,
        }));
      setItems(list);
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [user]);

  const remove = async (favId: string) => {
    const { error } = await supabase.from("user_favorites").delete().eq("id", favId);
    if (error) {
      toast.error(error.message);
      return;
    }
    setItems((prev) => prev.filter((i) => i.fav_id !== favId));
    toast.success("Removed from favorites");
  };

  return (
    <section className="rounded-2xl border border-border bg-card p-6 shadow-elegant sm:p-8">
      <div className="mb-6 flex items-center gap-2">
        <Heart className="h-4 w-4 text-primary" />
        <h2 className="font-display text-lg font-semibold">Favorite projects</h2>
      </div>
      {loading ? (
        <div className="flex justify-center py-10">
          <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
        </div>
      ) : items.length === 0 ? (
        <p className="py-10 text-center text-sm text-muted-foreground">
          No favorites yet — tap the heart on any project to save it here.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {items.map((p) => (
            <div
              key={p.fav_id}
              className="group relative overflow-hidden rounded-xl border border-border bg-background/40"
            >
              <button
                onClick={() => remove(p.fav_id)}
                aria-label="Remove favorite"
                className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-background/80 text-muted-foreground backdrop-blur transition-smooth hover:text-destructive"
              >
                <X className="h-4 w-4" />
              </button>
              <a
                href={p.link ?? "#"}
                target={p.link ? "_blank" : undefined}
                rel={p.link ? "noopener noreferrer" : undefined}
                className="block"
              >
                <div className="aspect-[4/3] bg-gradient-to-br from-purple-500/20 to-blue-500/20">
                  {p.image_url && (
                    <img
                      src={p.image_url}
                      alt={p.title}
                      loading="lazy"
                      className="h-full w-full object-cover"
                    />
                  )}
                </div>
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="font-semibold">{p.title}</h3>
                    {p.link && <ArrowUpRight className="h-4 w-4 shrink-0 text-muted-foreground" />}
                  </div>
                  <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{p.description}</p>
                </div>
              </a>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
