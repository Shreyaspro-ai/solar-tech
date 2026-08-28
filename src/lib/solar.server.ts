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

export type BuildingInsights = {
  center: { latitude: number; longitude: number };
  boundingBox?: { sw: { latitude: number; longitude: number }; ne: { latitude: number; longitude: number } };
  imageryQuality?: string;
  solarPotential?: {
    maxArrayPanelsCount?: number;
    maxArrayAreaMeters2?: number;
    maxSunshineHoursPerYear?: number;
    carbonOffsetFactorKgPerMwh?: number;
    panelCapacityWatts?: number;
    wholeRoofStats?: { areaMeters2?: number; sunshineQuantiles?: number[] };
    roofSegmentStats?: Array<{
      pitchDegrees: number;
      azimuthDegrees: number;
      stats: { areaMeters2: number; sunshineQuantiles: number[] };
    }>;
    solarPanelConfigs?: Array<{ panelsCount: number; yearlyEnergyDcKwh: number }>;
  };
};

export async function buildingInsights(lat: number, lng: number): Promise<BuildingInsights | Fail> {
  const key = `solar:${lat.toFixed(5)},${lng.toFixed(5)}`;
  try {
    return await cached<BuildingInsights | Fail>(key, async () => {
      const { status, body } = await gatewayGet(
        `/solar/v1/buildingInsights:findClosest?location.latitude=${lat.toFixed(
          6,
        )}&location.longitude=${lng.toFixed(6)}`,
        10000,
      );
      if (status === 404) return { ok: false, reason: "not_found", message: "No building found nearby" };
      if (status !== 200) return { ok: false, reason: "error", message: `Solar API error (${status})` };
      return body as BuildingInsights;
    });
  } catch (e) {
    const aborted = e instanceof Error && e.name === "AbortError";
    return { ok: false, reason: aborted ? "timeout" : "error", message: String(e) };
  }
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
  let confidence = pvw ? 0.55 : 0.35;
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
      confidence = insights.imageryQuality === "HIGH" ? 0.92 : insights.imageryQuality === "MEDIUM" ? 0.75 : 0.6;
      if (pvw) {
        // blend with the secondary source when they disagree strongly
        const ratio = baselineYieldPerKw / pvw;
        if (ratio > 1.4 || ratio < 0.6) {
          baselineYieldPerKw = Math.round((baselineYieldPerKw + pvw) / 2);
          confidence = Math.min(confidence, 0.7);
          notes.push("sources-disagree");
        }
      }
    }
  } else {
    notes.push("no-solar-api");
    if (failure?.reason === "timeout") notes.push("timeout");
  }

  if (!pvw) notes.push("no-pvwatts");

  const dataQuality: SiteData["dataQuality"] = confidence >= 0.8 ? "high" : confidence >= 0.55 ? "medium" : "low";

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
