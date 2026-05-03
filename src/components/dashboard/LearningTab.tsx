import { BookOpen, PlayCircle, FileText, Clock, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const COURSES = [
  { id: 1, title: "Web Design Fundamentals", progress: 65, lessons: 12, duration: "4h 20m" },
  { id: 2, title: "React for Beginners", progress: 30, lessons: 18, duration: "6h 10m" },
  { id: 3, title: "UI/UX Principles", progress: 100, lessons: 8, duration: "2h 45m" },
];

const RESOURCES = [
  { id: 1, type: "Video", title: "Master CSS Grid in 20 minutes", icon: PlayCircle, tag: "CSS" },
  { id: 2, type: "Article", title: "Modern JavaScript Best Practices", icon: FileText, tag: "JS" },
  { id: 3, type: "Video", title: "Figma to Code Workflow", icon: PlayCircle, tag: "Design" },
  { id: 4, type: "Article", title: "TanStack Router Deep Dive", icon: FileText, tag: "React" },
];

export function LearningTab() {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-elegant">
        <CardHeader>
          <div className="flex items-center gap-2">
            <BookOpen className="h-5 w-5 text-primary" />
            <CardTitle>My Courses</CardTitle>
          </div>
          <CardDescription>Continue where you left off</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {COURSES.map((c) => (
            <div
              key={c.id}
              className="group rounded-xl border border-border bg-background p-4 transition-smooth hover:border-primary/40 hover:shadow-glow"
            >
              <div className="mb-3 flex aspect-video items-center justify-center rounded-lg bg-gradient-primary/10">
                <BookOpen className="h-10 w-10 text-primary/50" />
              </div>
              <h3 className="line-clamp-1 font-semibold">{c.title}</h3>
              <p className="mt-1 flex items-center gap-1 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" /> {c.duration} · {c.lessons} lessons
              </p>
              <div className="mt-3">
                <div className="mb-1 flex justify-between text-xs">
                  <span className="text-muted-foreground">Progress</span>
                  <span className="font-medium">{c.progress}%</span>
                </div>
                <Progress value={c.progress} className="h-1.5" />
              </div>
              <Button size="sm" variant="ghost" className="mt-3 w-full justify-between">
                {c.progress === 100 ? "Review" : "Continue"}
                <ArrowRight className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-elegant">
        <CardHeader>
          <CardTitle>Resources & Tutorials</CardTitle>
          <CardDescription>Curated articles and videos to help you grow</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {RESOURCES.map((r) => {
            const Icon = r.icon;
            return (
              <div
                key={r.id}
                className="flex items-center gap-4 rounded-xl border border-border bg-background p-3 transition-smooth hover:border-primary/40"
              >
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="h-5 w-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{r.title}</p>
                  <p className="text-xs text-muted-foreground">{r.type}</p>
                </div>
                <Badge variant="secondary">{r.tag}</Badge>
              </div>
            );
          })}
        </CardContent>
      </Card>
    </div>
  );
}
