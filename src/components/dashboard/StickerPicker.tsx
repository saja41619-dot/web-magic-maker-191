import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

// Render emoji-as-sticker. We pass the emoji string back and let the
// sender turn it into a "sticker" attachment with content = emoji.
const PACKS: { name: string; emojis: string[] }[] = [
  { name: "Smileys", emojis: ["😀", "😂", "😍", "🤩", "😎", "🤗", "🤔", "😴", "🥳", "🤯", "😭", "😡"] },
  { name: "Hands", emojis: ["👍", "👎", "👏", "🙌", "🙏", "👌", "✌️", "🤝", "💪", "🫶", "🤞", "👋"] },
  { name: "Hearts", emojis: ["❤️", "🧡", "💛", "💚", "💙", "💜", "🖤", "🤍", "💖", "💘", "💕", "💔"] },
  { name: "Animals", emojis: ["🐶", "🐱", "🦊", "🐻", "🐼", "🐨", "🐯", "🦁", "🐮", "🐷", "🐸", "🐵"] },
  { name: "Food", emojis: ["🍕", "🍔", "🍟", "🌭", "🍿", "🍩", "🍪", "🎂", "🍰", "🍫", "🍦", "☕"] },
  { name: "Travel", emojis: ["✈️", "🚗", "🚕", "🚌", "🚀", "⛵", "🛶", "🏖️", "🗽", "🗼", "🏰", "🌋"] },
];

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onPick: (emoji: string) => void;
}

export function StickerPicker({ open, onOpenChange, onPick }: Props) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Stickers</DialogTitle>
        </DialogHeader>
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {PACKS.map((pack) => (
            <div key={pack.name}>
              <p className="text-xs font-semibold text-muted-foreground mb-1">{pack.name}</p>
              <div className="grid grid-cols-6 gap-1">
                {pack.emojis.map((e) => (
                  <button
                    key={e}
                    onClick={() => {
                      onPick(e);
                      onOpenChange(false);
                    }}
                    className="aspect-square flex items-center justify-center text-3xl rounded-lg hover:bg-secondary transition-colors"
                  >
                    {e}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
