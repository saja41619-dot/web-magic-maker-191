import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Coffee, MapPin, Globe, Heart } from "lucide-react";
import mihrajPhoto from "@/assets/mihraj.jpg";

export const Route = createFileRoute("/about")({
  head: () => ({
    meta: [
      { title: "About — Mihraj" },
      {
        name: "description",
        content: "Learn more about Mihraj — a freelance designer and developer.",
      },
      { property: "og:title", content: "About — Mihraj" },
      {
        property: "og:description",
        content: "A freelance designer and developer's story, approach, and values.",
      },
    ],
  }),
  component: AboutPage,
});

const facts = [
  { Icon: MapPin, label: "Based in", value: "Your City" },
  { Icon: Coffee, label: "Fueled by", value: "Coffee & curiosity" },
  { Icon: Globe, label: "Available", value: "Worldwide, remote" },
  { Icon: Heart, label: "Loves", value: "Clean design & code" },
];

function AboutPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-4xl px-4 pb-16 pt-16 sm:px-6 sm:pt-24">
        <div className="grid items-center gap-10 md:grid-cols-[auto_1fr]">
          <div className="relative mx-auto aspect-square w-48 sm:w-56 md:w-72">
            <div className="absolute -inset-4 rounded-3xl bg-gradient-primary opacity-30 blur-2xl" />
            <img
              src={mihrajPhoto}
              alt="Mihraj"
              width={288}
              height={288}
              loading="lazy"
              decoding="async"
              sizes="(min-width: 768px) 288px, (min-width: 640px) 224px, 192px"
              className="relative h-full w-full rounded-3xl border border-border object-cover object-top shadow-elegant"
            />
          </div>
          <div>
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              About me
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
              Designer, developer, <span className="text-gradient">problem-solver</span>.
            </h1>
            <p className="mt-5 text-muted-foreground">
              I'm Mihraj — a freelance designer and developer with 6+ years of experience
              helping brands and startups ship beautiful, functional products. I believe great
              software is invisible: it just works, and it feels right.
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">My approach</h2>
        <div className="mt-6 space-y-4 text-muted-foreground">
          <p>
            I work closely with a small number of clients at a time so I can dive deep into
            each project. Every engagement starts with understanding the people you're building
            for and the outcomes you care about.
          </p>
          <p>
            From there, I move fast — wireframes, prototypes, and tight feedback loops — until
            we land on something that genuinely works. Pretty pixels are nice, but shipped,
            measurable results are the goal.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold sm:text-3xl">Quick facts</h2>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {facts.map(({ Icon, label, value }) => (
            <div
              key={label}
              className="flex items-center gap-4 rounded-xl border border-border bg-card p-5 transition-smooth hover:border-primary/50"
            >
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
                <Icon className="h-5 w-5" />
              </div>
              <div>
                <div className="text-xs uppercase tracking-wider text-muted-foreground">
                  {label}
                </div>
                <div className="font-semibold">{value}</div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </Layout>
  );
}