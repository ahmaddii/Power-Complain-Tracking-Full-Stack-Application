import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin } from "lucide-react";
import type { Category, Complaint } from "@/types";
import { CATEGORIES } from "@/utils/helpers";
import { cn } from "@/lib/utils";

const DEFAULT_CENTER: [number, number] = [73.0479, 33.6844]; // Islamabad default center

const PRIORITY_WEIGHT = {
  Emergency: 3,
  High: 2,
  Normal: 1,
} as const;

export function ComplaintsHeatmap({ complaints }: { complaints: Complaint[] }) {
  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const mapboxRef = useRef<typeof import("mapbox-gl").default | null>(null);
  const [catFilter, setCatFilter] = useState<"all" | Category>("all");
  const [mapReady, setMapReady] = useState(false);

  const pinned = useMemo(
    () =>
      complaints.filter(
        (c) =>
          typeof c.latitude === "number" &&
          typeof c.longitude === "number" &&
          (catFilter === "all" || c.category === catFilter),
      ),
    [complaints, catFilter],
  );

  const geojson = useMemo(
    () => ({
      type: "FeatureCollection" as const,
      features: pinned.map((c) => ({
        type: "Feature" as const,
        properties: {
          id: c.id,
          title: c.title,
          category: c.category,
          priority: c.priority,
          status: c.status,
          weight: PRIORITY_WEIGHT[c.priority],
        },
        geometry: {
          type: "Point" as const,
          coordinates: [c.longitude!, c.latitude!] as [number, number],
        },
      })),
    }),
    [pinned],
  );

  // Initialize Mapbox map once (client-only)
  useEffect(() => {
    if (typeof window === "undefined" || !token || !containerRef.current) return;
    let cancelled = false;

    void (async () => {
      const [{ default: mapboxgl }] = await Promise.all([
        import("mapbox-gl"),
        import("mapbox-gl/dist/mapbox-gl.css"),
      ]);
      if (cancelled || !containerRef.current) return;

      mapboxgl.accessToken = token;
      mapboxRef.current = mapboxgl;

      const map = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: DEFAULT_CENTER,
        zoom: 11,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");

      map.on("load", () => {
        if (cancelled) return;

        map.addSource("complaints-src", {
          type: "geojson",
          data: { type: "FeatureCollection", features: [] },
        });

        // Mapbox Geographic Heatmap Layer (Cream -> Amber -> Burnt Orange -> Crimson)
        map.addLayer({
          id: "complaints-heat",
          type: "heatmap",
          source: "complaints-src",
          maxzoom: 16,
          paint: {
            "heatmap-weight": ["interpolate", ["linear"], ["get", "weight"], 1, 0.45, 3, 1],
            "heatmap-intensity": ["interpolate", ["linear"], ["zoom"], 0, 1, 15, 2.6],
            "heatmap-color": [
              "interpolate",
              ["linear"],
              ["heatmap-density"],
              0,
              "rgba(209, 78, 30, 0)",
              0.2,
              "rgba(246, 206, 159, 0.72)",
              0.45,
              "rgba(235, 134, 67, 0.85)",
              0.7,
              "rgba(209, 78, 30, 0.92)",
              1,
              "rgba(153, 27, 27, 0.98)",
            ],
            "heatmap-radius": ["interpolate", ["linear"], ["zoom"], 0, 14, 11, 28, 15, 42],
            "heatmap-opacity": ["interpolate", ["linear"], ["zoom"], 13, 0.9, 16, 0.35],
          },
        });

        // Crisp pin points visible on zoom-in and clickable for details
        map.addLayer({
          id: "complaints-point",
          type: "circle",
          source: "complaints-src",
          minzoom: 9,
          paint: {
            "circle-radius": ["interpolate", ["linear"], ["zoom"], 9, 4, 15, 8],
            "circle-color": [
              "match",
              ["get", "priority"],
              "Emergency",
              "#C92A2A",
              "High",
              "#D14E1E",
              "#1C1B19",
            ],
            "circle-stroke-color": "#FFFFFF",
            "circle-stroke-width": 2,
            "circle-opacity": 0.95,
          },
        });

        map.on("mouseenter", "complaints-point", () => {
          map.getCanvas().style.cursor = "pointer";
        });
        map.on("mouseleave", "complaints-point", () => {
          map.getCanvas().style.cursor = "";
        });
        map.on("click", "complaints-point", (ev) => {
          const raw = ev.features?.[0] as unknown as
            | { geometry?: { type?: string; coordinates?: number[] }; properties?: Record<string, string> }
            | undefined;
          if (!raw || raw.geometry?.type !== "Point" || !Array.isArray(raw.geometry.coordinates)) return;
          const coords = raw.geometry.coordinates.slice(0, 2) as [number, number];
          const props = raw.properties ?? {};

          const html = `
            <div style="font-family: inherit; min-width: 170px; padding: 2px;">
              <div style="font-family: monospace; font-size: 11px; font-weight: 700; color: #D14E1E;">${props.id ?? ""}</div>
              <div style="font-size: 13px; font-weight: 700; color: #1C1B19; margin-top: 2px;">${props.title ?? ""}</div>
              <div style="font-size: 11px; color: #6B655E; margin-top: 3px;">${props.category ?? ""} · ${props.priority ?? ""}</div>
              <a href="/complaints/${props.id ?? ""}" style="display:inline-block; margin-top:6px; font-size:11px; font-weight:700; color:#D14E1E; text-decoration:underline;">Open complaint →</a>
            </div>
          `;
          new mapboxgl.Popup({ offset: 12 }).setLngLat(coords).setHTML(html).addTo(map);
        });

        mapRef.current = map;
        setMapReady(true);
      });
    })();

    return () => {
      cancelled = true;
      setMapReady(false);
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Update GeoJSON data & auto-fit bounds when complaints or category filter change
  useEffect(() => {
    const map = mapRef.current;
    const mapboxgl = mapboxRef.current;
    if (!mapReady || !map || !mapboxgl) return;

    const src = map.getSource("complaints-src") as import("mapbox-gl").GeoJSONSource | undefined;
    if (src) src.setData(geojson);

    if (pinned.length === 1) {
      map.flyTo({ center: [pinned[0].longitude!, pinned[0].latitude!], zoom: 13.5, speed: 1.4 });
    } else if (pinned.length > 1) {
      const bounds = new mapboxgl.LngLatBounds();
      pinned.forEach((c) => bounds.extend([c.longitude!, c.latitude!]));
      map.fitBounds(bounds, { padding: 64, maxZoom: 14, duration: 800 });
    }
  }, [geojson, pinned, mapReady]);

  return (
    <section className="rounded-3xl border border-foreground/8 bg-card p-6 shadow-xs sm:p-7">
      <div className="flex flex-col justify-between gap-4 lg:flex-row lg:items-center">
        <div>
          <h2 className="text-lg font-bold tracking-tight text-foreground">Live Outage &amp; Fault Map Heatmap</h2>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Geographic hotspot density weighted by priority. Click any pin to inspect the complaint.
          </p>
        </div>

        <span className="inline-flex w-fit items-center gap-1.5 rounded-full bg-surface px-3.5 py-1.5 font-mono text-xs font-bold text-foreground">
          <MapPin className="h-3.5 w-3.5 text-primary" /> {pinned.length} pinned{" "}
          {pinned.length === 1 ? "location" : "locations"}
        </span>
      </div>

      {/* Category Filter Pills */}
      <div className="mt-4 flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={() => setCatFilter("all")}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
            catFilter === "all"
              ? "bg-foreground text-background"
              : "bg-surface text-muted-foreground hover:text-foreground",
          )}
        >
          All Categories
        </button>
        {CATEGORIES.map((cat) => (
          <button
            key={cat}
            type="button"
            onClick={() => setCatFilter(cat)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-semibold transition-colors",
              catFilter === cat
                ? "bg-foreground text-background"
                : "bg-surface text-muted-foreground hover:text-foreground",
            )}
          >
            {cat.replace(" Issue", "")}
          </button>
        ))}
      </div>

      {/* Mapbox Heatmap Container */}
      <div className="relative mt-4 overflow-hidden rounded-2xl border border-foreground/10 bg-surface">
        {token ? (
          <>
            <div ref={containerRef} className="h-80 w-full sm:h-[420px]" />
            {pinned.length === 0 && (
              <div className="pointer-events-none absolute inset-x-4 bottom-4 mx-auto w-fit rounded-full border border-foreground/10 bg-card px-4 py-2 text-xs font-medium text-muted-foreground shadow-sm">
                No pinned coordinates for this filter yet — pin a location when submitting a complaint.
              </div>
            )}
          </>
        ) : (
          <div className="flex h-72 flex-col items-center justify-center p-6 text-center">
            <MapPin className="h-7 w-7 text-primary" />
            <p className="mt-3 text-sm font-semibold text-foreground">Mapbox token not configured</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Add <code className="font-mono">VITE_MAPBOX_TOKEN</code> to <code className="font-mono">.env</code> to
              display the live geographic heatmap.
            </p>
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-4">
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-destructive" /> Emergency
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-primary" /> High Priority
          </span>
          <span className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full bg-foreground" /> Normal
          </span>
        </div>
        <span>Zoom in to inspect individual pole &amp; meter pins</span>
      </div>
    </section>
  );
}

