import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { RoofSegment, SiteData } from "./solar-model";

const GATEWAY = "https://connector-gateway.lovable.dev/google_maps";
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 14;

export type Fail = { ok: false; reason: "timeout" | "not_found" | "error"; message: string };

function keys() {
  const lovable = process.env["LOVABLE_API_KEY"];
  const maps = process.env["GOOGLE_MAPS_API_KEY"];
  if (!lovable || !maps) throw new Error("Google Maps connector credentials are not configured");
  return { lovable, maps };
}

/** Cached read-through wrapper: conserves the daily Google Maps gateway budget. */
async function cached<T>(cacheKey: string, load: () => Promise<T>): Promise<T> {
  try {
    const { data } = await supabaseAdmin
      .from("api_cache")
      .select("payload, created_at")
      .eq("cache_key", cacheKey)
      .maybeSingle();
    if (data && Date.now() - new Date(data.created_at).getTime() < CACHE_TTL_MS) {
      return data.payload as T;
    }
  } catch {
    /* cache is best-effort */
  }
  const fresh = await load();
  try {
    await supabaseAdmin
      .from("api_cache")
      .upsert({ cache_key: cacheKey, payload: fresh as never, created_at: new Date().toISOString() });
  } catch {
    /* ignore */
  }
  return fresh;
}

