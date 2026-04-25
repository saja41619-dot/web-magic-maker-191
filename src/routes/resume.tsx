import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Download, Briefcase, GraduationCap, Award } from "lucide-react";

export const Route = createFileRoute("/resume")({
  head: () => ({
    meta: [
      { title: "Resume — Your Name" },
      {
        name: "description",
        content: "Experience, education, and certifications of Your Name.",
      },
      { property: "og:title", content: "Resume — Your Name" },
      {
        property: "og:description",
        content: "Work history, education, and credentials.",
      },
    ],
  }),
  component: ResumePage,
});

const experience = [
  {
    role: "Senior Freelance Designer & Developer",
    org: "Self-employed",
    period: "2022 — Present",
    desc: "Partnering with startups and brands to design and build modern web products end-to-end.",
  },
  {
    role: "Product Designer",
    org: "Company Name",
    period: "2020 — 2022",
    desc: "Led design for a flagship SaaS product, shipping a full design system and key features.",
  },
  {
    role: "Frontend Developer",
    org: "Company Name",
    period: "2018 — 2020",
    desc: "Built customer-facing web apps with React, contributed to internal component libraries.",
  },
];

const education = [
  {
    title: "B.Sc. Computer Science",
    org: "Your University",
    period: "2014 — 2018",
  },
];

const certifications = [
  "Certified UX Professional — Issuing Body",
  "Advanced React Patterns — Online Course",
  "Design Systems Specialization — Issuing Body",
];

function ResumePage() {
  return (
    <Layout>
      <section className="mx-auto max-w-4xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-end">
          <div>
            <span className="text-sm font-medium uppercase tracking-wider text-primary">
              Resume
            </span>
            <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
              My <span className="text-gradient">journey</span>
            </h1>
            <p className="mt-4 max-w-xl text-muted-foreground">
              A snapshot of my experience, education, and credentials.
            </p>
          </div>
          <a
            href="#"
            className="inline-flex items-center gap-2 rounded-md bg-gradient-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
          >
            <Download className="h-4 w-4" /> Download CV
          </a>
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Briefcase className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl font-bold">Experience</h2>
        </div>
        <div className="space-y-4 border-l border-border pl-6">
          {experience.map((e) => (
            <div
              key={e.role}
              className="relative rounded-xl border border-border bg-card p-6 transition-smooth hover:border-primary/50"
            >
              <span className="absolute -left-[31px] top-7 h-3 w-3 rounded-full bg-gradient-primary shadow-glow" />
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                <h3 className="font-semibold">{e.role}</h3>
                <span className="text-xs uppercase tracking-wider text-primary">{e.period}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{e.org}</div>
              <p className="mt-3 text-sm text-muted-foreground">{e.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <GraduationCap className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl font-bold">Education</h2>
        </div>
        <div className="grid gap-4">
          {education.map((e) => (
            <div key={e.title} className="rounded-xl border border-border bg-card p-6">
              <div className="flex flex-col justify-between gap-1 sm:flex-row sm:items-baseline">
                <h3 className="font-semibold">{e.title}</h3>
                <span className="text-xs uppercase tracking-wider text-primary">{e.period}</span>
              </div>
              <div className="mt-1 text-sm text-muted-foreground">{e.org}</div>
            </div>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-10 sm:px-6">
        <div className="mb-6 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground">
            <Award className="h-5 w-5" />
          </div>
          <h2 className="font-display text-2xl font-bold">Certifications</h2>
        </div>
        <ul className="grid gap-3">
          {certifications.map((c) => (
            <li
              key={c}
              className="rounded-xl border border-border bg-card px-5 py-4 text-sm transition-smooth hover:border-primary/50"
            >
              {c}
            </li>
          ))}
        </ul>
      </section>
    </Layout>
  );
}
