import { useEffect, useRef, useState } from "react";
import { Compass, LayoutGrid, Sun } from "lucide-react";
import type { RoofLayout } from "@/lib/advisor-types";
import { loadMaps, type MapsNS } from "@/lib/maps-loader";
import { panelPath, panelsForSystem, rankedPanels, segmentAzimuth } from "@/lib/panel-geometry";
import { compassLabel } from "@/lib/solar-model";
import { cn } from "@/lib/utils";

type Shape = { setMap: (m: unknown) => void };

/**
 * Satellite view of the detected roof with the exact panels of the chosen
 * configuration drawn where they would physically be installed.
 */
export function PanelLayoutMap({
  layout,
  systemKw,
  height = 360,
  className,
}: {
  layout: RoofLayout;
  systemKw: number;
  height?: number;
  className?: string;
}) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const shapesRef = useRef<Shape[]>([]);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const chosen = panelsForSystem(layout, systemKw);

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !nodeRef.current) return;
        const g = (window as MapsNS).google;
        mapRef.current = new g.maps.Map(nodeRef.current, {
          center: { lat: layout.center.latitude, lng: layout.center.longitude },
          zoom: 20,
          mapTypeId: "satellite",
          tilt: 0,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "cooperative",
        });
        if (layout.box) {
          mapRef.current.fitBounds(
            {
              south: layout.box.sw.latitude,
              west: layout.box.sw.longitude,
              north: layout.box.ne.latitude,
              east: layout.box.ne.longitude,
            },
            24,
          );
        }
        setReady(true);
      })
      .catch((e: Error) => setError(e.message));
    return () => {
      cancelled = true;
    };
  }, [layout]);

  // draw roof outline + panels
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as MapsNS).google;
    shapesRef.current.forEach((s) => s.setMap(null));
    shapesRef.current = [];

    if (layout.box) {
      shapesRef.current.push(
        new g.maps.Rectangle({
          map: mapRef.current,
          bounds: {
            south: layout.box.sw.latitude,
            west: layout.box.sw.longitude,
            north: layout.box.ne.latitude,
            east: layout.box.ne.longitude,
          },
          strokeColor: "#ffffff",
          strokeOpacity: 0.55,
          strokeWeight: 1.5,
          fillOpacity: 0,
          clickable: false,
        }),
      );
    }

    const panels = rankedPanels(layout);
    const info = new g.maps.InfoWindow();
    panels.forEach((p, i) => {
      const selected = i < chosen;
      const poly = new g.maps.Polygon({
        map: mapRef.current,
        paths: panelPath(
          { lat: p.lat, lng: p.lng },
          layout.panelWidthMeters,
          layout.panelHeightMeters,
          p.portrait,
          segmentAzimuth(layout, p.segmentIndex),
        ),
        strokeColor: selected ? "#1c2b22" : "#e8f0ea",
        strokeOpacity: selected ? 0.9 : 0.45,
        strokeWeight: selected ? 1 : 0.8,
        fillColor: selected ? "#f5b301" : "#8fa8bd",
        fillOpacity: selected ? 0.92 : 0.22,
        zIndex: selected ? 3 : 1,
        clickable: true,
      });
      poly.addListener("click", () => {
        info.setContent(
          `<div style="font:500 12px system-ui;color:#1c2b22">${
            selected ? "Included panel" : "Spare roof capacity"
          }<br/>~${p.kwh.toLocaleString()} kWh/yr<br/>Facing ${compassLabel(
            segmentAzimuth(layout, p.segmentIndex),
          )}</div>`,
        );
        info.setPosition({ lat: p.lat, lng: p.lng });
        info.open(mapRef.current);
      });
      shapesRef.current.push(poly);
    });

    return () => {
      shapesRef.current.forEach((s) => s.setMap(null));
      shapesRef.current = [];
    };
  }, [ready, layout, chosen]);

  const bestSegment = layout.segments.slice().sort((a, b) => b.sunshineHours - a.sunshineHours)[0];

  return (
    <div className={cn("space-y-3", className)}>
      <div className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
        <div ref={nodeRef} style={{ height }} className="w-full bg-muted" role="application" aria-label="Roof panel layout" />
        {error ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/90 p-6 text-center text-sm text-muted-foreground">
            {error}
          </div>
        ) : null}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 flex flex-wrap gap-2 p-3">
          <span className="rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium shadow-soft">
            <span className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-[#f5b301] align-middle" />
            {chosen} panels installed
          </span>
          <span className="rounded-full bg-card/95 px-3 py-1.5 text-xs font-medium shadow-soft">
            <span className="mr-1.5 inline-block size-2.5 rounded-[3px] bg-[#8fa8bd]/50 align-middle" />
            {Math.max(0, layout.panels.length - chosen)} spare spots
          </span>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Fact icon={<LayoutGrid className="size-4 text-sun" />} label="Roof space used">
          {chosen} of {layout.maxPanels} possible panels
        </Fact>
        <Fact icon={<Compass className="size-4 text-sky" />} label="Best roof face">
          {bestSegment
            ? `${compassLabel(bestSegment.azimuthDegrees)} · ${Math.round(bestSegment.pitchDegrees)}° pitch`
            : "—"}
        </Fact>
        <Fact icon={<Sun className="size-4 text-sun" />} label="Sun on that face">
          {bestSegment ? `${bestSegment.sunshineHours.toLocaleString()} h/yr` : "—"}
        </Fact>
      </div>
      <p className="text-xs text-muted-foreground">
        Panel positions come from satellite roof modelling
        {layout.imageryYear ? ` (imagery ${layout.imageryYear}` : ""}
        {layout.imageryQuality ? `, ${layout.imageryQuality.toLowerCase()} detail)` : layout.imageryYear ? ")" : ""}.
        Tap any panel for its yearly output. Final placement is confirmed on site.
      </p>
    </div>
  );
}

function Fact({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card/70 p-3">
      <div className="flex items-center gap-2 text-xs text-muted-foreground">
        {icon}
        {label}
      </div>
      <p className="mt-1 text-sm font-medium">{children}</p>
    </div>
  );
}