async function gatewayGet(path: string, timeoutMs = 9000): Promise<{ status: number; body: unknown }> {
  const { lovable, maps } = keys();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${GATEWAY}${path}`, {
      headers: { Authorization: `Bearer ${lovable}`, "X-Connection-Api-Key": maps },
      signal: controller.signal,
    });
    const text = await res.text();
    let body: unknown = null;
    try {
      body = JSON.parse(text);
    } catch {
      body = { raw: text.slice(0, 500) };
    }
    if (!res.ok) console.error(`Maps gateway ${res.status} for ${path}: ${text.slice(0, 400)}`);
    return { status: res.status, body };
  } finally {
    clearTimeout(timer);
  }
}

export type GeoResult = {
  lat: number;
  lng: number;
  address: string;
  partial: boolean;
};

export async function geocode(query: string, region?: string): Promise<GeoResult | Fail> {
  const key = `geo:${region ?? ""}:${query.toLowerCase()}`;
  try {
    return await cached<GeoResult | Fail>(key, async () => {
      const { status, body } = await gatewayGet(
        `/maps/api/geocode/json?address=${encodeURIComponent(query)}${region ? `&region=${region}` : ""}${
          region ? `&components=country:${region}` : ""
        }`,
      );
      if (status !== 200) return { ok: false, reason: "error", message: `Geocoding failed (${status})` };
      const data = body as {
        status: string;
        results?: Array<{
          formatted_address: string;
          partial_match?: boolean;
          geometry: { location: { lat: number; lng: number } };
        }>;
      };
      const hit = data.results?.[0];
      if (data.status !== "OK" || !hit) {
        return { ok: false, reason: "not_found", message: "No match for that code" };
      }
      return {
        lat: hit.geometry.location.lat,
        lng: hit.geometry.location.lng,
        address: hit.formatted_address,
        partial: Boolean(hit.partial_match),
      };
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "error", message: String(e) };
  }
}

export async function reverseGeocode(lat: number, lng: number): Promise<string | null> {
  const key = `rev:${lat.toFixed(5)},${lng.toFixed(5)}`;
  try {
    return await cached<string | null>(key, async () => {
      const { status, body } = await gatewayGet(
        `/maps/api/geocode/json?latlng=${lat.toFixed(6)},${lng.toFixed(6)}`,
      );
      if (status !== 200) return null;
      const data = body as { results?: Array<{ formatted_address: string }> };
      return data.results?.[0]?.formatted_address ?? null;
    });
  } catch {
    return null;
  }
}

type LatLng = { latitude: number; longitude: number };
type Box = { sw: LatLng; ne: LatLng };

export type BuildingInsights = {
  center: LatLng;
  boundingBox?: Box | undefined;
  imageryQuality?: string | undefined;
  imageryDate?: { year?: number; month?: number; day?: number } | undefined;
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    carbonOffsetFactorKgPerMwh?: number;
    panelCapacityWatts?: number;
    panelHeightMeters?: number | undefined;
    panelWidthMeters?: number | undefined;
    wholeRoofStats?: { areaMeters2?: number; sunshineQuantiles?: number[] };
    roofSegmentStats?: Array<{
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: { areaMeters2: number; sunshineQuantiles: number[] };
      center?: LatLng | undefined;
      boundingBox?: Box | undefined;
    }>;
    solarPanelConfigs?: Array<{ panelsCount: number; yearlyEnergyDcKwh: number }>;
    solarPanels?: Array<{
      center: LatLng;
      orientation?: "LANDSCAPE" | "PORTRAIT" | undefined;
      yearlyEnergyDcKwh: number;
      segmentIndex?: number | undefined;
    }>;
  };
};

const MAX_STORED_PANELS = 260;

/** The raw payload is multi-megabyte; keep only what the UI and model need. */
function trimInsights(raw: BuildingInsights): BuildingInsights {
  const sp = raw.solarPotential;
  if (!sp) return { center: raw.center, boundingBox: raw.boundingBox, imageryQuality: raw.imageryQuality };
  const panels = (sp.solarPanels ?? [])
    .slice(0, MAX_STORED_PANELS)
    .map((p) => ({
      center: {
        latitude: Number(p.center.latitude.toFixed(7)),
        longitude: Number(p.center.longitude.toFixed(7)),
      },
      orientation: p.orientation,
      yearlyEnergyDcKwh: Math.round(p.yearlyEnergyDcKwh),
      segmentIndex: p.segmentIndex,
    }));
  const configs = sp.solarPanelConfigs ?? [];
  return {
    center: raw.center,
    boundingBox: raw.boundingBox,
    imageryQuality: raw.imageryQuality,
    imageryDate: raw.imageryDate,
    solarPotential: {
      maxArrayPanelsCount: sp.maxArrayPanelsCount,
      maxArrayAreaMeters2: sp.maxArrayAreaMeters2,
      maxSunshineHoursPerYear: sp.maxSunshineHoursPerYear,
      carbonOffsetFactorKgPerMwh: sp.carbonOffsetFactorKgPerMwh,
      panelCapacityWatts: sp.panelCapacityWatts,
      panelHeightMeters: sp.panelHeightMeters,
      panelWidthMeters: sp.panelWidthMeters,
      wholeRoofStats: sp.wholeRoofStats,
      roofSegmentStats: (sp.roofSegmentStats ?? []).slice(0, 12),
      solarPanelConfigs: configs.length > 40 ? configs.filter((_, i) => i % 4 === 0).concat(configs.at(-1)!) : configs,
      solarPanels: panels,
    },
  };
}

export async function buildingInsights(lat: number, lng: number): Promise<BuildingInsights | Fail> {
  const key = `solar2:${lat.toFixed(5)},${lng.toFixed(5)}`;
  try {
    return await cached<BuildingInsights | Fail>(key, async () => {
      const { status, body } = await gatewayGet(
        `/solar/v1/buildingInsights:findClosest?location.latitude=${lat.toFixed(
          6,
        )}&location.longitude=${lng.toFixed(6)}`,
        12000,
      );
      if (status === 404) return { ok: false, reason: "not_found", message: "No building found nearby" };
      if (status !== 200) return { ok: false, reason: "error", message: `Solar API error (${status})` };
      return trimInsights(body as BuildingInsights);
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "error", message: String(e) };
  }
}

export type RoofLayout = {
  center: LatLng;
  box: Box | null;
  panelWidthMeters: number;
  panelHeightMeters: number;
  panelCapacityWatts: number;
  imageryQuality: string | null;
  imageryYear: number | null;
  maxPanels: number;
  segments: Array<{
    index: number;
    azimuthDegrees: number;
    pitchDegrees: number;
    areaMeters2: number;
    sunshineHours: number;
    center: LatLng | null;
    box: Box | null;
  }>;
  panels: Array<{
    lat: number;
    lng: number;
    portrait: boolean;
    kwh: number;
    segmentIndex: number;
  }>;
};

/** Panel-level placement geometry for the map overlay. Null when no building was detected. */
export function roofLayoutFrom(insights: BuildingInsights | null): RoofLayout | null {
  const sp = insights?.solarPotential;
  if (!insights || !sp || !(sp.solarPanels?.length ?? 0)) return null;
  const segments = (sp.roofSegmentStats ?? []).map((s, index) => ({
    index,
    azimuthDegrees: s.azimuthDegrees,
    pitchDegrees: s.pitchDegrees,
    areaMeters2: Math.round(s.stats.areaMeters2),
    sunshineHours: Math.round(median(s.stats.sunshineQuantiles ?? [])),
    center: s.center ?? null,
    box: s.boundingBox ?? null,
  }));
  return {
    center: insights.center,
    box: insights.boundingBox ?? null,
    panelWidthMeters: sp.panelWidthMeters ?? 1.045,
    panelHeightMeters: sp.panelHeightMeters ?? 1.879,
    panelCapacityWatts: sp.panelCapacityWatts ?? 400,
    imageryQuality: insights.imageryQuality ?? null,
    imageryYear: insights.imageryDate?.year ?? null,
    maxPanels: sp.maxArrayPanelsCount ?? sp.solarPanels!.length,
    segments,
    panels: sp.solarPanels!.map((p) => ({
      lat: p.center.latitude,
      lng: p.center.longitude,
      portrait: p.orientation === "PORTRAIT",
      kwh: Math.round(p.yearlyEnergyDcKwh),
      segmentIndex: p.segmentIndex ?? 0,
    })),
  };
}

/** Distance in metres between two coordinates. */
export function haversine(aLat: number, aLng: number, bLat: number, bLng: number): number {
  const R = 6371000;
  const dLat = ((bLat - aLat) * Math.PI) / 180;
  const dLng = ((bLng - aLng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((aLat * Math.PI) / 180) * Math.cos((bLat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(s));
}

/** Secondary output model: public PVWatts v8 (DEMO_KEY, no signup). */
export async function pvwattsYieldPerKw(
  lat: number,
  lng: number,
  tilt: number,
  azimuth: number,
): Promise<number | null> {
  const key = `pvw:${lat.toFixed(2)},${lng.toFixed(2)},${Math.round(tilt)},${Math.round(azimuth)}`;
  try {
    return await cached<number | null>(key, async () => {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      try {
        const url =
          `https://developer.nrel.gov/api/pvwatts/v8.json?api_key=DEMO_KEY&system_capacity=1` +
          `&module_type=0&losses=14&array_type=1&tilt=${tilt.toFixed(1)}&azimuth=${azimuth.toFixed(1)}` +
          `&lat=${lat.toFixed(4)}&lon=${lng.toFixed(4)}`;
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return null;
        const data = (await res.json()) as { outputs?: { ac_annual?: number } };
        const annual = data.outputs?.ac_annual;
        return typeof annual === "number" && annual > 0 ? annual : null;
      } finally {
        clearTimeout(timer);
      }
    });
  } catch {
    return null;
  }
}

