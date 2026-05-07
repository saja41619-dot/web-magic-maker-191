import { Activity, LogIn, Edit3, Heart, Mail } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ACTIVITY = [
  { icon: LogIn, label: "Signed in", time: "Just now" },
  { icon: Edit3, label: "Updated profile picture", time: "Today, 10:24 AM" },
  { icon: Heart, label: "Saved a project to favorites", time: "Yesterday" },
  { icon: Mail, label: "Sent a contact message", time: "2 days ago" },
  { icon: LogIn, label: "Signed in from a new device", time: "5 days ago" },
];

export function ActivityTab() {
  return (
    <Card className="border-border bg-card shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Activity className="h-5 w-5 text-primary" />
          <CardTitle>Activity History</CardTitle>
        </div>
        <CardDescription>Recent actions on your account</CardDescription>
      </CardHeader>
      <CardContent>
        <ol className="relative ml-3 space-y-5 border-l border-border pl-6">
          {ACTIVITY.map((a, i) => {
            const Icon = a.icon;
            return (
              <li key={i} className="relative">
                <span className="absolute -left-[34px] flex h-7 w-7 items-center justify-center rounded-full border border-border bg-background text-primary">
                  <Icon className="h-3.5 w-3.5" />
                </span>
                <p className="text-sm font-medium">{a.label}</p>
                <p className="text-xs text-muted-foreground">{a.time}</p>
              </li>
            );
          })}
        </ol>
      </CardContent>
    </Card>
  );
}
