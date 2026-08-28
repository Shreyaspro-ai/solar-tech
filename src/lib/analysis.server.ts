import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { DEFAULT_COUNTRY, getCountry } from "./countries";
import { languageName, type LangCode } from "./locales";
import {
  buildCandidates,
  compassLabel,
  optimalAzimuth,
  optimalTilt,
  suitabilityScore,
  type Candidate,
  type Economics,
  type SiteData,
} from "./solar-model";
import { aiChat, buildSiteData, haversine, reverseGeocode, type BuildingInsights } from "./solar.server";

export type AnalysisResult = {
  sessionId: string | null;
  lat: number;
  lng: number;
  address: string | null;
  score: number;
  explanation: string;
  recommendedLabel: Candidate["label"];
  recommendedReason: string;
  configs: Candidate[];
  candidateCount: number;
  site: SiteData;
  economics: Economics;
  buildingBox: BuildingInsights["boundingBox"] | null;
  warnings: string[];
};

function economicsFor(countryCode: string | null): Economics {
  const c = getCountry(countryCode) ?? DEFAULT_COUNTRY;
  return { costPerKw: c.costPerKw, tariff: c.tariff, currency: c.currency, fx: c.fx };
}

/** Fast, AI-free preview score used for the map pin badge. */
export async function previewScore(lat: number, lng: number, countryCode: string | null) {
  const eco = economicsFor(countryCode);
  const { site, insights } = await buildSiteData(lat, lng, optimalTilt(lat), optimalAzimuth(lat));
  const { configs } = buildCandidates(site, eco);
  const best = configs.slice().sort((a, b) => b.score - a.score)[0]!;
  const distance = insights?.center
    ? Math.round(haversine(lat, lng, insights.center.latitude, insights.center.longitude))
    : null;
  return {
    score: suitabilityScore(site, best),
    dataQuality: site.dataQuality,
    hasBuilding: site.hasSolarApi,
    distanceToBuilding: distance,
    buildingCenter: insights?.center ?? null,
    buildingBox: insights?.boundingBox ?? null,
  };
}

type AiText = { explanation: string; reason: string };

async function generateNarrative(
  lang: LangCode,
  score: number,
  site: SiteData,
  configs: Candidate[],
  recommended: Candidate,
  currency: string,
): Promise<AiText> {
  const lines = configs
    .map(
      (c) =>
        `${c.label}: ${c.systemKw} kW, tilt ${c.tilt}°, azimuth ${c.azimuth}° (${compassLabel(
          c.azimuth,
        )}), ${c.annualKwh} kWh/yr, cost ~${c.costUsd} USD, payback ${c.paybackYears} yrs, internal score ${c.score}`,
    )
    .join("\n");

  const prompt = `You are a neutral, independent rooftop-solar advisor. You are NOT selling anything.
Write in ${languageName(lang)} (language code: ${lang}). Write DIRECTLY in that language; do not translate afterwards.

Site facts:
- Latitude ${site.lat.toFixed(3)}, longitude ${site.lng.toFixed(3)}
- Suitability score: ${score}/100
- Modelled yield: ${Math.round(site.baselineYieldPerKw)} kWh per kW per year (source: ${site.yieldSource})
- Unshaded fraction of roof: ${(site.shadeFactor * 100).toFixed(0)}%
- Usable roof capacity: ${site.maxSystemKw} kW
- Data confidence: ${(site.confidence * 100).toFixed(0)}% (${site.dataQuality})${
    site.hasSolarApi ? "" : "\n- No rooftop scan available: general area estimate only"
  }
- Currency for costs: ${currency}

Ranked configurations:
${lines}
Recommended: ${recommended.label}

Return ONLY valid JSON, no markdown fences:
{"explanation": "...", "reason": "..."}
- "explanation": ONE sentence (max 30 words) explaining plainly why the score is what it is. Reference the specific limiting or enabling factor (sunlight, shading, roof size, payback). Be honest about uncertainty when confidence is low. Do not use marketing language.
- "reason": ONE short clause (max 16 words) saying why the recommended configuration wins for this roof.`;

  const res = await aiChat(
    [
      { role: "system", content: "You output only compact JSON. No prose, no code fences." },
      { role: "user", content: prompt },
    ],
    { maxTokens: 400 },
  );

  const fallback: AiText = {
    explanation: site.hasSolarApi
      ? `Score ${score}/100 based on ${Math.round(site.baselineYieldPerKw)} kWh per kW per year and ${(
          site.shadeFactor * 100
        ).toFixed(0)}% unshaded roof.`
      : `Score ${score}/100 from a general area estimate — no rooftop scan was available here.`,
    reason: `Best output per unit of cost for this roof (payback ${recommended.paybackYears} years).`,
  };
  if (!res.ok) return fallback;

  try {
    const cleaned = res.text.replace(/^```(?:json)?/i, "").replace(/```$/, "").trim();
    const parsed = JSON.parse(cleaned) as Partial<AiText>;
    return {
      explanation: parsed.explanation?.trim() || fallback.explanation,
      reason: parsed.reason?.trim() || fallback.reason,
    };
  } catch {
    return res.text.length > 10 && res.text.length < 400
      ? { explanation: res.text.trim(), reason: fallback.reason }
      : fallback;
  }
}

