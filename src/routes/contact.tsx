import { createFileRoute } from "@tanstack/react-router";
import { Layout } from "@/components/site/Layout";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Send, Copy, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

export const Route = createFileRoute("/contact")({
  head: () => ({
    meta: [
      { title: "Contact — Mihraj" },
      {
        name: "description",
        content: "Get in touch with Mihraj about your next project.",
      },
      { property: "og:title", content: "Contact — Mihraj" },
      {
        property: "og:description",
        content: "Reach out by email, phone, or contact form for freelance project inquiries.",
      },
    ],
  }),
  component: ContactPage,
});

const contactItems = [
  { Icon: Mail, label: "Email", value: "mihraj@gmail.com" },
  { Icon: Phone, label: "Phone", value: "+91 9792 313 786" },
  { Icon: MapPin, label: "Location", value: "Kannur, India" },
];

const socials = [
  { Icon: Github, href: "#", label: "GitHub" },
  { Icon: Linkedin, href: "#", label: "LinkedIn" },
  { Icon: Twitter, href: "#", label: "Twitter" },
];

function ContactPage() {
  const [submitted, setSubmitted] = useState(false);
  const [copiedLabel, setCopiedLabel] = useState<string | null>(null);

  const handleCopy = async (label: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedLabel(label);
      toast.success(`${label} copied to clipboard`);
      setTimeout(() => setCopiedLabel((curr) => (curr === label ? null : curr)), 2000);
    } catch {
      toast.error("Failed to copy");
    }
  };

  const handleSubmit = (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSubmitted(true);
    setTimeout(() => setSubmitted(false), 4000);
    (e.target as HTMLFormElement).reset();
  };

  return (
    <Layout>
      <section className="mx-auto max-w-6xl px-4 pb-12 pt-16 sm:px-6 sm:pt-24">
        <div className="mx-auto max-w-2xl text-center">
          <span className="text-sm font-medium uppercase tracking-wider text-primary">
            Contact
          </span>
          <h1 className="mt-2 font-display text-4xl font-bold sm:text-5xl">
            Let's <span className="text-gradient">work together</span>
          </h1>
          <p className="mt-4 text-muted-foreground">
            Have a project in mind? Drop me a line — I usually reply within 24 hours.
          </p>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 pb-20 sm:px-6">
        <div className="grid gap-8 lg:grid-cols-[1fr_1.4fr]">
          {/* Info */}
          <div className="space-y-4">
            {contactItems.map(({ Icon, label, value }) => {
              const isCopied = copiedLabel === label;
              return (
                <div
                  key={label}
                  className="flex items-center gap-4 rounded-2xl border border-border bg-card p-5 transition-smooth hover:border-primary/50"
                >
                  <div className="flex h-11 w-11 items-center justify-center rounded-lg bg-gradient-primary text-primary-foreground shadow-glow">
                    <Icon className="h-5 w-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-xs uppercase tracking-wider text-muted-foreground">
                      {label}
                    </div>
                    <div className="truncate font-semibold">{value}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleCopy(label, value)}
                    aria-label={`Copy ${label.toLowerCase()}`}
                    className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary hover:text-primary"
                  >
                    {isCopied ? (
                      <Check className="h-4 w-4 text-primary" />
                    ) : (
                      <Copy className="h-4 w-4" />
                    )}
                  </button>
                </div>
              );
            })}

            <div className="rounded-2xl border border-border bg-card p-5">
              <div className="text-xs uppercase tracking-wider text-muted-foreground">
                Follow me
              </div>
              <div className="mt-3 flex gap-3">
                {socials.map(({ Icon, href, label }) => (
                  <a
                    key={label}
                    href={href}
                    aria-label={label}
                    className="flex h-10 w-10 items-center justify-center rounded-lg border border-border text-muted-foreground transition-smooth hover:border-primary hover:text-primary hover:shadow-glow"
                  >
                    <Icon className="h-4 w-4" />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8"
          >
            <div className="grid gap-5">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">
                  Name
                </label>
                <input
                  id="name"
                  name="name"
                  required
                  placeholder="Your name"
                  className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">
                  Email
                </label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  placeholder="you@example.com"
                  className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="message" className="text-sm font-medium">
                  Message
                </label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  placeholder="Tell me about your project..."
                  className="resize-none rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
              >
                <Send className="h-4 w-4" /> Send Message
              </button>
              {submitted && (
                <p className="text-center text-sm text-primary">
                  Thanks! Your message has been sent (demo).
                </p>
              )}
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
