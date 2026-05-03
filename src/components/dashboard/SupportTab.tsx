import { LifeBuoy, Mail, MessageCircle, ChevronDown } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "@tanstack/react-router";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQS = [
  { q: "How do I update my profile?", a: "Go to the Profile tab in your dashboard, edit the details, and click Save." },
  { q: "How do I change my password?", a: "Open the Settings tab and use the Change Password section to set a new password." },
  { q: "Can I delete my account?", a: "Yes — visit Settings, scroll to the Danger Zone, and confirm account deletion." },
  { q: "How do I request a service?", a: "Browse the Common Services tab and click Request, or send a message via the Contact page." },
];

export function SupportTab() {
  return (
    <div className="space-y-6">
      <Card className="border-border bg-card shadow-elegant">
        <CardHeader>
          <div className="flex items-center gap-2">
            <LifeBuoy className="h-5 w-5 text-primary" />
            <CardTitle>Need Help?</CardTitle>
          </div>
          <CardDescription>We're here to assist you. Reach out anytime.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
            <Link to="/contact">
              <Mail className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Email Support</p>
                <p className="text-xs text-muted-foreground">Send us a message</p>
              </div>
            </Link>
          </Button>
          <Button asChild variant="outline" className="h-auto justify-start gap-3 p-4">
            <Link to="/contact">
              <MessageCircle className="h-5 w-5 text-primary" />
              <div className="text-left">
                <p className="font-medium">Live Chat</p>
                <p className="text-xs text-muted-foreground">Chat with our team</p>
              </div>
            </Link>
          </Button>
        </CardContent>
      </Card>

      <Card className="border-border bg-card shadow-elegant">
        <CardHeader>
          <CardTitle>Frequently Asked Questions</CardTitle>
          <CardDescription>Quick answers to common questions</CardDescription>
        </CardHeader>
        <CardContent>
          <Accordion type="single" collapsible className="w-full">
            {FAQS.map((f, i) => (
              <AccordionItem key={i} value={`item-${i}`}>
                <AccordionTrigger className="text-left text-sm font-medium">
                  {f.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground">
                  {f.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
        </CardContent>
      </Card>
    </div>
  );
}
