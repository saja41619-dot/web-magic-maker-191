import { Link, useNavigate } from "@tanstack/react-router";
import { useRef, useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { Menu, X } from "lucide-react";
import mihrajPhoto from "@/assets/mihraj.jpg";
import { siteSettingsQuery } from "@/lib/queries";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/work", label: "Work" },
  { to: "/resume", label: "Resume" },
  { to: "/contact", label: "Contact" },
] as const;

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useQuery(siteSettingsQuery());
  const name = settings?.name ?? "Mihraj";
  const photo = settings?.photo_url || mihrajPhoto;
  const navigate = useNavigate();
  const clicksRef = useRef<number[]>([]);

  const handleHomeClick = (event?: MouseEvent<HTMLAnchorElement>) => {
    const now = Date.now();
    clicksRef.current = [...clicksRef.current.filter((t) => now - t < 2000), now];
    if (clicksRef.current.length >= 5) {
      event?.preventDefault();
      event?.stopPropagation();
      clicksRef.current = [];
      setOpen(false);
      void navigate({ to: "/login" });
    }
  };


  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          onClick={handleHomeClick}
          className="flex items-center gap-2 font-display text-lg font-bold"
        >
          <img
            src={photo}
            alt={name}
            width={32}
            height={32}
            loading="eager"
            decoding="async"
            sizes="32px"
            className="h-8 w-8 rounded-lg object-cover shadow-glow ring-1 ring-border/40"
          />
          <span className="text-gradient">{name}</span>
        </Link>

        <nav className="hidden items-center gap-1 md:flex">
          {navItems.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              onClick={item.to === "/" ? handleHomeClick : undefined}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground bg-secondary" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="group relative rounded-md px-4 py-2 text-sm font-medium transition-smooth hover:-translate-y-0.5 hover:bg-secondary/60"
            >
              <span className="relative">
                {item.label}
                <span className="absolute -bottom-1 left-0 h-0.5 w-0 bg-gradient-primary transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          ))}
        </nav>

        <Link
          to="/contact"
          className="hidden rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:-translate-y-0.5 hover:opacity-90 hover:shadow-[0_0_24px_-4px_oklch(0.7_0.2_285_/_0.7)] md:inline-flex"
        >
          Hire Me
        </Link>

        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-md p-2 text-foreground md:hidden"
          aria-label="Toggle menu"
        >
          {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {open && (
        <div className="animate-fade-in border-t border-border/40 bg-background/95 backdrop-blur-xl md:hidden">
          <nav className="mx-auto flex max-w-6xl flex-col gap-1 px-4 py-4">
            {navItems.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={(event) => {
                  if (item.to === "/") {
                    handleHomeClick(event);
                  }
                  setOpen(false);
                }}
                activeOptions={{ exact: item.to === "/" }}
                activeProps={{ className: "text-foreground bg-secondary" }}
                inactiveProps={{ className: "text-muted-foreground" }}
                style={{ animationDelay: `${i * 40}ms` }}
                className="animate-fade-in rounded-md px-4 py-3 text-base font-medium transition-smooth hover:translate-x-1 hover:bg-secondary/60"
              >
                {item.label}
              </Link>
            ))}
            <Link
              to="/contact"
              onClick={() => setOpen(false)}
              className="mt-2 rounded-md bg-gradient-primary px-4 py-3 text-center text-sm font-semibold text-primary-foreground shadow-glow transition-smooth hover:opacity-90"
            >
              Hire Me
            </Link>
          </nav>
        </div>
      )}
    </header>
  );
}
