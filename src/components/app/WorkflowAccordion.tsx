import { useEffect, useRef } from "react";
import { Bell, ClipboardCheck, HardHat, MapPin } from "lucide-react";

const STEPS = [
  {
    num: "01",
    icon: MapPin,
    title: "Report",
    tag: "Under 60s",
    description: "Choose a category, describe the issue, pin your address, and attach site photos.",
    panelClass: "bg-background text-foreground",
    iconClass: "bg-foreground text-background",
    numClass: "text-foreground/15",
    descClass: "text-muted-foreground",
    borderClass: "border-foreground/12",
    stepClass: "text-muted-foreground",
    tagClass: "bg-surface text-foreground",
  },
  {
    num: "02",
    icon: ClipboardCheck,
    title: "Review",
    tag: "Auto-triage",
    description: "Administrators verify details, set urgency priority, and flag nearby duplicate reports.",
    panelClass: "bg-primary text-primary-foreground",
    iconClass: "bg-foreground text-background",
    numClass: "text-primary-foreground/25",
    descClass: "text-primary-foreground/85",
    borderClass: "border-primary-foreground/20",
    stepClass: "text-primary-foreground/80",
    tagClass: "bg-foreground text-background",
  },
  {
    num: "03",
    icon: HardHat,
    title: "Fix",
    tag: "On-site crew",
    description: "A field worker is dispatched immediately and logs live repair progress from the site.",
    panelClass: "bg-surface text-foreground",
    iconClass: "bg-primary text-primary-foreground",
    numClass: "text-foreground/15",
    descClass: "text-muted-foreground",
    borderClass: "border-foreground/12",
    stepClass: "text-muted-foreground",
    tagClass: "bg-card text-foreground",
  },
  {
    num: "04",
    icon: Bell,
    title: "Resolve",
    tag: "Photo verified",
    description: "Receive real-time notifications with before-and-after completion evidence.",
    panelClass: "bg-card text-foreground",
    iconClass: "bg-foreground text-background",
    numClass: "text-foreground/15",
    descClass: "text-muted-foreground",
    borderClass: "border-foreground/12",
    stepClass: "text-muted-foreground",
    tagClass: "bg-accent text-accent-foreground",
  },
] as const;

export function WorkflowAccordion() {
  const stageRef = useRef<HTMLDivElement>(null);
  const panelRefs = useRef<(HTMLDivElement | null)[]>([]);
  const shadeRefs = useRef<(HTMLDivElement | null)[]>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const stage = stageRef.current;
    if (!stage) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReduced) return;

    let rafId = 0;
    let currentDeg = 46;

    const tick = () => {
      const isDesktop = window.innerWidth >= 1024;

      if (!isDesktop) {
        for (let i = 0; i < STEPS.length; i++) {
          const panel = panelRefs.current[i];
          const shade = shadeRefs.current[i];
          if (panel) panel.style.transform = "";
          if (shade) shade.style.opacity = "0";
        }
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      const rect = stage.getBoundingClientRect();
      const vh = window.innerHeight || 1;
      const stageCenter = rect.top + rect.height * 0.5;
      const viewportCenter = vh * 0.5;

      // Normalized distance from viewport center: 0 when centered, 1 near top/bottom edges
      const distFromCenter = Math.min(1, Math.abs(stageCenter - viewportCenter) / (vh * 0.62));
      // Smooth curve: ~8deg subtle 3D crease at center, folding up to 54deg as you scroll in/out
      const curved = Math.pow(distFromCenter, 1.25);
      const targetDeg = 8 + curved * 46;

      currentDeg += (targetDeg - currentDeg) * 0.14;

      const rad = (currentDeg * Math.PI) / 180;
      const cosA = Math.cos(rad);
      const sinA = Math.sin(rad);

      const firstPanel = panelRefs.current[0];
      const panelW = firstPanel ? firstPanel.offsetWidth : stage.clientWidth / 4;

      for (let i = 0; i < STEPS.length; i++) {
        const panel = panelRefs.current[i];
        const shade = shadeRefs.current[i];
        if (!panel) continue;

        // Exact 3D concertina hinge math: keeps every adjacent panel edge locked together
        const sign = i % 2 === 0 ? 1 : -1;
        const rotY = sign * currentDeg;
        const tx = (i - 1.5) * panelW * (cosA - 1);

        panel.style.transform = `translate3d(${tx.toFixed(2)}px, 0px, 0px) rotateY(${rotY.toFixed(2)}deg)`;

        if (shade) {
          // Flat solid facet shading (zero gradients): receding faces darken realistically as fold deepens
          const shadeOpacity = i % 2 === 1 ? sinA * 0.36 : sinA * 0.07;
          shade.style.opacity = shadeOpacity.toFixed(3);
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="mt-14 overflow-hidden rounded-3xl bg-foreground px-4 py-10 shadow-2xl shadow-foreground/15 sm:rounded-[2.25rem] sm:px-8 sm:py-14 lg:px-10 lg:py-20"
    >
      <div
        className="mx-auto grid max-w-6xl gap-4 md:grid-cols-2 lg:grid-cols-4 lg:gap-0"
        style={{ perspective: "1300px", transformStyle: "preserve-3d" }}
      >
        {STEPS.map((step, i) => {
          const Icon = step.icon;
          return (
            <div
              key={step.num}
              ref={(el) => {
                panelRefs.current[i] = el;
              }}
              className={`relative flex min-h-[340px] flex-col justify-between rounded-2xl p-7 sm:min-h-[400px] sm:p-8 lg:rounded-none lg:border-r lg:border-foreground/15 lg:last:border-r-0 ${step.panelClass}`}
              style={{ backfaceVisibility: "hidden", transformOrigin: "center center" }}
            >
              {/* Solid 3D facet shadow overlay (no gradients) */}
              <div
                ref={(el) => {
                  shadeRefs.current[i] = el;
                }}
                aria-hidden="true"
                className="pointer-events-none absolute inset-0 bg-foreground"
                style={{ opacity: 0 }}
              />

              <div className="relative z-10">
                <div className="flex items-center justify-between">
                  <span className={`flex h-12 w-12 items-center justify-center rounded-2xl ${step.iconClass}`}>
                    <Icon className="h-5 w-5" />
                  </span>
                  <span className={`font-mono text-4xl font-extrabold tracking-tighter ${step.numClass}`}>
                    {step.num}
                  </span>
                </div>

                <h3 className="mt-10 text-2xl font-extrabold tracking-tight sm:text-3xl">{step.title}</h3>
                <p className={`mt-3 text-sm leading-relaxed ${step.descClass}`}>{step.description}</p>
              </div>

              <div className={`relative z-10 mt-8 flex items-center justify-between border-t pt-4 ${step.borderClass}`}>
                <span className={`text-[11px] font-bold uppercase tracking-[0.15em] ${step.stepClass}`}>
                  Step {step.num}
                </span>
                <span className={`rounded-full px-3 py-1 text-[11px] font-bold ${step.tagClass}`}>
                  {step.tag}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

