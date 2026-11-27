import { useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, Search } from "lucide-react";
import { toast } from "sonner";

interface MapboxFeature {
  id: string;
  place_name: string;
  center: [number, number]; // [lng, lat]
}

interface MapboxLocationPickerProps {
  address: string;
  latitude?: number;
  longitude?: number;
  onChange: (next: { address: string; latitude?: number; longitude?: number }) => void;
  error?: string;
}

const DEFAULT_CENTER: [number, number] = [74.3587, 31.5204]; // Default fallback center (Lahore, PK)

export function MapboxLocationPicker({
  address,
  latitude,
  longitude,
  onChange,
  error,
}: MapboxLocationPickerProps) {
  const token = (import.meta.env.VITE_MAPBOX_TOKEN as string | undefined)?.trim();
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<import("mapbox-gl").Map | null>(null);
  const markerRef = useRef<import("mapbox-gl").Marker | null>(null);
  const mapboxModuleRef = useRef<typeof import("mapbox-gl").default | null>(null);

  const [suggestions, setSuggestions] = useState<MapboxFeature[]>([]);
  const [searching, setSearching] = useState(false);
  const [locating, setLocating] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const skipSearchRef = useRef(false);

  const reverseGeocode = async (lng: number, lat: number) => {
    if (!token) {
      onChange({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, latitude: lat, longitude: lng });
      return;
    }
    try {
      const res = await fetch(
        `https://api.mapbox.com/geocoding/v5/mapbox.places/${lng},${lat}.json?access_token=${encodeURIComponent(token)}&limit=1`,
      );
      const data = (await res.json()) as { features?: MapboxFeature[] };
      const place = data.features?.[0]?.place_name;
      skipSearchRef.current = true;
      onChange({
        address: place || `${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        latitude: lat,
        longitude: lng,
      });
    } catch {
      skipSearchRef.current = true;
      onChange({ address: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, latitude: lat, longitude: lng });
    }
  };

  const placePin = (lng: number, lat: number, fly = true) => {
    const map = mapRef.current;
    const mapboxgl = mapboxModuleRef.current;
    if (!map || !mapboxgl) return;

    if (!markerRef.current) {
      const marker = new mapboxgl.Marker({ color: "#D14E1E", draggable: true })
        .setLngLat([lng, lat])
        .addTo(map);
      marker.on("dragend", () => {
        const pos = marker.getLngLat();
        void reverseGeocode(pos.lng, pos.lat);
      });
      markerRef.current = marker;
    } else {
      markerRef.current.setLngLat([lng, lat]);
    }

    if (fly) {
      map.flyTo({ center: [lng, lat], zoom: Math.max(map.getZoom(), 15), speed: 1.4 });
    }
  };

  // Initialize Mapbox GL map (client-only, SSR-safe)
  useEffect(() => {
    if (typeof window === "undefined" || !token || !mapContainerRef.current) return;
    let cancelled = false;

    void (async () => {
      const [{ default: mapboxgl }] = await Promise.all([
        import("mapbox-gl"),
        import("mapbox-gl/dist/mapbox-gl.css"),
      ]);
      if (cancelled || !mapContainerRef.current) return;

      mapboxgl.accessToken = token;
      mapboxModuleRef.current = mapboxgl;

      const initialCenter: [number, number] =
        longitude !== undefined && latitude !== undefined ? [longitude, latitude] : DEFAULT_CENTER;

      const map = new mapboxgl.Map({
        container: mapContainerRef.current,
        style: "mapbox://styles/mapbox/light-v11",
        center: initialCenter,
        zoom: longitude !== undefined && latitude !== undefined ? 15 : 11,
      });

      map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
      mapRef.current = map;

      if (longitude !== undefined && latitude !== undefined) {
        placePin(longitude, latitude, false);
      }

      map.on("click", (ev) => {
        const { lng, lat } = ev.lngLat;
        placePin(lng, lat, false);
        void reverseGeocode(lng, lat);
      });
    })();

    return () => {
      cancelled = true;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [token]);

  // Debounced forward geocoding autocomplete when user types an address
  useEffect(() => {
    if (!token) return;
    if (skipSearchRef.current) {
      skipSearchRef.current = false;
      return;
    }
    const q = address.trim();
    if (q.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = window.setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(q)}.json?access_token=${encodeURIComponent(token)}&autocomplete=true&limit=5`,
        );
        const data = (await res.json()) as { features?: MapboxFeature[] };
        setSuggestions(data.features ?? []);
        setShowDropdown(true);
      } catch {
        setSuggestions([]);
      } finally {
        setSearching(false);
      }
    }, 320);

    return () => window.clearTimeout(timer);
  }, [address, token]);

  const useMyLocation = () => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      return toast.error("Location access isn't supported by your browser.");
    }
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const { latitude: lat, longitude: lng } = pos.coords;
        setLocating(false);
        placePin(lng, lat, true);
        void reverseGeocode(lng, lat);
        toast.success("Pinned your current location");
      },
      () => {
        setLocating(false);
        toast.error("Couldn't access your location. Allow location permission or click on the map.");
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  };

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label htmlFor="addr" className="text-xs font-semibold uppercase tracking-[0.1em] text-muted-foreground">
          Address / Landmark
        </label>
        <button
          type="button"
          onClick={useMyLocation}
          disabled={locating}
          className="inline-flex items-center gap-1.5 rounded-full bg-foreground px-3.5 py-1.5 text-[11px] font-bold text-background transition-colors hover:bg-primary hover:text-primary-foreground disabled:opacity-60"
        >
          {locating ? <Loader2 className="h-3 w-3 animate-spin" /> : <Crosshair className="h-3 w-3" />}
          <span>{locating ? "Locating…" : "Pin My Location"}</span>
        </button>
      </div>

      {/* Address Search Input with Autocomplete Dropdown */}
      <div className="relative">
        <Search className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <input
          id="addr"
          type="text"
          value={address}
          onFocus={() => suggestions.length > 0 && setShowDropdown(true)}
          onBlur={() => window.setTimeout(() => setShowDropdown(false), 180)}
          onChange={(e) => onChange({ address: e.target.value, latitude, longitude })}
          placeholder="Search street, block, landmark — or click on the map below"
          className="h-12 w-full rounded-2xl border border-foreground/12 bg-background pl-11 pr-10 text-sm text-foreground placeholder:text-muted-foreground focus:border-foreground focus:bg-card focus:outline-none"
        />
        {searching && (
          <Loader2 className="absolute right-4 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
        )}

        {showDropdown && suggestions.length > 0 && (
          <ul className="absolute left-0 right-0 top-14 z-30 overflow-hidden rounded-2xl border border-foreground/12 bg-card shadow-lg">
            {suggestions.map((feat) => (
              <li key={feat.id}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    const [lng, lat] = feat.center;
                    skipSearchRef.current = true;
                    onChange({ address: feat.place_name, latitude: lat, longitude: lng });
                    placePin(lng, lat, true);
                    setSuggestions([]);
                    setShowDropdown(false);
                  }}
                  className="flex w-full items-start gap-2.5 px-4 py-3 text-left text-xs text-foreground transition-colors hover:bg-surface"
                >
                  <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-primary" />
                  <span className="leading-snug">{feat.place_name}</span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {error && <p className="text-xs font-medium text-destructive">{error}</p>}

      {/* Interactive Mapbox Canvas */}
      {token && (
        <div className="space-y-2">
          <div className="overflow-hidden rounded-2xl border border-foreground/12 bg-surface">
            <div ref={mapContainerRef} className="h-60 w-full sm:h-72" />
          </div>
          <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Click anywhere on the map or drag the pin to mark the exact pole or meter.</span>
            {latitude !== undefined && longitude !== undefined && (
              <span className="rounded-full bg-surface px-2.5 py-0.5 font-mono font-semibold text-foreground">
                {latitude.toFixed(5)}, {longitude.toFixed(5)}
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