/** Crude climatological fallback when both data sources are unavailable. */
export function climateYieldPerKw(lat: number): number {
  const a = Math.abs(lat);
  return Math.round(1750 - Math.max(0, a - 12) * 13 - Math.max(0, a - 45) * 8);
}

function median(values: number[]): number {
  if (!values.length) return 0;
  const s = [...values].sort((x, y) => x - y);
  const mid = Math.floor(s.length / 2);
  const lo = s[mid - 1] ?? s[mid] ?? 0;
  const hi = s[mid] ?? 0;
  return s.length % 2 ? hi : (lo + hi) / 2;
}

/**
 * Merges Solar API rooftop data, PVWatts modelling and climate fallbacks into
 * one SiteData object, degrading gracefully at every step.
 */
export async function buildSiteData(
  lat: number,
  lng: number,
  optimalTiltDeg: number,
  optimalAzimuthDeg: number,
): Promise<{ site: SiteData; insights: BuildingInsights | null; failure: Fail | null }> {
  const [insightsRaw, pvw] = await Promise.all([
    buildingInsights(lat, lng),
    pvwattsYieldPerKw(lat, lng, optimalTiltDeg, optimalAzimuthDeg),
  ]);

  const failure = "ok" in insightsRaw ? (insightsRaw as Fail) : null;
  const insights = failure ? null : (insightsRaw as BuildingInsights);
  const notes: string[] = [];

  let segments: RoofSegment[] = [];
  let shadeFactor = 0.85;
  let maxSystemKw = 5;
  let panelCapacityWatts = 400;
  let carbon = 400;
  let baselineYieldPerKw = pvw ?? climateYieldPerKw(lat);
  let yieldSource: SiteData["yieldSource"] = pvw ? "pvwatts" : "estimate";
  let confidence = pvw ? 0.68 : 0.5;
  let hasSolarApi = false;

  if (insights?.solarPotential) {
    const sp = insights.solarPotential;
    hasSolarApi = true;
    panelCapacityWatts = sp.panelCapacityWatts ?? 400;
    carbon = sp.carbonOffsetFactorKgPerMwh ?? 400;
    maxSystemKw = Math.max(
      1.5,
      Math.round((((sp.maxArrayPanelsCount ?? 12) * panelCapacityWatts) / 1000) * 10) / 10,
    );
    // Residential sanity cap — huge commercial roofs shouldn't drive a home quote.
    maxSystemKw = Math.min(maxSystemKw, 20);

    segments = (sp.roofSegmentStats ?? []).slice(0, 6).map((s) => ({
      pitchDegrees: s.pitchDegrees,
      azimuthDegrees: s.azimuthDegrees,
      areaMeters2: s.stats.areaMeters2,
      sunshineHours: median(s.stats.sunshineQuantiles ?? []),
    }));

    const maxSun = sp.maxSunshineHoursPerYear ?? 0;
    const roofSun = median(sp.wholeRoofStats?.sunshineQuantiles ?? []);
    if (maxSun > 0 && roofSun > 0) {
      shadeFactor = Math.min(1, Math.max(0.35, roofSun / maxSun));
    }

    const best = sp.solarPanelConfigs?.[(sp.solarPanelConfigs?.length ?? 1) - 1];
    if (best && best.panelsCount > 0) {
      const kw = (best.panelsCount * panelCapacityWatts) / 1000;
      const acYield = (best.yearlyEnergyDcKwh / kw) * 0.86; // DC → AC
      // Solar API already accounts for shading, so divide it back out of the baseline.
      baselineYieldPerKw = Math.round(acYield / shadeFactor);
      yieldSource = "solar-api";
      confidence = insights.imageryQuality === "HIGH" ? 0.92 : insights.imageryQuality === "MEDIUM" ? 0.82 : 0.7;
      if (pvw) {
        // blend with the secondary source when they disagree strongly
        const ratio = baselineYieldPerKw / pvw;
        if (ratio > 1.4 || ratio < 0.6) {
          baselineYieldPerKw = Math.round((baselineYieldPerKw + pvw) / 2);
          confidence = Math.min(confidence, 0.72);
          notes.push("sources-disagree");
        }
      }
    }
  } else {
    notes.push("no-solar-api");
    if (failure?.reason === "timeout") notes.push("timeout");
  }

  if (!pvw) notes.push("no-pvwatts");

  const dataQuality: SiteData["dataQuality"] = confidence >= 0.8 ? "high" : confidence >= 0.5 ? "medium" : "low";

  const site: SiteData = {
    lat,
    lng,
    baselineYieldPerKw: Math.max(500, Math.min(2200, baselineYieldPerKw)),
    yieldSource,
    maxSystemKw,
    segments,
    shadeFactor,
    confidence,
    dataQuality,
    imageryQuality: insights?.imageryQuality,
    panelCapacityWatts,
    carbonOffsetKgPerMwh: carbon,
    hasSolarApi,
    notes,
  };

  return { site, insights, failure };
}

