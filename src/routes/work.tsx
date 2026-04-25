import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";

const workSearchSchema = z.object({
  q: fallback(z.string(), "").default(""),
});

export const Route = createFileRoute("/work")({
  validateSearch: zodValidator(workSearchSchema),
  head: () => ({
    meta: [
      { title: "Work — Mihraj" },
      {
        name: "description",
        content: "Selected projects and skills by Mihraj — freelance designer and developer.",
      },
      { property: "og:title", content: "Work — Mihraj" },
      {
        property: "og:description",
        content: "Selected freelance projects across web, mobile, and brand.",
      },
    ],
  }),
  component: WorkPage,
});

const skillGroups = [
  {
    title: "Design",
    skills: ["UI/UX Design", "Branding", "Design Systems", "Prototyping", "Figma"],
  },
  {
    title: "Development",
    skills: ["React", "TypeScript", "Tailwind CSS", "Next.js", "Node.js"],
  },
  {
    title: "Tools",
    skills: ["Git", "Vite", "Framer", "Webflow", "Notion"],
  },
  {
    title: "Offensive Security",
    skills: [
      "Penetration Testing",
      "Vulnerability Assessment",
      "Web App Pentesting (OWASP Top 10)",
      "Network Pentesting",
      "Privilege Escalation",
      "Social Engineering",
    ],
  },
  {
    title: "Security Tools",
    skills: [
      "Kali Linux",
      "Metasploit",
      "Burp Suite",
      "Nmap",
      "Wireshark",
      "sqlmap",
      "Hashcat",
      "Hydra",
    ],
  },
  {
    title: "Networking & Recon",
    skills: [
      "TCP/IP",
      "DNS / HTTP / TLS",
      "Linux Administration",
      "Active Directory",
      "OSINT",
      "Log Analysis",
    ],
  },
];

const projects = [
  {
    title: "Project Title One",
    desc: "A modern SaaS dashboard with real-time analytics and beautiful data viz.",
    tags: ["React", "TypeScript", "Design"],
    color: "from-purple-500/30 to-blue-500/30",
  },
  {
    title: "Project Title Two",
    desc: "Complete brand redesign and marketing website for a fintech startup.",
    tags: ["Branding", "Web", "Figma"],
    color: "from-pink-500/30 to-purple-500/30",
  },
  {
    title: "Project Title Three",
    desc: "Mobile-first e-commerce experience with a focus on conversion.",
    tags: ["Mobile", "UX", "Shopify"],
    color: "from-blue-500/30 to-cyan-500/30",
  },
  {
    title: "Project Title Four",
    desc: "Design system and component library used across 12+ products.",
    tags: ["Design System", "React"],
    color: "from-amber-500/30 to-pink-500/30",
  },
  {
    title: "Project Title Five",
    desc: "AI-powered productivity app with a delightfully minimal interface.",
    tags: ["Product", "AI", "UX"],
    color: "from-emerald-500/30 to-cyan-500/30",
  },
  {
    title: "Project Title Six",
    desc: "Marketing site with bespoke illustrations and smooth scroll animations.",
    tags: ["Web", "Animation"],
    color: "from-violet-500/30 to-blue-500/30",
  },
];

function WorkPage() {
  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <span className="text-sm font-medium uppercase tracking-wider text-primary">
          Selected work
        </span>
        <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
          Things I've <span className="text-gradient">built & designed</span>
        </h1>
        <p className="mt-4 max-w-2xl text-muted-foreground">
          A small selection of recent projects spanning design, development, and product strategy.
        </p>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Skills</h2>
        <div className="mt-6 grid gap-6 md:grid-cols-3">
          {skillGroups.map((g) => (
            <div key={g.title} className="rounded-2xl border border-border bg-card p-6">
              <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                {g.title}
              </h3>
              <ul className="mt-4 flex flex-wrap gap-2">
                {g.skills.map((s) => (
                  <li
                    key={s}
                    className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-medium"
                  >
                    {s}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Projects</h2>
        <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {projects.map((p) => (
            <a
              key={p.title}
              href="#"
              className="group overflow-hidden rounded-2xl border border-border bg-card transition-smooth hover:-translate-y-1 hover:border-primary/50 hover:shadow-glow"
            >
              <div
                className={`relative aspect-[4/3] bg-gradient-to-br ${p.color} flex items-center justify-center`}
              >
                <span className="font-display text-xl font-bold text-foreground/60">
                  {p.title}
                </span>
                <div className="absolute right-4 top-4 flex h-8 w-8 items-center justify-center rounded-full bg-background/70 text-foreground opacity-0 backdrop-blur transition-smooth group-hover:opacity-100">
                  <ArrowUpRight className="h-4 w-4" />
                </div>
              </div>
              <div className="p-5">
                <h3 className="font-semibold">{p.title}</h3>
                <p className="mt-1 text-sm text-muted-foreground">{p.desc}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  {p.tags.map((t) => (
                    <span
                      key={t}
                      className="rounded-md bg-secondary/60 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      {t}
                    </span>
                  ))}
                </div>
              </div>
            </a>
          ))}
        </div>
      </section>
    </Layout>
  );
}
