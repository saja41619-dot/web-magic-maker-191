import { Link, useNavigate, useLocation } from "@tanstack/react-router";
import { useEffect, useLayoutEffect, useRef, useState, type MouseEvent } from "react";
import { useQuery } from "@tanstack/react-query";
import { ChevronDown, Menu, X } from "lucide-react";
import mihrajPhoto from "@/assets/mihraj.jpg";
import { siteSettingsQuery } from "@/lib/queries";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const navItems = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About" },
  { to: "/work", label: "Work" },
  { to: "/resume", label: "Resume" },
  { to: "/contact", label: "Contact" },
] as const;

const moreItems = [
  { to: "/auth", label: "Create Account", description: "Sign up or sign in" },
  { to: "/dashboard", label: "My Dashboard", description: "Your account & profile" },
  { to: "/learnings", label: "Learnings", description: "Notes & tutorials" },
  { to: "/blog", label: "Blog", description: "Latest articles" },
  { to: "/faq", label: "FAQ", description: "Common questions" },
] as const;

type Rect = { left: number; width: number } | null;

export function Header() {
  const [open, setOpen] = useState(false);
  const { data: settings } = useQuery(siteSettingsQuery());
  const name = settings?.name ?? "Mihraj";
  const photo = settings?.photo_url || mihrajPhoto;
  const navigate = useNavigate();
  const location = useLocation();
  const clicksRef = useRef<number[]>([]);

  const navRef = useRef<HTMLElement>(null);
  const linkRefs = useRef<Array<HTMLAnchorElement | null>>([]);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);
  const [pillRect, setPillRect] = useState<Rect>(null);

  const activeIdx = navItems.findIndex((item) =>
    item.to === "/"
      ? location.pathname === "/"
      : location.pathname.startsWith(item.to),
  );
  const targetIdx = hoverIdx ?? (activeIdx >= 0 ? activeIdx : null);

  useLayoutEffect(() => {
    if (targetIdx === null) {
      setPillRect(null);
      return;
    }
    const el = linkRefs.current[targetIdx];
    const nav = navRef.current;
    if (!el || !nav) return;
    const elRect = el.getBoundingClientRect();
    const navRect = nav.getBoundingClientRect();
    setPillRect({ left: elRect.left - navRect.left, width: elRect.width });
  }, [targetIdx, location.pathname]);

  useEffect(() => {
    const onResize = () => {
      if (targetIdx === null) return;
      const el = linkRefs.current[targetIdx];
      const nav = navRef.current;
      if (!el || !nav) return;
      const elRect = el.getBoundingClientRect();
      const navRect = nav.getBoundingClientRect();
      setPillRect({ left: elRect.left - navRect.left, width: elRect.width });
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [targetIdx]);

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

  // Magnetic hover for Hire Me
  const hireRef = useRef<HTMLAnchorElement>(null);
  const onHireMove = (e: MouseEvent<HTMLAnchorElement>) => {
    const el = hireRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    const x = e.clientX - (r.left + r.width / 2);
    const y = e.clientY - (r.top + r.height / 2);
    el.style.transform = `translate(${x * 0.25}px, ${y * 0.35}px) scale(1.04)`;
  };
  const onHireLeave = () => {
    const el = hireRef.current;
    if (!el) return;
    el.style.transform = "";
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          to="/"
          onClick={handleHomeClick}
          className="group flex items-center gap-2 font-display text-lg font-bold"
        >
          <span className="logo-ring inline-flex transition-transform duration-300 group-hover:scale-110">
            <img
              src={photo}
              alt={name}
              width={32}
              height={32}
              loading="eager"
              decoding="async"
              sizes="32px"
              className="block h-8 w-8 rounded-[0.5rem] object-cover"
            />
          </span>
          <span className="animate-shimmer-text">{name}</span>
        </Link>

        <nav
          ref={navRef}
          onMouseLeave={() => setHoverIdx(null)}
          className="relative hidden items-center gap-1 md:flex"
        >
          {/* Sliding pill */}
          <span
            aria-hidden
            className="pointer-events-none absolute top-1/2 -z-10 h-9 -translate-y-1/2 rounded-md bg-secondary/80 shadow-[inset_0_0_0_1px_oklch(0.7_0.2_285_/_0.45),0_0_24px_-6px_oklch(0.7_0.2_285_/_0.7)] transition-all duration-300 ease-out"
            style={{
              left: pillRect?.left ?? 0,
              width: pillRect?.width ?? 0,
              opacity: pillRect ? 1 : 0,
            }}
          />
          {navItems.map((item, i) => (
            <Link
              key={item.to}
              to={item.to}
              ref={(el) => {
                linkRefs.current[i] = el;
              }}
              onMouseEnter={() => setHoverIdx(i)}
              onFocus={() => setHoverIdx(i)}
              onClick={item.to === "/" ? handleHomeClick : undefined}
              activeOptions={{ exact: item.to === "/" }}
              activeProps={{ className: "text-foreground" }}
              inactiveProps={{ className: "text-muted-foreground hover:text-foreground" }}
              className="group relative rounded-md px-4 py-2 text-sm font-medium transition-smooth"
            >
              <span className="relative">
                {item.label}
                <span className="absolute -bottom-1 left-1/2 h-0.5 w-0 -translate-x-1/2 rounded-full bg-gradient-primary shadow-[0_0_8px_oklch(0.7_0.2_285_/_0.8)] transition-all duration-300 group-hover:w-full" />
              </span>
            </Link>
          ))}

          <DropdownMenu>
            <DropdownMenuTrigger
              onMouseEnter={() => setHoverIdx(null)}
              className="group inline-flex items-center gap-1 rounded-md px-4 py-2 text-sm font-medium text-muted-foreground outline-none transition-smooth hover:text-foreground focus-visible:text-foreground"
            >
              More
              <ChevronDown className="h-4 w-4 transition-transform duration-300 group-data-[state=open]:rotate-180" />
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-64 border-border/60 bg-background/95 backdrop-blur-xl"
            >
              {moreItems.map((item) => (
                <DropdownMenuItem key={item.to} asChild>
                  <Link
                    to={item.to}
                    className="flex flex-col items-start gap-0.5 rounded-md px-3 py-2 transition-smooth hover:translate-x-0.5"
                  >
                    <span className="text-sm font-medium text-foreground">{item.label}</span>
                    <span className="text-xs text-muted-foreground">{item.description}</span>
                  </Link>
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </nav>

        <Link
          ref={hireRef}
          to="/contact"
          onMouseMove={onHireMove}
          onMouseLeave={onHireLeave}
          className="btn-sheen hidden rounded-md bg-gradient-primary px-4 py-2 text-sm font-semibold text-primary-foreground shadow-glow transition-transform duration-200 ease-out will-change-transform hover:shadow-[0_0_28px_-2px_oklch(0.7_0.2_285_/_0.85)] md:inline-flex"
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
            <div className="mt-3 px-4 pb-1 text-xs font-semibold uppercase tracking-wider text-muted-foreground/70">
              More
            </div>
            {moreItems.map((item, i) => (
              <Link
                key={item.to}
                to={item.to}
                onClick={() => setOpen(false)}
                style={{ animationDelay: `${(navItems.length + i) * 40}ms` }}
                className="animate-fade-in flex flex-col rounded-md px-4 py-2.5 transition-smooth hover:translate-x-1 hover:bg-secondary/60"
              >
                <span className="text-sm font-medium text-foreground">{item.label}</span>
                <span className="text-xs text-muted-foreground">{item.description}</span>
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
