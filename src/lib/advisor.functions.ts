import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

import { assistantReply, previewScore, runAnalysis } from "./analysis.server";
import { geocode } from "./solar.server";
import type { LangCode } from "./locales";

const langs = [
  "en", "hi", "kn", "ta", "te", "mr", "bn", "ur", "ar", "zh",
  "es", "fr", "ru", "pt", "sw", "id", "vi", "de", "ja", "tr",
] as const;

export const verifyPostalCode = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z.object({ countryCode: z.string().length(2), postalCode: z.string().min(2).max(12) }).parse(data),
  )
  .handler(async ({ data }) => {
    const res = await geocode(`${data.postalCode}, ${data.countryCode}`, data.countryCode);
    if ("ok" in res) return { verified: false as const, reason: res.reason };
    // A country/region centroid is not a usable rooftop location — never present it as one.
    if (res.precision === "area") {
      return { verified: false as const, reason: "imprecise" as const };
    }
    return {
      verified: true as const,
      lat: res.lat,
      lng: res.lng,
      address: res.address,
      partial: res.partial,
      precision: res.precision,
    };

  });

export const getPinPreview = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        countryCode: z.string().length(2).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ data }) => previewScore(data.lat, data.lng, data.countryCode));

export const analyzeLocation = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        lat: z.number().min(-90).max(90),
        lng: z.number().min(-180).max(180),
        countryCode: z.string().length(2).nullable().default(null),
        language: z.enum(langs).default("en"),
        address: z.string().max(300).nullable().default(null),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    runAnalysis({
      lat: data.lat,
      lng: data.lng,
      countryCode: data.countryCode,
      language: data.language as LangCode,
      address: data.address,
    }),
  );

export const askAssistant = createServerFn({ method: "POST" })
  .inputValidator((data: unknown) =>
    z
      .object({
        sessionId: z.string().uuid().nullable().default(null),
        message: z.string().min(1).max(1000),
        language: z.enum(langs).default("en"),
        context: z.string().max(4000).default(""),
      })
      .parse(data),
  )
  .handler(async ({ data }) =>
    assistantReply({
      sessionId: data.sessionId,
      message: data.message,
      language: data.language as LangCode,
      context: data.context,
    }),
  );
