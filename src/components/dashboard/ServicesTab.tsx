import { Palette, Code2, Smartphone, Megaphone, PenTool, Camera, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";

const SERVICES = [
  { icon: Palette, title: "UI/UX Design", desc: "Modern, user-centered interfaces for web and mobile.", color: "from-pink-500 to-rose-500" },
  { icon: Code2, title: "Web Development", desc: "Fast, responsive websites built with React & TanStack.", color: "from-blue-500 to-cyan-500" },
  { icon: Smartphone, title: "Mobile Apps", desc: "Cross-platform mobile solutions tailored to your needs.", color: "from-violet-500 to-purple-500" },
  { icon: Megaphone, title: "Digital Marketing", desc: "Grow your brand with SEO, social, and content strategy.", color: "from-orange-500 to-amber-500" },
  { icon: PenTool, title: "Branding & Logo", desc: "Distinctive identities that make your brand stand out.", color: "from-emerald-500 to-teal-500" },
  { icon: Camera, title: "Photography", desc: "Professional photo shoots for products and events.", color: "from-indigo-500 to-blue-500" },
];

export function ServicesTab() {
  return (
    <Card className="border-border bg-card shadow-elegant">
      <CardHeader>
        <CardTitle>Common Services</CardTitle>
        <CardDescription>Browse the services available — get in touch to request any of them.</CardDescription>
      </CardHeader>
      <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {SERVICES.map((s) => {
          const Icon = s.icon;
          return (
            <div
              key={s.title}
              className="group relative overflow-hidden rounded-xl border border-border bg-background p-5 transition-smooth hover:border-primary/40 hover:shadow-glow"
            >
              <div className={`mb-4 inline-flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br ${s.color} text-white shadow-md`}>
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="font-display text-lg font-semibold">{s.title}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
              <Button asChild size="sm" variant="ghost" className="mt-3 -ml-2">
                <Link to="/contact">
                  Request <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}
