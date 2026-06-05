import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSchedule: (whenISO: string) => void;
}

function defaultLocal(): string {
  const d = new Date(Date.now() + 10 * 60 * 1000);
  d.setSeconds(0, 0);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function ScheduleMessageDialog({ open, onOpenChange, onSchedule }: Props) {
  const [when, setWhen] = useState<string>(defaultLocal());
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Schedule message</DialogTitle>
        </DialogHeader>
        <div className="space-y-2">
          <label className="text-xs text-muted-foreground">Send at</label>
          <Input type="datetime-local" value={when} onChange={(e) => setWhen(e.target.value)} />
          <p className="text-[10px] text-muted-foreground">
            The message will be sent automatically when you (or any of your devices) are online at that time.
          </p>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const d = new Date(when);
              if (isNaN(d.getTime()) || d.getTime() <= Date.now()) return;
              onSchedule(d.toISOString());
              onOpenChange(false);
            }}
          >
            Schedule
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
