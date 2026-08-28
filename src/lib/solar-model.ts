/**
 * Deterministic photovoltaic model shared by the server (analysis) and the
 * client (live tilt/azimuth slider). Pure functions only — no I/O.
 */

export type RoofSegment = {
  pitchDegrees: number;
  azimuthDegrees: number;
  areaMeters2: number;
  /** median annual sunshine hours on the segment */
  sunshineHours: number;
};

export type SiteData = {
  lat: number;
  lng: number;
  /** kWh produced per kW installed per year at an optimal orientation */
  baselineYieldPerKw: number;
  /** where the baseline came from */
  yieldSource: "solar-api" | "pvwatts" | "estimate";
  maxSystemKw: number;
  segments: RoofSegment[];
  /** 0..1 — how much of the roof is unshaded, from Solar API sunshine stats */
  shadeFactor: number;
  /** 0..1 — confidence in the underlying data */
  confidence: number;
  dataQuality: "high" | "medium" | "low";
  imageryQuality?: string;
  panelCapacityWatts: number;
  carbonOffsetKgPerMwh: number;
  hasSolarApi: boolean;
  notes: string[];
};

export type Economics = {
  costPerKw: number;
  tariff: number;
  currency: string;
  fx: number;
};

export type ConfigResult = {
  tilt: number;
  azimuth: number;
  systemKw: number;
  panels: number;
  annualKwh: number;
  monthlyKwh: number[];
  costUsd: number;
  annualSavingsUsd: number;
  paybackYears: number;
  lifetimeSavingsUsd: number;
  co2TonsPerYear: number;
  efficiency: number;
  score: number;
};

const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rad = (d: number) => (d * Math.PI) / 180;

/** Optimal fixed tilt for a latitude (degrees). */
export function optimalTilt(lat: number): number {
  return clamp(Math.round(Math.abs(lat) * 0.76 + 3.1), 5, 40);
}

/** Optimal azimuth: 180 (south) in the northern hemisphere, 0 (north) in the southern. */
export function optimalAzimuth(lat: number): number {
  return lat >= 0 ? 180 : 0;
}

function azimuthDelta(a: number, b: number): number {
  const d = Math.abs(((a - b + 540) % 360) - 180);
  return d;
}

/**
 * Relative output factor (0..1) of a tilt/azimuth pair versus the optimal
 * orientation at this latitude.
 */
export function orientationFactor(tilt: number, azimuth: number, lat: number): number {
  const dTilt = Math.abs(tilt - optimalTilt(lat));
  const dAz = azimuthDelta(azimuth, optimalAzimuth(lat));
  const tiltLoss = 1 - 0.00028 * dTilt * dTilt;
  const azWeight = 0.16 + 0.55 * Math.sin(rad(clamp(tilt, 0, 60)));
  const azLoss = 1 - azWeight * Math.pow(dAz / 180, 1.7);
  return clamp(tiltLoss * azLoss, 0.25, 1);
}

/** Annual AC output in kWh for a configuration. */
export function annualOutput(site: SiteData, tilt: number, azimuth: number, systemKw: number): number {
  const f = orientationFactor(tilt, azimuth, site.lat);
  return site.baselineYieldPerKw * systemKw * f * site.shadeFactor;
}

/** Seasonal monthly split derived from latitude and tilt (sums to the annual value). */
export function monthlySplit(annual: number, lat: number, tilt: number): number[] {
  const south = lat < 0;
  const amp = clamp(0.1 + Math.abs(lat) / 130, 0.08, 0.45) * (1 - clamp(tilt, 0, 60) / 220);
  const raw = Array.from({ length: 12 }, (_, i) => {
    const phase = ((i + 0.5) / 12) * 2 * Math.PI - (south ? 0 : Math.PI);
    return 1 + amp * Math.cos(phase);
  });
  const sum = raw.reduce((a, b) => a + b, 0);
  return raw.map((v) => (v / sum) * annual);
}

export function evaluate(
  site: SiteData,
  eco: Economics,
  tilt: number,
  azimuth: number,
  systemKw: number,
): ConfigResult {
  const annual = annualOutput(site, tilt, azimuth, systemKw);
  // small-system price premium, large-system discount
  const scaleFactor = clamp(1.25 - 0.05 * systemKw, 0.82, 1.25);
  const cost = systemKw * eco.costPerKw * scaleFactor;
  const savings = annual * eco.tariff;
  const payback = savings > 0 ? cost / savings : 99;
  const efficiency = cost > 0 ? annual / cost : 0;
  const panels = Math.max(1, Math.round((systemKw * 1000) / site.panelCapacityWatts));
  return {
    tilt: Math.round(tilt),
    azimuth: Math.round(azimuth),
    systemKw: Math.round(systemKw * 10) / 10,
    panels,
    annualKwh: Math.round(annual),
    monthlyKwh: monthlySplit(annual, site.lat, tilt).map((v) => Math.round(v)),
    costUsd: Math.round(cost),
    annualSavingsUsd: Math.round(savings),
    paybackYears: Math.round(clamp(payback, 0.5, 99) * 10) / 10,
    lifetimeSavingsUsd: Math.round(savings * 25 * 0.92 - cost),
    co2TonsPerYear: Math.round(((annual / 1000) * site.carbonOffsetKgPerMwh) / 10) / 100,
    efficiency,
    score: 0,
  };
}

