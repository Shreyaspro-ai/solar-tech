import type { RoofLayout } from "./advisor-types";

export type LatLngLiteral = { lat: number; lng: number };

const M_PER_DEG_LAT = 111320;

/**
 * Corner path of one rooftop panel, rotated to match the roof segment it sits on.
 * Google returns panel centres only, so the rectangle is reconstructed locally.
 */
export function panelPath(
  center: LatLngLiteral,
  widthMeters: number,
  heightMeters: number,
  portrait: boolean,
  azimuthDeg: number,
): LatLngLiteral[] {
  const [w, h] = portrait ? [widthMeters, heightMeters] : [heightMeters, widthMeters];
  const rad = (azimuthDeg * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const mPerDegLng = M_PER_DEG_LAT * Math.max(0.15, Math.cos((center.lat * Math.PI) / 180));

  const corners: Array<[number, number]> = [
    [-w / 2, -h / 2],
    [w / 2, -h / 2],
    [w / 2, h / 2],
    [-w / 2, h / 2],
  ];

  return corners.map(([x, y]) => {
    const east = x * cos + y * sin;
    const north = -x * sin + y * cos;
    return { lat: center.lat + north / M_PER_DEG_LAT, lng: center.lng + east / mPerDegLng };
  });
}

/** How many Solar-API panels a given system size corresponds to. */
export function panelsForSystem(layout: RoofLayout | null, systemKw: number): number {
  if (!layout) return 0;
  const perPanelKw = layout.panelCapacityWatts / 1000;
  const wanted = Math.max(1, Math.round(systemKw / perPanelKw));
  return Math.min(wanted, layout.panels.length);
}

export function segmentAzimuth(layout: RoofLayout, segmentIndex: number): number {
  return layout.segments.find((s) => s.index === segmentIndex)?.azimuthDegrees ?? 180;
}

/** Panels are returned best-first by Google; keep that ranking explicit. */
export function rankedPanels(layout: RoofLayout) {
  return layout.panels.slice().sort((a, b) => b.kwh - a.kwh);
}
