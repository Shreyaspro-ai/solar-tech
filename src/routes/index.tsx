import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, RotateCcw, Sun } from "lucide-react";

import { Button } from "@/components/ui/button";
import { AnalysisLoading } from "@/components/AnalysisLoading";
import { ChatWidget } from "@/components/ChatWidget";
import { ConfigCards } from "@/components/ConfigCards";
import { CountryStep } from "@/components/CountryStep";
import { DetailPanel } from "@/components/DetailPanel";
import { LanguageSelector } from "@/components/LanguageSelector";
import { LocationStep } from "@/components/LocationStep";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import { analyzeLocation } from "@/lib/advisor.functions";
import type { AnalysisResult } from "@/lib/advisor-types";
import type { Country } from "@/lib/countries";
import { I18nProvider, useI18n } from "@/lib/i18n";
import { DICTS, type Dict } from "@/lib/locales";
import type { Candidate } from "@/lib/solar-model";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Smart Solar Placement Advisor — Is rooftop solar worth it?" },
      {
        name: "description",
        content:
          "An independent, AI-powered second opinion on rooftop solar: get a suitability score, the best tilt and orientation, costs and payback for your exact roof.",
      },
      { property: "og:title", content: "Smart Solar Placement Advisor" },
      {
        property: "og:description",
        content:
          "Score your roof for solar, compare budget, balanced and max-output setups, and see honest payback before you talk to an installer.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Page,
});

function Page() {
  return (
    <I18nProvider>
      <Advisor />
    </I18nProvider>
  );
}

type Step = "country" | "location" | "analysis" | "result";

function Advisor() {
  const { t, lang } = useI18n();
  const [step, setStep] = useState<Step>("country");
  const [country, setCountry] = useState<Country | null>(null);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [activeLabel, setActiveLabel] = useState<Candidate["label"]>("balanced");
  const [stage, setStage] = useState(0);
  const [error, setError] = useState<string | null>(null);

  const analyze = useServerFn(analyzeLocation);
  const analysis = useMutation({
    mutationFn: async (loc: { lat: number; lng: number; address: string | null }) => {
      setStage(0);
      const timers = [
        window.setTimeout(() => setStage(1), 1200),
        window.setTimeout(() => setStage(2), 3200),
      ];
      try {
        return await analyze({
          data: {
            lat: loc.lat,
            lng: loc.lng,
            countryCode: country?.code ?? null,
            language: lang,
            address: loc.address,
          },
        });
      } finally {
        timers.forEach((id) => window.clearTimeout(id));
      }
    },
    onSuccess: (res) => {
      setResult(res as AnalysisResult);
      setActiveLabel((res as AnalysisResult).recommendedLabel);
      setStep("result");
    },
    onError: () => {
      setError(t("errorBody"));
      setStep("location");
    },
  });

  const activeConfig = useMemo(
    () => result?.configs.find((c) => c.label === activeLabel) ?? result?.configs[1] ?? result?.configs[0],
    [result, activeLabel],
  );

  const chatContext = useMemo(() => {
    if (!result) return "";
    return [
      `Score ${result.score}/100 at ${result.lat.toFixed(4)},${result.lng.toFixed(4)} (${result.address ?? "unknown address"}).`,
      `Data quality: ${result.site.dataQuality}, yield source: ${result.site.yieldSource}, baseline ${Math.round(result.site.baselineYieldPerKw)} kWh/kW/yr.`,
      ...result.configs.map(
        (c) =>
          `${c.label}: ${c.systemKw}kW, tilt ${c.tilt}°, azimuth ${c.azimuth}°, ${c.annualKwh} kWh/yr, payback ${c.paybackYears} yrs.`,
      ),
      `Recommended: ${result.recommendedLabel}.`,
    ].join("\n");
  }, [result]);

  const steps: Array<{ id: Step; label: string }> = [
    { id: "country", label: t("stepCountry") },
    { id: "location", label: t("stepLocation") },
    { id: "analysis", label: t("stepAnalysis") },
    { id: "result", label: t("stepResult") },
  ];
  const stepIndex = steps.findIndex((s) => s.id === step);

  const restart = () => {
    setStep("country");
    setResult(null);
    setError(null);
    setCountry(null);
  };

  return (
    <div className="min-h-screen bg-background bg-hero-glow">
      <header className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-5">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-sun text-sun-foreground shadow-soft">
          <Sun className="size-5" aria-hidden />
        </span>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold sm:text-lg">{t("appTitle")}</h1>
          <p className="truncate text-xs text-muted-foreground">{t("neutralBadge")}</p>
        </div>
        <LanguageSelector />
      </header>

      <nav aria-label="Progress" className="mx-auto max-w-5xl px-4">
        <ol className="flex items-center gap-2 text-[11px] font-medium uppercase tracking-wider">
          {steps.map((s, i) => (
            <li key={s.id} className="flex flex-1 items-center gap-2">
              <span
                className={cn(
                  "h-1 flex-1 rounded-full transition-colors",
                  i <= stepIndex ? "bg-sun" : "bg-border",
                )}
              />
              <span className={cn("hidden sm:inline", i <= stepIndex ? "text-foreground" : "text-muted-foreground")}>
                {s.label}
              </span>
            </li>
          ))}
        </ol>
      </nav>

      <main className="mx-auto max-w-5xl px-4 pb-28 pt-8">
        {step === "country" ? (
          <div className="space-y-8">
            <div className="mx-auto max-w-xl text-center">
              <h2 className="text-display text-3xl leading-tight sm:text-4xl">{t("tagline")}</h2>
              <p className="mt-3 text-sm text-muted-foreground">{t("honesty")}</p>
            </div>
            <CountryStep
              value={country}
              onSelect={(c) => {
                setCountry(c);
                setStep("location");
              }}
            />
          </div>
        ) : null}

        {step === "location" && country ? (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => setStep("country")}>
              <ArrowLeft className="size-4 rtl:rotate-180" aria-hidden /> {t("back")}
            </Button>
            {error ? (
              <p className="mx-auto max-w-3xl rounded-xl border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
              </p>
            ) : null}
            <LocationStep
              country={country}
              onConfirm={(loc) => {
                setError(null);
                setStep("analysis");
                analysis.mutate(loc);
              }}
            />
          </div>
        ) : null}

        {step === "analysis" ? <AnalysisLoading stage={stage} /> : null}

        {step === "result" && result && activeConfig ? (
          <div className="space-y-10">
            <ScoreDisplay
              score={result.score}
              explanation={result.explanation}
              quality={result.site.dataQuality}
            />

            {result.warnings.length ? (
              <ul className="mx-auto max-w-2xl space-y-1 text-center text-xs text-muted-foreground">
                {result.warnings.map((w) => (
                  <li key={w}>{w in DICTS.en ? t(w as keyof Dict) : w}</li>
                ))}
              </ul>
            ) : null}

            <ConfigCards
              configs={result.configs}
              recommendedLabel={result.recommendedLabel}
              recommendedReason={result.recommendedReason}
              activeLabel={activeLabel}
              onSelect={setActiveLabel}
              economics={result.economics}
            />

            <DetailPanel
              key={activeConfig.label}
              site={result.site}
              economics={result.economics}
              base={activeConfig}
            />

            <div className="flex justify-center">
              <Button variant="secondary" className="gap-2" onClick={restart}>
                <RotateCcw className="size-4" aria-hidden /> {t("startOver")}
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 text-center text-xs text-muted-foreground">
        {t("honesty")}
      </footer>

      <ChatWidget sessionId={result?.sessionId ?? null} context={chatContext} />
    </div>
  );
}
