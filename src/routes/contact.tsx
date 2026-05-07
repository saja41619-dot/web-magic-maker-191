import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/site/Layout";
import { Mail, Phone, MapPin, MessageCircle, Instagram, Send, Copy, Check } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { z } from "zod";
import { supabase } from "@/integrations/supabase/client";
import { siteSettingsQuery } from "@/lib/queries";
import { useAuth } from "@/lib/auth";

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

const contactSchema = z.object({
  name: z.string().trim().min(1, "Name required").max(100),
  email: z.string().trim().email("Invalid email").max(255),
  message: z.string().trim().min(1, "Message required").max(2000),
});

function ContactPage() {
  const { user } = useAuth();
  const { data: settings } = useQuery(siteSettingsQuery());
  const email = settings?.email ?? "mihraj@gmail.com";
  const whatsappRaw = settings?.whatsapp ?? "919792313786";
  const instagram = settings?.instagram ?? "https://instagram.com/";
  const whatsappHref = whatsappRaw.startsWith("http")
    ? whatsappRaw
    : `https://wa.me/${whatsappRaw.replace(/[^0-9]/g, "")}`;

  const contactItems = [
    { Icon: Mail, label: "Email", value: email },
    { Icon: Phone, label: "Phone", value: "+91 9792 313 786" },
    { Icon: MapPin, label: "Location", value: "Kannur, India" },
  ];
  const socials = [
    { Icon: Mail, href: `mailto:${email}`, label: "Email" },
    { Icon: MessageCircle, href: whatsappHref, label: "WhatsApp" },
    { Icon: Instagram, href: instagram, label: "Instagram" },
  ];

  const [submitting, setSubmitting] = useState(false);
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

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const form = e.currentTarget;
    const fd = new FormData(form);
    const parsed = contactSchema.safeParse({
      name: fd.get("name"),
      email: fd.get("email"),
      message: fd.get("message"),
    });
    if (!parsed.success) {
      toast.error(parsed.error.issues[0]?.message ?? "Invalid input");
      return;
    }
    setSubmitting(true);
    const payload = user ? { ...parsed.data, user_id: user.id } : parsed.data;
    const { error } = await supabase.from("contact_messages").insert(payload);
    setSubmitting(false);
    if (error) {
      toast.error("Could not send message. Please try again.");
      return;
    }
    toast.success("Message sent! I'll reply within 24 hours.");
    form.reset();
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

          <form
            onSubmit={handleSubmit}
            className="rounded-2xl border border-border bg-card p-6 shadow-elegant md:p-8"
          >
            <div className="grid gap-5">
              <div className="grid gap-2">
                <label htmlFor="name" className="text-sm font-medium">Name</label>
                <input
                  id="name"
                  name="name"
                  required
                  maxLength={100}
                  placeholder="Your name"
                  className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="email" className="text-sm font-medium">Email</label>
                <input
                  id="email"
                  name="email"
                  type="email"
                  required
                  maxLength={255}
                  placeholder="you@example.com"
                  className="rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div className="grid gap-2">
                <label htmlFor="message" className="text-sm font-medium">Message</label>
                <textarea
                  id="message"
                  name="message"
                  required
                  rows={6}
                  maxLength={2000}
                  placeholder="Tell me about your project..."
                  className="resize-none rounded-md border border-border bg-background/60 px-4 py-3 text-sm outline-none transition-smooth focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <button
                type="submit"
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 rounded-md bg-gradient-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90 disabled:opacity-60"
              >
                <Send className="h-4 w-4" /> {submitting ? "Sending..." : "Send Message"}
              </button>
            </div>
          </form>
        </div>
      </section>
    </Layout>
  );
}