export async function runAnalysis(input: {
  lat: number;
  lng: number;
  countryCode: string | null;
  language: LangCode;
  address?: string | null;
}): Promise<AnalysisResult> {
  const { lat, lng } = input;
  const eco = economicsFor(input.countryCode);
  const [{ site, insights, failure }, resolvedAddress] = await Promise.all([
    buildSiteData(lat, lng, optimalTilt(lat), optimalAzimuth(lat)),
    input.address ? Promise.resolve(input.address) : reverseGeocode(lat, lng),
  ]);

  const { candidates, configs, recommendedLabel } = buildCandidates(site, eco);
  const recommended = configs.find((c) => c.label === recommendedLabel) ?? configs[0]!;
  const score = suitabilityScore(site, recommended);
  const narrative = await generateNarrative(input.language, score, site, configs, recommended, eco.currency);

  const warnings: string[] = [];
  if (!site.hasSolarApi) warnings.push("noSolarData");
  if (failure?.reason === "timeout") warnings.push("timeoutNote");
  if (site.yieldSource === "pvwatts") warnings.push("pvwattsNote");

  let sessionId: string | null = null;
  try {
    const { data } = await supabaseAdmin
      .from("solar_sessions")
      .insert({
        country_code: input.countryCode,
        language: input.language,
        lat,
        lng,
        address: resolvedAddress,
        score,
        data_quality: site.dataQuality,
        result: { configs, site, explanation: narrative.explanation } as never,
      })
      .select("id")
      .single();
    sessionId = data?.id ?? null;
  } catch (e) {
    console.error("Could not persist session", e);
  }

  return {
    sessionId,
    lat,
    lng,
    address: resolvedAddress ?? null,
    score,
    explanation: narrative.explanation,
    recommendedLabel,
    recommendedReason: narrative.reason,
    configs,
    candidateCount: candidates.length,
    site,
    economics: eco,
    buildingBox: insights?.boundingBox ?? null,
    warnings,
  };
}

export async function assistantReply(input: {
  sessionId: string | null;
  message: string;
  language: LangCode;
  context: string;
}): Promise<{ reply: string }> {
  let history: Array<{ role: "user" | "assistant"; content: string }> = [];
  if (input.sessionId) {
    try {
      const { data } = await supabaseAdmin
        .from("chat_messages")
        .select("role, content")
        .eq("session_id", input.sessionId)
        .order("created_at", { ascending: true })
        .limit(20);
      history = (data ?? []).map((m) => ({
        role: m.role === "assistant" ? ("assistant" as const) : ("user" as const),
        content: m.content,
      }));
    } catch {
      /* history is best-effort */
    }
  }

  const system = `You are the built-in guide of "Smart Solar Placement Advisor", a neutral rooftop-solar advisor.
Answer in ${languageName(input.language)} (code ${input.language}), directly in that language.
Tone: light, helpful, concrete — a guide, never a salesperson. 2-4 short sentences, no markdown headings.
Use ONLY the session context below for specifics; if something isn't in it, say plainly that you don't have that data.
Never overstate certainty: if data confidence is medium or low, say so.

SESSION CONTEXT
${input.context}`;

  const res = await aiChat(
    [{ role: "system", content: system }, ...history, { role: "user", content: input.message }],
    { maxTokens: 400 },
  );

  const reply = res.ok && res.text ? res.text : res.ok ? "I couldn't generate an answer — try rephrasing." : res.message;

  if (input.sessionId) {
    try {
      await supabaseAdmin.from("chat_messages").insert([
        { session_id: input.sessionId, role: "user", content: input.message },
        { session_id: input.sessionId, role: "assistant", content: reply },
      ]);
    } catch {
      /* ignore */
    }
  }

  return { reply };
}