/* ---------------------------------- AI ---------------------------------- */

const AI_URL = "https://ai.gateway.lovable.dev/v1/chat/completions";

export async function aiChat(
  messages: Array<{ role: "system" | "user" | "assistant"; content: string }>,
  opts: { model?: string; maxTokens?: number } = {},
): Promise<{ ok: true; text: string } | { ok: false; status: number; message: string }> {
  const apiKey = process.env["LOVABLE_API_KEY"];
  if (!apiKey) return { ok: false, status: 401, message: "AI is not configured for this project." };
  try {
    const res = await fetch(AI_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
        "X-Lovable-AIG-SDK": "fetch",
      },
      body: JSON.stringify({
        model: opts.model ?? "google/gemini-2.5-flash",
        messages,
        max_tokens: opts.maxTokens ?? 500,
      }),
    });
    const text = await res.text();
    if (!res.ok) {
      console.error(`AI gateway ${res.status}: ${text.slice(0, 300)}`);
      let message = "The assistant is unavailable right now.";
      if (res.status === 429) message = "Too many requests right now — please try again in a moment.";
      if (res.status === 402) message = "AI credits are exhausted for this workspace.";
      if (res.status === 403) message = "AI access is blocked for this workspace.";
      return { ok: false, status: res.status, message };
    }
    const data = JSON.parse(text) as { choices?: Array<{ message?: { content?: string } }> };
    return { ok: true, text: data.choices?.[0]?.message?.content?.trim() ?? "" };
  } catch (e) {
    console.error("AI gateway request failed", e);
    return { ok: false, status: 500, message: "The assistant could not be reached." };
  }
}
