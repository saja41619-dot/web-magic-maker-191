import { Bell, CheckCircle2, MessageSquare, Heart, Info } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";

const ITEMS = [
  { icon: MessageSquare, text: "Your message has been received. We'll reply soon.", time: "2 hours ago", color: "text-blue-500" },
  { icon: Heart, text: "A new project was added to your interests.", time: "Yesterday", color: "text-rose-500" },
  { icon: CheckCircle2, text: "Your profile was updated successfully.", time: "3 days ago", color: "text-emerald-500" },
  { icon: Info, text: "Welcome to your dashboard! Explore the new sections.", time: "1 week ago", color: "text-amber-500" },
];

export function NotificationsTab() {
  return (
    <Card className="border-border bg-card shadow-elegant">
      <CardHeader>
        <div className="flex items-center gap-2">
          <Bell className="h-5 w-5 text-primary" />
          <CardTitle>Notifications</CardTitle>
        </div>
        <CardDescription>Stay updated on activity related to your account</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {ITEMS.map((n, i) => {
          const Icon = n.icon;
          return (
            <div
              key={i}
              className="flex items-start gap-3 rounded-xl border border-border bg-background p-4 transition-smooth hover:border-primary/40"
            >
              <div className={`mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-secondary ${n.color}`}>
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm">{n.text}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{n.time}</p>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