export type Candidate = ConfigResult & { label: "budget" | "balanced" | "max"; rank: number };

/**
 * Generates 6-10 tilt/azimuth candidates for the site, scores them
 * deterministically (output per unit cost, weighted by shading/data
 * confidence) and returns the ranked list plus three archetype configs.
 */
export function buildCandidates(site: SiteData, eco: Economics) {
  const optT = optimalTilt(site.lat);
  const optA = optimalAzimuth(site.lat);

  // Prefer real roof planes when the Solar API gave us geometry.
  const roofPairs = site.segments
    .slice(0, 4)
    .map((s) => ({ tilt: clamp(Math.round(s.pitchDegrees), 0, 60), azimuth: Math.round(s.azimuthDegrees) }));

  const generic = [
    { tilt: optT, azimuth: optA },
    { tilt: clamp(optT - 10, 3, 60), azimuth: optA },
    { tilt: clamp(optT + 10, 3, 60), azimuth: optA },
    { tilt: optT, azimuth: (optA + 40) % 360 },
    { tilt: optT, azimuth: (optA + 320) % 360 },
    { tilt: 15, azimuth: optA },
  ];

  const seen = new Set<string>();
  const pairs = [...roofPairs, ...generic].filter((p) => {
    const k = `${p.tilt}|${p.azimuth}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  const sizes: Array<{ label: Candidate["label"]; kw: number }> = [
    { label: "budget", kw: Math.max(1.5, Math.round(site.maxSystemKw * 0.35 * 10) / 10) },
    { label: "balanced", kw: Math.max(2.5, Math.round(site.maxSystemKw * 0.65 * 10) / 10) },
    { label: "max", kw: Math.max(3.5, Math.round(site.maxSystemKw * 10) / 10) },
  ];

  const all: Candidate[] = [];
  for (const size of sizes) {
    for (const p of pairs) {
      const r = evaluate(site, eco, p.tilt, p.azimuth, size.kw);
      all.push({ ...r, label: size.label, rank: 0 });
    }
  }

  const maxEff = Math.max(...all.map((c) => c.efficiency)) || 1;
  const maxAnnual = Math.max(...all.map((c) => c.annualKwh)) || 1;
  for (const c of all) {
    const effScore = c.efficiency / maxEff;
    const outScore = c.annualKwh / maxAnnual;
    // output-per-cost dominates, weighted by shading + data confidence
    c.score = Math.round(
      100 * (0.6 * effScore + 0.4 * outScore) * (0.72 + 0.18 * site.shadeFactor + 0.1 * site.confidence),
    );
  }
  all.sort((a, b) => b.score - a.score);
  all.forEach((c, i) => (c.rank = i + 1));

  const pick = (label: Candidate["label"]) =>
    all.filter((c) => c.label === label).sort((a, b) => b.score - a.score)[0];

  const configs = [pick("budget"), pick("balanced"), pick("max")].filter(Boolean) as Candidate[];
  const recommended = configs.slice().sort((a, b) => b.score - a.score)[0];

  return {
    candidates: all.slice(0, 10),
    configs,
    recommendedLabel: recommended ? recommended.label : ("balanced" as Candidate["label"]),
  };
}

/** Overall 0-100 suitability score for the location. */
export function suitabilityScore(site: SiteData, best: ConfigResult): number {
  const yieldScore = clamp((site.baselineYieldPerKw - 700) / 1000, 0, 1); // 700→1700 kWh/kW
  const shadeScore = clamp((site.shadeFactor - 0.45) / 0.5, 0, 1);
  const paybackScore = clamp((16 - best.paybackYears) / 12, 0, 1);
  const roofScore = clamp(site.maxSystemKw / 6, 0, 1);
  const raw = 100 * (0.32 * yieldScore + 0.24 * shadeScore + 0.31 * paybackScore + 0.13 * roofScore);
  // never overstate certainty the data doesn't support
  const damped = site.confidence < 0.6 ? 50 + (raw - 50) * 0.85 : raw;
  return Math.round(clamp(damped, 3, 98));
}

export function scoreBand(score: number): "low" | "mid" | "high" {
  if (score <= 40) return "low";
  if (score <= 70) return "mid";
  return "high";
}

export function compassLabel(azimuth: number): string {
  const dirs = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"];
  return dirs[Math.round((((azimuth % 360) + 360) % 360) / 45) % 8] ?? "N";
}
