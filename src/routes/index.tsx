import { useEffect, useRef, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import gsap from "gsap";
import Lenis from "lenis";
import {
  ArrowDown,
  ArrowRight,
  ArrowUpRight,
  Camera,
  Check,
  CheckCircle2,
  HardHat,
  LayoutGrid,
  Radio,
  ShieldCheck,
  Sparkles,
  UserCog,
  Users,
  Zap,
} from "lucide-react";
import { meta } from "@/lib/meta";
import { PartingLettersParade } from "@/components/app/PartingLettersParade";
import { WorkflowAccordion } from "@/components/app/WorkflowAccordion";
import { CATEGORIES, DEFAULT_PRIORITY } from "@/utils/helpers";
import type { Priority, Role } from "@/types";

export const Route = createFileRoute("/")({
  head: () =>
    meta(
      "Electricity Complaint Management",
      "Power-Track lets consumers report electricity problems, admins assign field workers, and everyone track progress to resolution.",
    ),
  component: Landing,
});

const PRIORITY_DOT: Record<Priority, { dot: string; label: string }> = {
  Emergency: { dot: "bg-destructive", label: "Emergency" },
  High: { dot: "bg-primary", label: "High priority" },
  Normal: { dot: "bg-foreground/35", label: "Standard" },
};

const ROLES = [
  {
    id: "consumer" as Role,
    shortLabel: "Consumer",
    icon: Users,
    eyebrow: "Residents & Businesses",
    title: "For Consumers",
    description: "Report electrical faults effortlessly and stay informed at every milestone.",
    points: [
      "Submit complaints with photos in seconds",
      "Smart category & description suggestions",
      "Transparent step-by-step status timeline",
    ],
    cta: "Create consumer account",
    to: "/register" as const,
  },
  {
    id: "admin" as Role,
    shortLabel: "Administrator",
    icon: UserCog,
    eyebrow: "Operations & Dispatch",
    title: "For Administrators",
    description: "Command the entire complaint queue with clarity, speed, and zero duplicate dispatches.",
    points: [
      "Triage incoming issues & escalate emergencies",
      "Assign field crews by zone and open workload",
      "Merge duplicate reports & track live analytics",
    ],
    cta: "Open admin portal",
    to: "/login" as const,
  },
  {
    id: "worker" as Role,
    shortLabel: "Field Worker",
    icon: HardHat,
    eyebrow: "On-Site Technicians",
    title: "For Field Workers",
    description: "Focus on fixing faults fast with a clean mobile-ready task queue and proof uploads.",
    points: [
      "Assigned jobs sorted by urgency priority",
      "Slide progress updates & log repair notes",
      "Upload before-and-after completion photos",
    ],
    cta: "Sign in as worker",
    to: "/login" as const,
  },
] as const;

const CAPABILITIES = [
  {
    icon: Sparkles,
    eyebrow: "Intelligence",
    title: "Smart Suggestions",
    description: "Automatically detects the right issue category and drafts a clear description from your input.",
  },
  {
    icon: Camera,
    eyebrow: "Accountability",
    title: "Photo Evidence",
    description: "Consumers attach site photos on submission; field crews upload before-and-after proof on completion.",
  },
  {
    icon: ShieldCheck,
    eyebrow: "Efficiency",
    title: "Duplicate Guard",
    description: "Detects matching reports in the same area so dispatch teams never send two crews to one fault.",
  },
] as const;

function Landing() {
  const rootRef = useRef<HTMLDivElement>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [activeRole, setActiveRole] = useState<Role>("admin");

  useEffect(() => {
    if (typeof window === "undefined") return;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    // Silky-smooth scrolling with Lenis synced to GSAP ticker (no ScrollTrigger layout thrash)
    const lenis = new Lenis({
      duration: 1.1,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      smoothWheel: true,
    });
    lenisRef.current = lenis;

    // Smooth scroll-reactive floating navbar: hides on scroll down, glides back in on scroll up
    const navPill = rootRef.current?.querySelector<HTMLElement>(".js-nav-pill");
    let navHidden = false;
    lenis.on("scroll", ({ scroll, direction }: { scroll: number; direction: number }) => {
      if (!navPill) return;
      if (scroll > 90 && direction === 1 && !navHidden) {
        navHidden = true;
        gsap.to(navPill, {
          yPercent: -150,
          opacity: 0,
          duration: 0.35,
          ease: "power3.out",
          overwrite: "auto",
        });
      } else if ((direction === -1 || scroll <= 90) && navHidden) {
        navHidden = false;
        gsap.to(navPill, {
          yPercent: 0,
          opacity: 1,
          duration: 0.4,
          ease: "power3.out",
          overwrite: "auto",
        });
      }
    });

    const onTick = (time: number) => lenis.raf(time * 1000);
    gsap.ticker.add(onTick);
    gsap.ticker.lagSmoothing(0);

    const ctx = gsap.context(() => {
      // 1. Hero entrance choreography (clears inline props on complete)
      const heroTl = gsap.timeline({ defaults: { ease: "power3.out", clearProps: "transform,opacity" } });
      heroTl
        .from(".js-nav-pill", { y: -20, opacity: 0, duration: 0.6 })
        .from(".js-hero-word", { y: 36, opacity: 0, duration: 0.75, stagger: 0.09 }, "-=0.35")
        .from(".js-hero-pill-img", { scale: 0.85, opacity: 0, duration: 0.65, ease: "back.out(1.3)" }, "-=0.5")
        .from(".js-hero-sub", { y: 18, opacity: 0, duration: 0.55 }, "-=0.35")
        .from(".js-hero-cta", { y: 16, opacity: 0, duration: 0.5, stagger: 0.08 }, "-=0.35")
        .from(".js-hero-strip", { y: 14, opacity: 0, duration: 0.5 }, "-=0.3");
    }, rootRef);

    // 2. Reliable IntersectionObserver-driven GSAP reveals (never leaves cards stuck invisible)
    const observers: IntersectionObserver[] = [];
    const root = rootRef.current;

    const observeReveal = (
      triggerSelector: string,
      animate: (triggerEl: Element) => void,
    ) => {
      if (!root) return;
      root.querySelectorAll(triggerSelector).forEach((el) => {
        const io = new IntersectionObserver(
          (entries) => {
            for (const entry of entries) {
              if (entry.isIntersecting) {
                animate(el);
                io.disconnect();
                break;
              }
            }
          },
          { threshold: 0.05, rootMargin: "0px 0px -30px 0px" },
        );
        io.observe(el);
        observers.push(io);
      });
    };

    observeReveal(".js-reveal-head", (el) => {
      gsap.fromTo(
        el,
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", clearProps: "transform,opacity" },
      );
    });

    observeReveal(".js-role-grid", (el) => {
      gsap.fromTo(
        el.querySelectorAll(".js-role-card"),
        { y: 32 },
        { y: 0, duration: 0.65, stagger: 0.09, ease: "power3.out", clearProps: "transform" },
      );
    });

    observeReveal(".js-bento-grid", (el) => {
      const left = el.querySelector(".js-bento-left");
      if (left) {
        gsap.fromTo(
          left,
          { y: 32, opacity: 0 },
          { y: 0, opacity: 1, duration: 0.75, ease: "power3.out", clearProps: "transform,opacity" },
        );
      }
      gsap.fromTo(
        el.querySelectorAll(".js-issue-chip"),
        { y: 14, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.45, stagger: 0.04, ease: "power2.out", clearProps: "transform,opacity" },
      );
      gsap.fromTo(
        el.querySelectorAll(".js-cap-card"),
        { y: 28, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.7, stagger: 0.1, ease: "power3.out", clearProps: "transform,opacity" },
      );
    });

    observeReveal(".js-cta-banner", (el) => {
      gsap.fromTo(
        el,
        { y: 28 },
        { y: 0, duration: 0.65, ease: "power3.out", clearProps: "transform" },
      );
    });

    return () => {
      observers.forEach((io) => io.disconnect());
      ctx.revert();
      gsap.ticker.remove(onTick);
      lenis.destroy();
      lenisRef.current = null;
    };
  }, []);

  const scrollToSection = (e: React.MouseEvent<HTMLAnchorElement>, selector: string) => {
    e.preventDefault();
    if (lenisRef.current) {
      lenisRef.current.scrollTo(selector, { offset: -88, duration: 1.2 });
    } else {
      document.querySelector(selector)?.scrollIntoView({ behavior: "smooth" });
    }
  };

  return (
    <div ref={rootRef} className="min-h-screen bg-background text-foreground">
      {/* Centered Floating Frosted-Glass Pill Navbar */}
      <header className="pointer-events-none fixed inset-x-0 top-5 z-50 px-4">
        <div className="js-nav-pill pointer-events-auto mx-auto flex w-fit max-w-full items-center gap-3 rounded-full border border-white/60 bg-card/65 py-2.5 pl-6 pr-2.5 text-foreground shadow-[0_10px_35px_-10px_rgba(24,20,16,0.14),inset_0_1px_0_rgba(255,255,255,0.75)] ring-1 ring-foreground/10 backdrop-blur-xl backdrop-saturate-150 dark:border-white/15 dark:bg-card/55 dark:shadow-[0_10px_35px_-10px_rgba(0,0,0,0.45),inset_0_1px_0_rgba(255,255,255,0.12)] sm:gap-5 sm:pl-7 sm:pr-3">
          <Link
            to="/"
            className="inline-flex items-center gap-2.5 border-r border-foreground/10 pr-4 sm:pr-6"
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-sm shadow-primary/25">
              <Zap className="h-4 w-4 fill-current" />
            </span>
            <span className="text-sm font-bold tracking-tight text-foreground">Power-Track</span>
          </Link>

          <nav className="hidden items-center gap-2 text-sm font-medium text-foreground/75 md:flex">
            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "#how-it-works")}
              className="rounded-full px-4 py-2.5 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              How it works
            </a>
            <a
              href="#who-it-serves"
              onClick={(e) => scrollToSection(e, "#who-it-serves")}
              className="rounded-full px-4 py-2.5 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              Roles
            </a>
            <a
              href="#issues"
              onClick={(e) => scrollToSection(e, "#issues")}
              className="rounded-full px-4 py-2.5 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              Coverage
            </a>
            <Link
              to="/login"
              className="rounded-full px-4 py-2.5 transition-colors hover:bg-foreground/8 hover:text-foreground"
            >
              Sign in
            </Link>
          </nav>

          <Link
            to="/login"
            className="rounded-full px-3 py-2 text-xs font-medium text-foreground/80 transition-colors hover:text-foreground md:hidden"
          >
            Sign in
          </Link>

          <Link
            to="/register"
            className="ml-1 inline-flex items-center justify-center rounded-full bg-primary px-6 py-3 text-xs font-semibold text-primary-foreground shadow-sm shadow-primary/25 transition-all hover:brightness-110 sm:px-7 sm:text-sm"
          >
            Report issue
          </Link>
        </div>
      </header>

      {/* Hero Viewport — Editorial Cream, Ink Black & Burnt Orange */}
      <div className="js-hero-stage flex min-h-screen flex-col justify-between bg-background pt-24">
        <main className="mx-auto flex w-full max-w-7xl flex-1 flex-col items-center justify-center px-5 py-12 text-center sm:px-8">
          <h1 className="flex flex-col items-center font-extrabold tracking-[-0.045em] text-foreground">
            <span className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-5xl leading-[0.95] sm:gap-x-6 sm:text-7xl md:text-8xl lg:text-[7.25rem]">
              <span className="js-hero-word inline-block">Power</span>
              <span className="js-hero-pill-img relative inline-flex h-[0.72em] w-[1.85em] shrink-0 overflow-hidden rounded-full border border-foreground/10 shadow-md">
                <img
                  src="/hero-grid.jpg"
                  alt="Electrical utility technician inspecting a power line at golden hour"
                  className="h-full w-full object-cover object-center"
                />
              </span>
              <span className="js-hero-word inline-block">Track</span>
            </span>
            <span className="js-hero-word mt-2 inline-block text-5xl leading-[0.98] sm:mt-3 sm:text-7xl md:text-8xl lg:text-[7.25rem]">
              is <span className="text-foreground">Resolution</span>
            </span>
          </h1>

          <p className="js-hero-sub mt-7 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Report outages, fallen poles, and faulty meters in seconds — connect consumers, dispatch admins, and field
            crews until the lights are back on.
          </p>

          <div className="mt-10 flex flex-wrap items-center justify-center gap-4 sm:gap-5">
            <Link
              to="/register"
              className="js-hero-cta inline-flex h-12 items-center justify-center rounded-full bg-primary px-9 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground shadow-sm transition-[background-color,box-shadow] hover:bg-primary/90 hover:shadow-md"
            >
              Report Issue
            </Link>

            <Link
              to="/login"
              className="js-hero-cta group inline-flex h-12 items-center gap-3 rounded-full border border-foreground/25 bg-card pl-7 pr-2 text-xs font-bold uppercase tracking-[0.16em] text-foreground shadow-xs transition-[border-color,background-color,color] hover:border-foreground hover:bg-foreground hover:text-background"
            >
              <span>Track Complaint</span>
              <span className="flex h-8 w-8 items-center justify-center rounded-full bg-surface text-foreground transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                <ArrowUpRight className="h-4 w-4" />
              </span>
            </Link>
          </div>
        </main>

        {/* Bottom Hero Strip */}
        <div className="js-hero-strip border-t border-foreground/10">
          <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-5 py-5 sm:px-8">
            <Link
              to="/register"
              className="group inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:text-primary"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 bg-card/70 transition-colors group-hover:border-primary group-hover:text-primary">
                <LayoutGrid className="h-4 w-4" />
              </span>
              <span>Quick Report</span>
            </Link>

            <div className="hidden items-center gap-10 text-xs font-bold tracking-[0.06em] text-foreground/80 lg:flex">
              <span className="inline-flex items-center gap-2">
                <Radio className="h-4 w-4 text-primary" />
                24/7 Dispatch
              </span>
              <span className="inline-flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Duplicate Guard
              </span>
              <span className="inline-flex items-center gap-2">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Photo Verified
              </span>
            </div>

            <a
              href="#how-it-works"
              onClick={(e) => scrollToSection(e, "#how-it-works")}
              className="group inline-flex items-center gap-3 text-[11px] font-bold uppercase tracking-[0.16em] text-foreground/80 transition-colors hover:text-primary"
            >
              <span>Scroll Down</span>
              <span className="flex h-10 w-10 items-center justify-center rounded-full border border-foreground/15 bg-card/70 transition-colors group-hover:border-primary group-hover:text-primary">
                <ArrowDown className="h-4 w-4" />
              </span>
            </a>
          </div>
        </div>
      </div>

      {/* Section 1: Workflow — Stepped SaaS Process Cards */}
      <section id="how-it-works" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="js-reveal-head flex flex-col justify-between gap-6 md:flex-row md:items-end">
          <div className="max-w-xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-accent px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Workflow
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              From report to restored power.
            </h2>
          </div>
          <p className="max-w-sm text-sm leading-relaxed text-muted-foreground">
            Four transparent stages keep residents, dispatchers, and field technicians aligned without phone tag.
          </p>
        </div>

        <WorkflowAccordion />
      </section>

      {/* Interactive Showcase: Parting Letters Parade */}
      <PartingLettersParade />

      {/* Section 2: Roles — Flagship 3-Column SaaS Showcase */}
      <section id="who-it-serves" className="border-y border-foreground/10 bg-surface py-24">
        <div className="mx-auto max-w-7xl px-5 sm:px-8">
          <div className="js-reveal-head mx-auto max-w-2xl text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-foreground/15 bg-card px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
              Built for every role
            </span>
            <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-5xl">
              One workspace, three perspectives.
            </h2>
            <p className="mt-4 text-sm leading-relaxed text-muted-foreground sm:text-base">
              Every user sees a tailored interface with role-based permissions powered by Supabase Row Level Security.
            </p>
          </div>

          {/* Centered Segmented Role Pill Toggle */}
          <div className="mt-9 flex justify-center">
            <div
              role="tablist"
              aria-label="Preview role perspective"
              className="relative inline-grid grid-cols-3 items-center rounded-full border border-foreground/15 bg-card p-1.5 shadow-md shadow-foreground/5"
            >
              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-y-1.5 left-1.5 w-[calc((100%-0.75rem)/3)] rounded-full bg-foreground shadow-sm transition-transform duration-300 ease-out"
                style={{
                  transform: `translateX(${ROLES.findIndex((r) => r.id === activeRole) * 100}%)`,
                }}
              />
              {ROLES.map((role) => {
                const Icon = role.icon;
                const selected = activeRole === role.id;
                return (
                  <button
                    key={role.id}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    onClick={() => setActiveRole(role.id)}
                    className={`relative z-10 inline-flex items-center justify-center gap-2 rounded-full px-4 py-2.5 text-xs font-semibold transition-colors sm:px-6 sm:text-sm ${
                      selected ? "text-background" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <Icon className={`h-3.5 w-3.5 sm:h-4 sm:w-4 ${selected ? "text-primary" : ""}`} />
                    <span>{role.shortLabel}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="js-role-grid mt-12 grid gap-6 lg:grid-cols-3">
            {ROLES.map((role) => {
              const Icon = role.icon;
              const isSelected = activeRole === role.id;
              return (
                <div
                  key={role.id}
                  onClick={() => setActiveRole(role.id)}
                  className={
                    isSelected
                      ? "js-role-card relative flex cursor-pointer flex-col justify-between rounded-3xl border border-foreground bg-foreground p-8 text-background shadow-2xl shadow-foreground/15 transition-[background-color,border-color,box-shadow,color] duration-300 lg:-translate-y-2"
                      : "js-role-card relative flex cursor-pointer flex-col justify-between rounded-3xl border border-foreground/10 bg-card p-8 text-foreground shadow-xs transition-[background-color,border-color,box-shadow,color] duration-300 hover:border-primary/35 hover:shadow-lg hover:shadow-foreground/5"
                  }
                >
                  <div>
                    <div className="flex items-center justify-between">
                      <span
                        className={
                          isSelected
                            ? "flex h-12 w-12 items-center justify-center rounded-2xl bg-primary text-primary-foreground transition-colors"
                            : "flex h-12 w-12 items-center justify-center rounded-2xl bg-accent text-primary transition-colors"
                        }
                      >
                        <Icon className="h-5 w-5" />
                      </span>
                      <span
                        className={
                          isSelected
                            ? "rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-background/80"
                            : "rounded-full bg-surface px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground"
                        }
                      >
                        {role.eyebrow}
                      </span>
                    </div>

                    <h3 className="mt-7 text-2xl font-bold tracking-tight">{role.title}</h3>
                    <p
                      className={
                        isSelected
                          ? "mt-2.5 text-sm leading-relaxed text-background/70"
                          : "mt-2.5 text-sm leading-relaxed text-muted-foreground"
                      }
                    >
                      {role.description}
                    </p>

                    <ul className="mt-7 space-y-3">
                      {role.points.map((point) => (
                        <li key={point} className="flex items-start gap-3 text-sm">
                          <span
                            className={
                              isSelected
                                ? "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-primary/20 text-primary"
                                : "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
                            }
                          >
                            <Check className="h-3 w-3" />
                          </span>
                          <span className={isSelected ? "text-background/90" : "text-foreground/85"}>{point}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <div
                    className={
                      isSelected
                        ? "mt-8 border-t border-white/10 pt-6"
                        : "mt-8 border-t border-border/80 pt-6"
                    }
                  >
                    <Link
                      to={role.to}
                      onClick={(e) => e.stopPropagation()}
                      className={
                        isSelected
                          ? "inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-primary-foreground transition-all hover:brightness-110"
                          : "inline-flex w-full items-center justify-center gap-2 rounded-full border border-foreground/15 bg-background px-5 py-3 text-xs font-bold uppercase tracking-[0.14em] text-foreground transition-all hover:border-foreground hover:bg-foreground hover:text-background"
                      }
                    >
                      {role.cta}
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Section 3: Coverage & Built-In Capabilities — SaaS Bento Grid */}
      <section id="issues" className="mx-auto max-w-7xl px-5 py-24 sm:px-8">
        <div className="js-bento-grid grid gap-8 lg:grid-cols-12">
          <div className="js-bento-left flex flex-col justify-between rounded-3xl border border-foreground/10 bg-card p-8 shadow-xs sm:p-10 lg:col-span-7">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/25 bg-accent px-3.5 py-1 text-[11px] font-bold uppercase tracking-[0.16em] text-primary">
                Coverage
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight sm:text-4xl">Issues you can report</h2>
              <p className="mt-3 max-w-xl text-sm leading-relaxed text-muted-foreground">
                Every electrical fault is automatically prioritized on submission so life-safety hazards like broken
                wires and fallen poles reach dispatch first.
              </p>

              <div className="mt-8 grid gap-3 sm:grid-cols-2">
                {CATEGORIES.map((category) => {
                  const priority = DEFAULT_PRIORITY[category];
                  const metaDot = PRIORITY_DOT[priority];
                  return (
                    <div
                      key={category}
                      className="js-issue-chip flex items-center justify-between rounded-2xl border border-foreground/10 bg-background/70 px-4 py-3.5 transition-colors hover:border-primary/40 hover:bg-card"
                    >
                      <span className="text-sm font-semibold text-foreground">{category}</span>
                      <span className="inline-flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground">
                        <span className={`h-2 w-2 rounded-full ${metaDot.dot}`} />
                        {metaDot.label}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-border/80 pt-5 text-xs text-muted-foreground">
              <span>Automatic priority routing with manual admin override</span>
              <Link to="/register" className="inline-flex items-center gap-1 font-semibold text-primary hover:underline">
                Submit a report <ArrowUpRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>

          <div className="flex flex-col gap-5 lg:col-span-5">
            {CAPABILITIES.map((item) => {
              const Icon = item.icon;
              return (
                <div
                  key={item.title}
                  className="js-cap-card group flex flex-1 items-start gap-5 rounded-3xl border border-foreground/10 bg-card p-6 shadow-xs transition-[border-color,box-shadow] duration-200 hover:border-primary/40 hover:shadow-md hover:shadow-foreground/5 sm:p-7"
                >
                  <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-accent text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
                    <Icon className="h-5 w-5" />
                  </span>
                  <div>
                    <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-primary">{item.eyebrow}</p>
                    <h3 className="mt-1 text-lg font-bold tracking-tight text-foreground">{item.title}</h3>
                    <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Pre-Footer SaaS CTA Banner */}
      <section className="mx-auto max-w-7xl px-5 pb-20 sm:px-8">
        <div className="js-cta-banner relative overflow-hidden rounded-3xl bg-foreground px-7 py-14 text-background shadow-2xl shadow-foreground/15 sm:px-14 sm:py-16">
          <div className="relative flex flex-col items-start justify-between gap-8 lg:flex-row lg:items-center">
            <div className="max-w-xl">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-primary">Ready in seconds</p>
              <h2 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">
                Spot a power issue? Get a crew on the way.
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-background/70">
                Create an account to submit complaints, upload photos, and follow live resolution updates from your
                dashboard.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Link
                to="/register"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-full bg-primary px-8 text-xs font-bold uppercase tracking-[0.16em] text-primary-foreground transition-all hover:brightness-110"
              >
                Get Started <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/login"
                className="inline-flex h-12 items-center justify-center rounded-full border border-white/20 px-7 text-xs font-bold uppercase tracking-[0.16em] text-background transition-colors hover:bg-white/10"
              >
                Sign In
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Professional Multi-Column SaaS Footer */}
      <footer className="border-t border-foreground/10 bg-foreground text-background">
        <div className="mx-auto max-w-7xl px-5 py-16 sm:px-8">
          <div className="grid gap-10 md:grid-cols-12">
            <div className="md:col-span-5">
              <Link to="/" className="inline-flex items-center gap-2.5">
                <span className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
                  <Zap className="h-4 w-4 fill-current" />
                </span>
                <span className="text-base font-bold tracking-tight">Power-Track</span>
              </Link>
              <p className="mt-4 max-w-sm text-sm leading-relaxed text-background/65">
                Modern electricity complaint management connecting consumers, dispatch administrators, and field repair
                crews in one unified platform.
              </p>
            </div>

            <div className="md:col-span-2 md:col-start-7">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">Product</p>
              <ul className="mt-4 space-y-2.5 text-sm text-background/80">
                <li>
                  <a
                    href="#how-it-works"
                    onClick={(e) => scrollToSection(e, "#how-it-works")}
                    className="transition-colors hover:text-primary"
                  >
                    How it works
                  </a>
                </li>
                <li>
                  <a
                    href="#who-it-serves"
                    onClick={(e) => scrollToSection(e, "#who-it-serves")}
                    className="transition-colors hover:text-primary"
                  >
                    Role portals
                  </a>
                </li>
                <li>
                  <a
                    href="#issues"
                    onClick={(e) => scrollToSection(e, "#issues")}
                    className="transition-colors hover:text-primary"
                  >
                    Issue coverage
                  </a>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">Portals</p>
              <ul className="mt-4 space-y-2.5 text-sm text-background/80">
                <li>
                  <Link to="/consumer" className="transition-colors hover:text-primary">
                    Consumer
                  </Link>
                </li>
                <li>
                  <Link to="/admin" className="transition-colors hover:text-primary">
                    Administrator
                  </Link>
                </li>
                <li>
                  <Link to="/worker" className="transition-colors hover:text-primary">
                    Field Worker
                  </Link>
                </li>
              </ul>
            </div>

            <div className="md:col-span-2">
              <p className="text-xs font-bold uppercase tracking-[0.16em] text-background/50">Account</p>
              <ul className="mt-4 space-y-2.5 text-sm text-background/80">
                <li>
                  <Link to="/login" className="transition-colors hover:text-primary">
                    Sign in
                  </Link>
                </li>
                <li>
                  <Link to="/register" className="transition-colors hover:text-primary">
                    Create account
                  </Link>
                </li>
                <li>
                  <Link to="/forgot-password" className="transition-colors hover:text-primary">
                    Reset password
                  </Link>
                </li>
              </ul>
            </div>
          </div>

          <div className="mt-14 flex flex-col items-start justify-between gap-4 border-t border-white/10 pt-8 text-xs text-background/55 sm:flex-row sm:items-center">
            <span>© {new Date().getFullYear()} Power-Track. All rights reserved.</span>
            <span className="inline-flex items-center gap-2 text-background/75">
              <span className="h-2 w-2 rounded-full bg-success" />
              Dispatch platform operational
            </span>
          </div>
        </div>
      </footer>
    </div>
  );
}
