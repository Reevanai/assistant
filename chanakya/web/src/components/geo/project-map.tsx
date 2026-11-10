"use client";
import { useEffect, useRef, useState } from "react";
import "maplibre-gl/dist/maplibre-gl.css";

export interface MapPoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  detail: string;
  sourceUrl: string | null;
}

/** MapLibre map. Basemap: OpenFreeMap (OSM data, ODbL), free incl. commercial use, no key. */
export function ProjectMap({ points }: { points: MapPoint[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let map: import("maplibre-gl").Map | undefined;
    let cancelled = false;
    (async () => {
      const maplibregl = (await import("maplibre-gl")).default;
      if (cancelled || !ref.current) return;
      map = new maplibregl.Map({
        container: ref.current,
        style: "https://tiles.openfreemap.org/styles/dark",
        center: [76.2, 14.8],
        zoom: 5.6,
        attributionControl: { compact: true },
      });
      map.addControl(new maplibregl.NavigationControl({ showCompass: false }), "top-right");
      map.on("error", (e) => setError(e.error?.message ?? "Map failed to load"));
      map.on("load", () => {
        map!.addSource("projects", {
          type: "geojson",
          data: {
            type: "FeatureCollection",
            features: points.map((p) => ({
              type: "Feature",
              geometry: { type: "Point", coordinates: [p.lon, p.lat] },
              properties: { id: p.id, name: p.name, detail: p.detail, url: p.sourceUrl ?? "" },
            })),
          },
        });
        map!.addLayer({
          id: "projects", type: "circle", source: "projects",
          paint: { "circle-radius": 6, "circle-color": "#d6a451", "circle-stroke-color": "#0b0e11", "circle-stroke-width": 1.5 },
        });
        map!.on("click", "projects", (e) => {
          const f = e.features?.[0];
          if (!f || f.geometry.type !== "Point") return;
          const pr = f.properties as { name: string; detail: string; url: string };
          const el = document.createElement("div");
          el.style.cssText = "font:12px system-ui;color:#0b0e11";
          const b = document.createElement("strong"); b.textContent = pr.name; el.appendChild(b);
          const d = document.createElement("div"); d.textContent = pr.detail; el.appendChild(d);
          if (pr.url) { const a = document.createElement("a"); a.href = pr.url; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = "Source (Wikidata)"; el.appendChild(a); }
          new maplibregl.Popup({ closeButton: true }).setLngLat(f.geometry.coordinates as [number, number]).setDOMContent(el).addTo(map!);
        });
        map!.on("mouseenter", "projects", () => (map!.getCanvas().style.cursor = "pointer"));
        map!.on("mouseleave", "projects", () => (map!.getCanvas().style.cursor = ""));
      });
    })().catch((e) => setError(e instanceof Error ? e.message : "Map failed to load"));
    return () => { cancelled = true; map?.remove(); };
  }, [points]);

  return (
    <div className="relative h-[60vh] min-h-80 w-full">
      <div ref={ref} className="absolute inset-0" aria-label="Map of public projects" />
      {error ? <p role="alert" className="absolute left-2 top-2 border border-danger/40 bg-panel px-2 py-1 text-[11px] text-danger">{error}</p> : null}
    </div>
  );
}
