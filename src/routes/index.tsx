import { createFileRoute, Link } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowRight, Sparkles, Code2, Palette, Rocket } from "lucide-react";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mihraj — Freelance Designer & Developer" },
      {
        name: "description",
        content:
          "Freelance designer and developer building modern, performant digital products for ambitious brands.",
      },
      { property: "og:title", content: "Mihraj — Freelance Designer & Developer" },
      {
        property: "og:description",
        content: "Modern, performant digital products for ambitious brands.",
      },
    ],
  }),
  component: HomePage,
});

const services = [
  {
    Icon: Palette,
    title: "Brand & UI Design",
    desc: "Identity, design systems, and pixel-perfect interfaces that feel effortless.",
  },
  {
    Icon: Code2,
    title: "Web Development",
    desc: "Fast, accessible, modern web apps built with React and the best tooling.",
  },
  {
    Icon: Rocket,
    title: "Product Strategy",
    desc: "From idea to launch — wireframes, prototypes, and a clear roadmap.",
  },
];

const featured = [
  { title: "Project One", tag: "Web App", color: "from-purple-500/30 to-blue-500/30" },
  { title: "Project Two", tag: "Branding", color: "from-pink-500/30 to-purple-500/30" },
  { title: "Project Three", tag: "Mobile", color: "from-blue-500/30 to-cyan-500/30" },
];

function HomePage() {
  return (
    <Layout>
      {/* Hero */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-6xl px-4 pb-20 pt-20 sm:px-6 sm:pt-28 md:pb-32 md:pt-36">
          <div className="mx-auto max-w-3xl text-center">
            <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-4 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur">
              <Sparkles className="h-3.5 w-3.5 text-primary" />
              Available for freelance work
            </div>
            <h1 className="mt-6 font-display text-5xl font-bold leading-[1.05] tracking-tight sm:text-6xl md:text-7xl">
              Hi, I'm <span className="text-gradient">Mihraj</span>
              <br />a freelance creator.
            </h1>
            <p className="mx-auto mt-6 max-w-xl text-base text-muted-foreground sm:text-lg">
              I help startups and brands design and build digital products that look
              stunning and feel incredible to use.
            </p>
            <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Link
                to="/work"
                className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
              >
                View My Work <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/contact"
                className="inline-flex items-center gap-2 rounded-md border border-border bg-card/60 px-6 py-3 text-sm font-semibold text-foreground backdrop-blur transition-smooth hover:border-primary hover:bg-card"
              >
                Hire Me
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Services */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-12 text-center">
          <h2 className="font-display text-3xl font-bold sm:text-4xl">What I do</h2>
          <p className="mt-3 text-muted-foreground">
            A focused set of services to take your idea from zero to launch.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {services.map(({ Icon, title, desc }) => (
            <div
              key={title}
              className="group rounded-2xl border border-border bg-card p-6 transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-primary text-primary-foreground shadow-glow">
                <Icon className="h-6 w-6" />
              </div>
              <h3 className="mt-5 text-lg font-semibold">{title}</h3>
              <p className="mt-2 text-sm text-muted-foreground">{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Featured work */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="mb-12 flex flex-col items-start justify-between gap-4 sm:flex-row sm:items-end">
          <div>
            <h2 className="font-display text-3xl font-bold sm:text-4xl">Featured work</h2>
            <p className="mt-3 text-muted-foreground">A peek at recent projects.</p>
          </div>
          <Link
            to="/work"
            className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
          >
            See all <ArrowRight className="h-4 w-4" />
          </Link>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {featured.map((p) => (
            <div
              key={p.title}
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div
                className={`relative aspect-[4/3] bg-gradient-to-br ${p.color} flex items-center justify-center`}
              >
                <span className="font-display text-2xl font-bold text-foreground/60">
                  {p.title}
                </span>
              </div>
              <div className="p-5">
                <span className="text-xs uppercase tracking-wider text-primary">{p.tag}</span>
                <h3 className="mt-1 text-lg font-semibold">{p.title}</h3>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6 md:py-24">
        <div className="relative overflow-hidden rounded-3xl border border-border bg-card p-10 text-center shadow-elegant md:p-16">
          <div className="absolute inset-0 bg-gradient-primary opacity-10" />
          <div className="relative">
            <h2 className="font-display text-3xl font-bold sm:text-4xl">
              Got a project in mind?
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-muted-foreground">
              Let's chat about what you're building. I reply within 24 hours.
            </p>
            <Link
              to="/contact"
              className="mt-8 inline-flex items-center gap-2 rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
            >
              Start a project <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>
    </Layout>
  );
}
