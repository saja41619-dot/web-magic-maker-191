import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { zodValidator, fallback } from "@tanstack/zod-adapter";
import { z } from "zod";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

type SkillInfo = { what: string; why: string };

const skillInfo: Record<string, SkillInfo> = {
  // Design
  "UI/UX Design": {
    what: "Designing interfaces and user flows that are clear, accessible, and pleasant to use.",
    why: "It's the foundation of every product I build — good UX makes the rest of the work matter.",
  },
  "Branding": {
    what: "Crafting a visual identity: logo, colour, type, and tone of voice.",
    why: "A consistent brand makes products feel trustworthy and memorable.",
  },
  "Design Systems": {
    what: "Reusable component libraries with shared tokens for colour, spacing, and type.",
    why: "They let teams ship faster while keeping the UI consistent.",
  },
  "Prototyping": {
    what: "Building interactive mockups to validate ideas before writing production code.",
    why: "Cheaper to iterate on a prototype than to rebuild a shipped feature.",
  },
  "Figma": {
    what: "My main design tool for UI, prototypes, and design systems.",
    why: "Real-time collaboration and a strong component model.",
  },
  // Development
  "React": {
    what: "A component-based JavaScript library for building user interfaces.",
    why: "Huge ecosystem and a mental model that scales from tiny widgets to full apps.",
  },
  "TypeScript": {
    what: "JavaScript with a static type system.",
    why: "Catches bugs before runtime and makes large codebases far easier to refactor.",
  },
  "Tailwind CSS": {
    what: "A utility-first CSS framework for styling directly in markup.",
    why: "Fast to write, consistent by default, and trivial to theme.",
  },
  "Next.js": {
    what: "A React framework with routing, SSR, and great DX out of the box.",
    why: "Best-in-class for production websites and full-stack apps.",
  },
  "Node.js": {
    what: "A JavaScript runtime for servers, scripts, and tooling.",
    why: "Lets me share language and types between frontend and backend.",
  },
  // Tools
  "Git": {
    what: "Distributed version control for tracking and collaborating on code.",
    why: "Non-negotiable for any serious project.",
  },
  "Vite": {
    what: "A modern build tool with fast dev server and optimised production builds.",
    why: "Near-instant HMR makes the feedback loop a joy.",
  },
  "Framer": {
    what: "A design + publishing tool for interactive marketing sites.",
    why: "Great for high-fidelity motion-rich landing pages.",
  },
  "Webflow": {
    what: "A visual builder for content-driven marketing websites with a CMS.",
    why: "Lets non-developers update content without touching code.",
  },
  "Notion": {
    what: "Docs, wikis, and project tracking in one place.",
    why: "Keeps client work organised and shareable.",
  },
  // Offensive Security
  "Penetration Testing": {
    what: "Simulating real attacks on a system to find exploitable weaknesses.",
    why: "It's the most effective way to know whether defences actually hold up.",
  },
  "Vulnerability Assessment": {
    what: "Scanning and reviewing systems to catalogue known weaknesses.",
    why: "Gives a prioritised baseline of risk before going deeper.",
  },
  "Web App Pentesting (OWASP Top 10)": {
    what: "Testing for the most common and impactful web vulnerabilities.",
    why: "Most real-world breaches still trace back to the OWASP Top 10.",
  },
  "Network Pentesting": {
    what: "Probing networks for exposed services, weak configs, and lateral-movement paths.",
    why: "One weak host can compromise an entire environment.",
  },
  "Privilege Escalation": {
    what: "Turning a low-privilege foothold into admin/root access.",
    why: "Demonstrates the real impact of an initial vulnerability.",
  },
  "Social Engineering": {
    what: "Testing the human layer — phishing, pretexting, and awareness.",
    why: "People are usually the easiest path in; testing this hardens the org.",
  },
  // Security Tools
  "Kali Linux": {
    what: "A Linux distribution preloaded with offensive-security tooling.",
    why: "My go-to working environment for engagements.",
  },
  "Metasploit": {
    what: "An exploitation framework with a huge library of modules and payloads.",
    why: "Fast to validate exploitability and demonstrate impact.",
  },
  "Burp Suite": {
    what: "An intercepting proxy and toolkit for web app testing.",
    why: "The standard tool for hands-on web pentesting.",
  },
  "Nmap": {
    what: "A network scanner for host discovery, port scanning, and service detection.",
    why: "Almost every engagement starts with Nmap.",
  },
  "Wireshark": {
    what: "A packet analyser for inspecting network traffic in detail.",
    why: "Invaluable for debugging protocols and spotting suspicious traffic.",
  },
  "sqlmap": {
    what: "Automates detection and exploitation of SQL-injection flaws.",
    why: "Quickly proves impact when SQLi is present.",
  },
  "Hashcat": {
    what: "A high-performance password-cracking tool.",
    why: "Tests password strength and validates hashing choices.",
  },
  "Hydra": {
    what: "A fast online brute-force tool for many protocols.",
    why: "Useful for testing authentication endpoints and weak credentials.",
  },
  // Networking & Recon
  "TCP/IP": {
    what: "The core protocol suite that the internet runs on.",
    why: "Understanding it is essential for both building and breaking systems.",
  },
  "DNS / HTTP / TLS": {
    what: "The protocols behind names, web traffic, and encryption.",
    why: "Most web vulnerabilities live somewhere in this stack.",
  },
  "Linux Administration": {
    what: "Managing Linux servers, users, services, and permissions.",
    why: "Most production servers — and most targets — run Linux.",
  },
  "Active Directory": {
    what: "Microsoft's identity and access service for Windows networks.",
    why: "Enterprise environments live or die by AD security.",
  },
  "OSINT": {
    what: "Gathering intel from public sources before an engagement.",
    why: "Free, legal, and surprisingly effective reconnaissance.",
  },
  "Log Analysis": {
    what: "Reviewing system and application logs for anomalies and incidents.",
    why: "Logs are where attacks are detected — and proven.",
  },
};


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
  const { q } = Route.useSearch();
  const navigate = useNavigate({ from: "/work" });

  const query = q.trim().toLowerCase();

  const filteredGroups = useMemo(() => {
    if (!query) return skillGroups;
    return skillGroups
      .map((g) => {
        const groupMatches = g.title.toLowerCase().includes(query);
        const skills = groupMatches
          ? g.skills
          : g.skills.filter((s) => s.toLowerCase().includes(query));
        return { ...g, skills };
      })
      .filter((g) => g.skills.length > 0);
  }, [query]);

  const totalMatches = filteredGroups.reduce((sum, g) => sum + g.skills.length, 0);

  const highlight = (text: string) => {
    if (!query) return text;
    const idx = text.toLowerCase().indexOf(query);
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <mark className="rounded bg-primary/30 px-0.5 text-foreground">
          {text.slice(idx, idx + query.length)}
        </mark>
        {text.slice(idx + query.length)}
      </>
    );
  };

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
        <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <h2 className="font-display text-2xl font-bold">Skills</h2>
          <div className="relative w-full sm:max-w-xs">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              type="search"
              value={q}
              onChange={(e) =>
                navigate({
                  search: { q: e.target.value },
                  replace: true,
                })
              }
              placeholder="Search skills..."
              aria-label="Search skills"
              className="w-full rounded-md border border-border bg-background/60 py-2 pl-9 pr-9 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
            />
            {q && (
              <button
                type="button"
                onClick={() =>
                  navigate({
                    search: { q: "" },
                    replace: true,
                  })
                }
                aria-label="Clear search"
                className="absolute right-2 top-1/2 flex h-6 w-6 -translate-y-1/2 items-center justify-center rounded text-muted-foreground hover:text-foreground"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
        </div>

        {query && (
          <p className="mt-3 text-sm text-muted-foreground">
            {totalMatches > 0
              ? `${totalMatches} match${totalMatches === 1 ? "" : "es"} for "${q}"`
              : `No skills match "${q}"`}
          </p>
        )}

        {filteredGroups.length > 0 ? (
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            {filteredGroups.map((g) => (
              <div key={g.title} className="rounded-2xl border border-border bg-card p-6">
                <h3 className="text-sm font-semibold uppercase tracking-wider text-primary">
                  {highlight(g.title)}
                </h3>
                <ul className="mt-4 flex flex-wrap gap-2">
                  {g.skills.map((s) => (
                    <li
                      key={s}
                      className="rounded-md border border-border bg-secondary/50 px-3 py-1 text-xs font-medium"
                    >
                      {highlight(s)}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        ) : (
          <div className="mt-6 rounded-2xl border border-dashed border-border bg-card/50 p-10 text-center text-sm text-muted-foreground">
            Try a different keyword — for example "React", "Burp", or "Linux".
          </div>
        )}
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
