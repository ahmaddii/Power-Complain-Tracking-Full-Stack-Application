import { useEffect, useRef } from "react";

interface ParadeCard {
  id: string;
  src: string;
  label: string;
  sublabel: string;
}

const PARADE_CARDS: ParadeCard[] = [
  {
    id: "01",
    src: "/parade-1.jpg",
    label: "Live Line Dispatch",
    sublabel: "Emergency crews routed in minutes",
  },
  {
    id: "02",
    src: "/parade-2.jpg",
    label: "Smart Meter Diagnostics",
    sublabel: "Faulty meters logged with photo proof",
  },
  {
    id: "03",
    src: "/parade-3.jpg",
    label: "Transformer Response",
    sublabel: "Area outages triaged & prioritized",
  },
  {
    id: "04",
    src: "/parade-4.jpg",
    label: "Restored Neighborhoods",
    sublabel: "Verified before-and-after resolution",
  },
];

const LINES = ["Every fault fixed", "keeps cities bright"] as const;

interface CharMeta {
  el: HTMLSpanElement;
  cx: number;
  cy: number;
  lineIdx: number;
}

export function PartingLettersParade() {
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);
  const charRefs = useRef<(HTMLSpanElement | null)[]>([]);
  const labelRef = useRef<HTMLSpanElement>(null);
  const sublabelRef = useRef<HTMLSpanElement>(null);
  const indexRef = useRef<HTMLSpanElement>(null);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const section = sectionRef.current;
    const stage = stageRef.current;
    if (!section || !stage) return;

    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    let chars: CharMeta[] = [];
    let stageW = stage.clientWidth;
    let stageH = stage.clientHeight;
    let rafId = 0;

    const measure = () => {
      stageW = stage.clientWidth;
      stageH = stage.clientHeight;
      const stageRect = stage.getBoundingClientRect();

      chars = [];
      let idx = 0;
      LINES.forEach((line, lineIdx) => {
        for (let i = 0; i < line.length; i++) {
          const el = charRefs.current[idx++];
          if (!el || line[i] === " ") continue;
          el.style.transform = "translate3d(0px, 0px, 0px)";
          const r = el.getBoundingClientRect();
          chars.push({
            el,
            cx: r.left - stageRect.left + r.width / 2 - stageW / 2,
            cy: r.top - stageRect.top + r.height / 2 - stageH / 2,
            lineIdx,
          });
        }
      });
    };

    measure();
    window.addEventListener("resize", measure);
    if (document.fonts?.ready) {
      document.fonts.ready.then(measure);
    }

    const cardCount = PARADE_CARDS.length;

    const tick = () => {
      const rect = section.getBoundingClientRect();
      const totalScroll = Math.max(1, section.offsetHeight - window.innerHeight);
      const rawProgress = -rect.top / totalScroll;
      const progress = Math.max(0, Math.min(1, rawProgress));

      if (barRef.current) {
        barRef.current.style.transform = `scaleX(${Math.max(0.04, progress)})`;
      }

      const cardSize = Math.min(230, Math.max(150, stageW * 0.18));
      const spacing = Math.max(cardSize * 2.35, stageW * 0.46);
      const startX = stageW * 0.5 + cardSize * 0.85;
      const totalTravel = startX * 2 + spacing * (cardCount - 1);

      const activeCards: { x: number; scale: number; idx: number }[] = [];
      let closestIdx = 0;
      let closestDist = Infinity;

      for (let i = 0; i < cardCount; i++) {
        const el = cardRefs.current[i];
        if (!el) continue;

        const x = prefersReduced
          ? (i - (cardCount - 1) / 2) * (cardSize * 1.15)
          : startX + i * spacing - progress * totalTravel;

        const halfRange = stageW * 0.48;
        const norm = Math.min(1, Math.abs(x) / halfRange);
        // Smooth bell curve: scales up to ~1.06 in center, shrinks smoothly to 0 at edges
        const bell = Math.cos(norm * Math.PI * 0.5);
        const scale = prefersReduced ? 0.9 : Math.max(0, bell * bell * 1.08);
        const opacity = prefersReduced ? 1 : Math.max(0, Math.min(1, bell * 1.6));

        el.style.transform = `translate3d(${x.toFixed(1)}px, 0px, 0px) scale(${scale.toFixed(3)})`;
        el.style.opacity = opacity.toFixed(3);

        if (scale > 0.05) {
          activeCards.push({ x, scale, idx: i });
        }
        if (Math.abs(x) < closestDist) {
          closestDist = Math.abs(x);
          closestIdx = i;
        }
      }

      // Update caption readout for the card nearest center
      const current = PARADE_CARDS[closestIdx];
      if (indexRef.current && indexRef.current.textContent !== `${current.id} / 0${cardCount}`) {
        indexRef.current.textContent = `${current.id} / 0${cardCount}`;
      }
      if (labelRef.current && labelRef.current.textContent !== current.label) {
        labelRef.current.textContent = current.label;
      }
      if (sublabelRef.current && sublabelRef.current.textContent !== current.sublabel) {
        sublabelRef.current.textContent = current.sublabel;
      }

      // Gently part letters out of each passing card's path
      if (!prefersReduced) {
        const radiusX = cardSize * 0.92;
        const radiusY = cardSize * 0.85;
        const maxPushY = cardSize * 0.54;
        const maxPushX = cardSize * 0.18;

        for (let c = 0; c < chars.length; c++) {
          const ch = chars[c];
          let pushX = 0;
          let pushY = 0;

          for (let a = 0; a < activeCards.length; a++) {
            const card = activeCards[a];
            const dx = ch.cx - card.x;
            const dy = ch.cy;
            const rx = radiusX * (0.65 + card.scale * 0.45);
            const ry = radiusY * (0.65 + card.scale * 0.45);
            const distNorm = Math.hypot(dx / rx, dy / ry);

            if (distNorm < 1) {
              const force = Math.pow(Math.cos(distNorm * Math.PI * 0.5), 2) * card.scale;
              const dirY = ch.lineIdx === 0 ? -1 : 1;
              pushY += dirY * force * maxPushY;
              pushX += (dx >= 0 ? 1 : -1) * Math.min(1, Math.abs(dx) / rx) * force * maxPushX;
            }
          }

          ch.el.style.transform = `translate3d(${pushX.toFixed(1)}px, ${pushY.toFixed(1)}px, 0px)`;
        }
      }

      rafId = window.requestAnimationFrame(tick);
    };

    rafId = window.requestAnimationFrame(tick);

    return () => {
      window.cancelAnimationFrame(rafId);
      window.removeEventListener("resize", measure);
    };
  }, []);

  let runningCharIdx = 0;

  return (
    <section
      ref={sectionRef}
      aria-label="Field impact showcase"
      className="relative h-[280vh] px-3 py-3 sm:px-6 sm:py-4"
    >
      <div
        ref={stageRef}
        className="sticky top-3 mx-auto flex h-[calc(100vh-1.5rem)] w-full max-w-[96rem] flex-col items-center justify-between overflow-hidden rounded-3xl bg-foreground px-5 py-8 text-background shadow-2xl shadow-foreground/15 sm:top-4 sm:h-[calc(100vh-2rem)] sm:rounded-[2.25rem] sm:px-10 sm:py-10"
      >
        {/* Top eyebrow */}
        <div className="flex w-full max-w-7xl items-center justify-between text-[11px] font-bold uppercase tracking-[0.18em] text-background/55">
          <span className="inline-flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            In The Field
          </span>
          <span className="hidden sm:inline">Scroll to explore</span>
        </div>

        {/* Center Interactive Stage: Parting Letters + Right-to-Left Scaling Photo Cards */}
        <div className="relative flex w-full flex-1 items-center justify-center">
          {/* Display Typography whose letters part around passing cards */}
          <h2
            aria-label={LINES.join(" ")}
            className="pointer-events-none select-none text-center text-4xl font-extrabold leading-[1.08] tracking-[-0.04em] text-background sm:text-6xl md:text-7xl lg:text-[5.5rem]"
          >
            {LINES.map((line, lineIdx) => (
              <span key={line} className="block whitespace-nowrap">
                {Array.from(line).map((char, i) => {
                  const refIdx = runningCharIdx++;
                  return (
                    <span
                      key={`${lineIdx}-${i}`}
                      ref={(el) => {
                        charRefs.current[refIdx] = el;
                      }}
                      className="inline-block"
                    >
                      {char === " " ? "\u00A0" : char}
                    </span>
                  );
                })}
              </span>
            ))}
          </h2>

          {/* Parade Image Cards */}
          {PARADE_CARDS.map((card, i) => (
            <div
              key={card.id}
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="pointer-events-none absolute left-1/2 top-1/2 -ml-[75px] -mt-[75px] h-[150px] w-[150px] overflow-hidden rounded-2xl border border-white/15 bg-foreground shadow-2xl sm:-ml-[105px] sm:-mt-[105px] sm:h-[210px] sm:w-[210px]"
              style={{ opacity: 0 }}
            >
              <img src={card.src} alt={card.label} className="h-full w-full object-cover object-center" />
            </div>
          ))}
        </div>

        {/* Bottom Caption & Solid Burnt-Orange Progress Bar */}
        <div className="w-full max-w-7xl">
          <div className="flex flex-wrap items-end justify-between gap-4 pb-4">
            <div>
              <span ref={indexRef} className="font-mono text-xs font-semibold text-primary">
                01 / 04
              </span>
              <p className="mt-1 text-base font-bold tracking-tight text-background sm:text-lg">
                <span ref={labelRef}>{PARADE_CARDS[0].label}</span>
              </p>
            </div>
            <p className="text-xs text-background/60 sm:text-sm">
              <span ref={sublabelRef}>{PARADE_CARDS[0].sublabel}</span>
            </p>
          </div>
          <div className="h-0.5 w-full overflow-hidden bg-white/15">
            <div
              ref={barRef}
              className="h-full w-full origin-left bg-primary"
              style={{ transform: "scaleX(0.04)" }}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

