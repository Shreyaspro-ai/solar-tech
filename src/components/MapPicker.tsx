import { useCallback, useEffect, useRef, useState } from "react";
import { Crosshair, Loader2, MapPin, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { loadMaps, type MapsNS } from "@/lib/maps-loader";
import { panelPath, rankedPanels, segmentAzimuth } from "@/lib/panel-geometry";
import type { RoofLayout } from "@/lib/advisor-types";
import { scoreBand } from "@/lib/solar-model";
import { cn } from "@/lib/utils";

const MIN_PIN_ZOOM = 18;

export type PinPreview = {
  score: number;
  dataQuality: "high" | "medium" | "low";
  hasBuilding: boolean;
  distanceToBuilding: number | null;
  buildingCenter: { latitude: number; longitude: number } | null;
  buildingBox: { sw: { latitude: number; longitude: number }; ne: { latitude: number; longitude: number } } | null;
  roofLayout: RoofLayout | null;
};

export function MapPicker({
  center,
  onPin,
  pin,
  preview,
  previewLoading,
  previewError,
  highlightAzimuth,
}: {
  center: { lat: number; lng: number } | null;
  pin: { lat: number; lng: number } | null;
  onPin: (coords: { lat: number; lng: number }) => void;
  preview: PinPreview | null;
  previewLoading: boolean;
  previewError: string | null;
  highlightAzimuth?: number | null;
}) {
  const { t } = useI18n();
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<any>(null);
  const markerRef = useRef<any>(null);
  const outlineRef = useRef<any>(null);
  const panelShapesRef = useRef<any[]>([]);
  const rayRef = useRef<any>(null);
  const [ready, setReady] = useState(false);
  const [zoom, setZoom] = useState(17);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [gpsBusy, setGpsBusy] = useState(false);
  const [gpsError, setGpsError] = useState<string | null>(null);

  const onPinRef = useRef(onPin);
  onPinRef.current = onPin;

  useEffect(() => {
    let cancelled = false;
    loadMaps()
      .then(() => {
        if (cancelled || !nodeRef.current) return;
        const g = (window as MapsNS).google;
        const start = center ?? { lat: 20, lng: 0 };
        const map = new g.maps.Map(nodeRef.current, {
          center: start,
          zoom: center ? 19 : 3,
          mapTypeId: "hybrid",
          tilt: 0,
          disableDefaultUI: true,
          zoomControl: true,
          gestureHandling: "greedy",
          styles: [
            { elementType: "labels.text.fill", stylers: [{ color: "#f6efdf" }] },
            { elementType: "labels.text.stroke", stylers: [{ color: "#1d2b21" }, { weight: 2 }] },
            { featureType: "poi", stylers: [{ visibility: "off" }] },
            { featureType: "transit", stylers: [{ visibility: "off" }] },
            { featureType: "road", elementType: "labels", stylers: [{ visibility: "simplified" }] },
          ],
        });
        map.addListener("zoom_changed", () => setZoom(map.getZoom() ?? 17));
        map.addListener("click", (e: any) => {
          if ((map.getZoom() ?? 0) < MIN_PIN_ZOOM) return;
          const lat = e.latLng?.lat();
          const lng = e.latLng?.lng();
          if (typeof lat === "number" && typeof lng === "number") onPinRef.current({ lat, lng });
        });
        mapRef.current = map;
        setZoom(map.getZoom() ?? 17);
        setReady(true);
      })
      .catch((e: Error) => setLoadError(e.message));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recentre when an external location resolves
  useEffect(() => {
    if (!ready || !center || !mapRef.current) return;
    mapRef.current.setCenter(center);
    if ((mapRef.current.getZoom() ?? 0) < MIN_PIN_ZOOM) mapRef.current.setZoom(19);
  }, [ready, center]);

  // marker
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as MapsNS).google;
    if (!pin) {
      markerRef.current?.setMap(null);
      markerRef.current = null;
      return;
    }
    if (!markerRef.current) {
      markerRef.current = new g.maps.Marker({
        map: mapRef.current,
        position: pin,
        icon: {
          path: g.maps.SymbolPath.CIRCLE,
          scale: 9,
          fillColor: "#f0b429",
          fillOpacity: 1,
          strokeColor: "#2f4f3a",
          strokeWeight: 3,
        },
      });
    } else {
      markerRef.current.setPosition(pin);
    }
  }, [ready, pin]);

  // building outline
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as MapsNS).google;
    outlineRef.current?.setMap(null);
    outlineRef.current = null;
    const box = preview?.buildingBox;
    if (!box) return;
    outlineRef.current = new g.maps.Rectangle({
      map: mapRef.current,
      bounds: {
        south: box.sw.latitude,
        west: box.sw.longitude,
        north: box.ne.latitude,
        east: box.ne.longitude,
      },
      strokeColor: "#f0b429",
      strokeOpacity: 0.95,
      strokeWeight: 2,
      fillColor: "#f0b429",
      fillOpacity: 0.16,
      clickable: false,
    });
  }, [ready, preview]);

  // detected panel placement overlay
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as MapsNS).google;
    panelShapesRef.current.forEach((s) => s.setMap(null));
    panelShapesRef.current = [];
    const layout = preview?.roofLayout;
    if (!layout) return;
    rankedPanels(layout)
      .slice(0, 160)
      .forEach((p, i) => {
        panelShapesRef.current.push(
          new g.maps.Polygon({
            map: mapRef.current,
            paths: panelPath(
              { lat: p.lat, lng: p.lng },
              layout.panelWidthMeters,
              layout.panelHeightMeters,
              p.portrait,
              segmentAzimuth(layout, p.segmentIndex),
            ),
            strokeColor: "#1c2b22",
            strokeOpacity: 0.7,
            strokeWeight: 0.8,
            fillColor: i < 24 ? "#f5b301" : "#f5b301",
            fillOpacity: i < 24 ? 0.9 : 0.45,
            clickable: false,
            zIndex: 2,
          }),
        );
      });
    return () => {
      panelShapesRef.current.forEach((s) => s.setMap(null));
      panelShapesRef.current = [];
    };
  }, [ready, preview]);

  // orientation ray for the applied configuration
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    const g = (window as MapsNS).google;
    rayRef.current?.setMap(null);
    rayRef.current = null;
    if (highlightAzimuth == null || !pin) return;
    const rad = (highlightAzimuth * Math.PI) / 180;
    const d = 0.00035;
    rayRef.current = new g.maps.Polyline({
      map: mapRef.current,
      path: [pin, { lat: pin.lat + d * Math.cos(rad), lng: pin.lng + d * Math.sin(rad) }],
      strokeColor: "#2f6f4f",
      strokeOpacity: 0.95,
      strokeWeight: 5,
      icons: [{ icon: { path: (window as MapsNS).google.maps.SymbolPath.FORWARD_CLOSED_ARROW }, offset: "100%" }],
    });
    void g;
  }, [ready, highlightAzimuth, pin]);

  const useGps = useCallback(() => {
    setGpsError(null);
    if (!("geolocation" in navigator)) {
      setGpsError(t("gpsError"));
      return;
    }
    setGpsBusy(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGpsBusy(false);
        const coords = { lat: pos.coords.latitude, lng: pos.coords.longitude };
        mapRef.current?.setCenter(coords);
        mapRef.current?.setZoom(20);
        onPinRef.current(coords);
      },
      () => {
        setGpsBusy(false);
        setGpsError(t("gpsError"));
      },
      { enableHighAccuracy: true, timeout: 10000 },
    );
  }, [t]);

  const zoomLocked = zoom < MIN_PIN_ZOOM;
  const band = preview ? scoreBand(preview.score) : null;

  return (
    <div className="space-y-3">
      <div className="relative overflow-hidden rounded-2xl border border-border shadow-soft">
        <div ref={nodeRef} className="h-[340px] w-full bg-muted sm:h-[420px]" role="application" aria-label="Map" />

        {loadError ? (
          <div className="absolute inset-0 flex items-center justify-center bg-card/90 p-6 text-center text-sm text-muted-foreground">
            {loadError}
          </div>
        ) : null}

        <div className="pointer-events-none absolute inset-x-0 top-0 flex justify-center p-3">
          <span className="pointer-events-auto rounded-full bg-card/90 px-3 py-1.5 text-xs font-medium shadow-soft">
            {zoomLocked ? t("mapZoomHint") : t("mapDropHint")}
          </span>
        </div>

        <div className="absolute bottom-3 left-3 flex flex-col gap-2 rtl:left-auto rtl:right-3">
          <Button
            type="button"
            size="sm"
            variant="secondary"
            className="gap-2 shadow-soft"
            onClick={useGps}
            disabled={gpsBusy}
          >
            {gpsBusy ? <Loader2 className="size-4 animate-spin" /> : <Crosshair className="size-4" />}
            {t("useGps")}
          </Button>
          {gpsError ? <span className="text-xs text-destructive">{gpsError}</span> : null}
        </div>

        {pin ? (
          <div className="absolute bottom-3 right-3 rtl:left-3 rtl:right-auto">
            {previewLoading ? (
              <span className="flex items-center gap-2 rounded-full bg-card/90 px-3 py-1.5 text-xs shadow-soft">
                <Loader2 className="size-3.5 animate-spin" /> {t("scorePreview")}
              </span>
            ) : preview ? (
              <div className="flex items-center gap-2 rounded-full bg-card/95 px-3 py-1.5 shadow-soft">
                <span
                  className={cn(
                    "text-display text-lg leading-none",
                    band === "high" && "text-score-high",
                    band === "mid" && "text-score-mid",
                    band === "low" && "text-score-low",
                  )}
                >
                  {preview.score}
                </span>
                <span className="text-[11px] leading-tight text-muted-foreground">{t("scorePreview")}</span>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      {previewError ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card/70 p-3 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-score-mid" aria-hidden />
          {previewError}
        </p>
      ) : preview && !preview.hasBuilding ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card/70 p-3 text-sm text-muted-foreground">
          <TriangleAlert className="mt-0.5 size-4 shrink-0 text-score-mid" aria-hidden />
          {t("noBuilding")}
        </p>
      ) : preview?.hasBuilding ? (
        <p className="flex items-start gap-2 rounded-xl border border-border bg-card/70 p-3 text-sm text-muted-foreground">
          <MapPin className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden />
          <span>
            {t("buildingFound")}
            {preview.roofLayout
              ? ` Roof detected — room for about ${preview.roofLayout.maxPanels} panels; the amber tiles show where they would sit.`
              : ""}
          </span>
        </p>
      ) : null}
    </div>
  );
}
