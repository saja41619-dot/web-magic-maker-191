import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

// Curated free GIPHY direct links (public sample set). For production swap
// with Tenor / Giphy API + key.
const PRESET_GIFS: { url: string; tags: string[] }[] = [
  { url: "https://media.giphy.com/media/3oEjI6SIIHBdRxXI40/giphy.gif", tags: ["hi", "hello", "wave"] },
  { url: "https://media.giphy.com/media/26u4cqiYI30juCOGY/giphy.gif", tags: ["lol", "laugh"] },
  { url: "https://media.giphy.com/media/l0HlNQ03J5JxX6lva/giphy.gif", tags: ["thumbs", "ok", "yes"] },
  { url: "https://media.giphy.com/media/3o7TKMt1VVNkHV2PaE/giphy.gif", tags: ["love", "heart"] },
  { url: "https://media.giphy.com/media/l0MYt5jPR6QX5pnqM/giphy.gif", tags: ["clap", "yes"] },
  { url: "https://media.giphy.com/media/3oz8xAFtqoOUUrsh7W/giphy.gif", tags: ["sad", "cry"] },
  { url: "https://media.giphy.com/media/l46Cy1rHbReiKUDmU/giphy.gif", tags: ["dance", "party"] },
  { url: "https://media.giphy.com/media/26gsspfbuhAdthMko/giphy.gif", tags: ["wow", "shock"] },
  { url: "https://media.giphy.com/media/l3q2zVr6cu95nFjPG/giphy.gif", tags: ["ok", "fine"] },
  { url: "https://media.giphy.com/media/3o6Mb8E1zS0V6Z9CKQ/giphy.gif", tags: ["happy", "yay"] },
  { url: "https://media.giphy.com/media/xT0xeJpnrWC4XWblEk/giphy.gif", tags: ["thanks"] },
  { url: "https://media.giphy.com/media/l0HU7jj0ivEFyZuY0/giphy.gif", tags: ["bye"] },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (url: string) => void;
}

export function GifPicker({ open, onOpenChange, onPick }: Props) {
  const [q, setQ] = useState("");
  const filtered = q.trim()
    ? PRESET_GIFS.filter((g) => g.tags.some((t) => t.includes(q.trim().toLowerCase())))
    : PRESET_GIFS;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Pick a GIF</DialogTitle>
        </DialogHeader>
        <Input placeholder="Search (hi, lol, love...)" value={q} onChange={(e) => setQ(e.target.value)} />
        <div className="grid grid-cols-3 gap-2 max-h-80 overflow-y-auto">
          {filtered.map((g) => (
            <button
              key={g.url}
              onClick={() => {
                onPick(g.url);
                onOpenChange(false);
              }}
              className="aspect-square overflow-hidden rounded-lg border border-border hover:border-primary"
            >
              <img src={g.url} alt="" className="h-full w-full object-cover" />
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="col-span-3 text-center text-xs text-muted-foreground py-6">No GIFs found.</p>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
