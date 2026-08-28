import { useMemo, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { useMutation } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { ArrowLeft, Compass, PiggyBank, RotateCcw, Satellite, Sun } from "lucide-react";

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
    <div className="flex min-h-screen flex-col bg-background bg-hero-glow">
      <header className="sticky top-0 z-40 border-b border-border/60 glass-bar">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 py-3">
          <button
            type="button"
            onClick={restart}
            className="flex min-w-0 items-center gap-3 text-start"
            aria-label={t("appTitle")}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-gradient-sun text-sun-foreground shadow-glow">
              <Sun className="size-5" aria-hidden />
            </span>
            <span className="min-w-0">
              <span className="block truncate text-sm font-semibold sm:text-base">{t("appTitle")}</span>
              <span className="block truncate text-[11px] text-muted-foreground">{t("neutralBadge")}</span>
            </span>
          </button>
          <LanguageSelector />
        </div>

        <nav aria-label="Progress" className="mx-auto max-w-5xl px-4 pb-3">
          <ol className="flex items-center gap-2">
            {steps.map((s, i) => {
              const done = i < stepIndex;
              const current = i === stepIndex;
              return (
                <li key={s.id} className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className={cn(
                      "grid size-5 shrink-0 place-items-center rounded-full text-[10px] font-bold transition-colors",
                      done
                        ? "bg-forest text-forest-foreground"
                        : current
                          ? "bg-gradient-sun text-sun-foreground shadow-glow"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {done ? "✓" : i + 1}
                  </span>
                  <span
                    className={cn(
                      "hidden truncate text-[11px] font-semibold uppercase tracking-wider sm:inline",
                      current ? "text-foreground" : "text-muted-foreground",
                    )}
                  >
                    {s.label}
                  </span>
                  {i < steps.length - 1 ? (
                    <span
                      className={cn(
                        "h-px flex-1 rounded-full transition-colors",
                        i < stepIndex ? "bg-forest/50" : "bg-border",
                      )}
                    />
                  ) : null}
                </li>
              );
            })}
          </ol>
        </nav>
      </header>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-10">
        {step === "country" ? (
          <div className="animate-fade-up space-y-10">
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-2 rounded-full border border-sun/40 bg-sun/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-sun-foreground">
                <Sun className="size-3.5 animate-sun-pulse" aria-hidden />
                {t("heroEyebrow")}
              </span>
              <h2 className="text-display mt-5 text-4xl leading-[1.05] sm:text-5xl">
                <span className="text-gradient-energy">{t("tagline")}</span>
              </h2>
              <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-muted-foreground">{t("honesty")}</p>
            </div>

            <ul className="grid gap-3 sm:grid-cols-3">
              {[
                { icon: Satellite, title: t("chip1Title"), body: t("chip1Body"), tone: "bg-gradient-sky text-sky-foreground" },
                { icon: Compass, title: t("chip2Title"), body: t("chip2Body"), tone: "bg-gradient-sun text-sun-foreground" },
                { icon: PiggyBank, title: t("chip3Title"), body: t("chip3Body"), tone: "bg-gradient-forest text-forest-foreground" },
              ].map(({ icon: Icon, title, body, tone }) => (
                <li key={title} className="surface-card hover-lift p-4">
                  <span className={cn("grid size-9 place-items-center rounded-lg shadow-soft", tone)}>
                    <Icon className="size-4.5" aria-hidden />
                  </span>
                  <h3 className="mt-3 text-sm font-semibold">{title}</h3>
                  <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>

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
          <div className="animate-fade-up space-y-10">
            <div className="rounded-2xl bg-gradient-energy p-[2px] shadow-lift">
              <div className="surface-card overflow-hidden border-0">
              <div className="bg-cream/50 px-5 py-8 sm:px-8">
                <ScoreDisplay
                  score={result.score}
                  explanation={result.explanation}
                  quality={result.site.dataQuality}
                />
              </div>
              {result.warnings.length ? (
                <ul className="space-y-1 border-t border-border/70 px-5 py-3 text-center text-xs text-muted-foreground">
                  {result.warnings.map((w) => (
                    <li key={w}>{w in DICTS.en ? t(w as keyof Dict) : w}</li>
                  ))}
                 </ul>
              ) : null}
              </div>
            </div>

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
              <Button variant="secondary" className="gap-2 rounded-full px-6" onClick={restart}>
                <RotateCcw className="size-4" aria-hidden /> {t("startOver")}
              </Button>
            </div>
          </div>
        ) : null}
      </main>

      <footer className="border-t border-border/60 py-6">
        <div className="mx-auto grid max-w-5xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 text-xs text-muted-foreground">
          <p className="min-w-0">{t("honesty")}</p>
          <p className="shrink-0 font-medium">{t("neutralBadge")}</p>
        </div>
      </footer>


      <ChatWidget sessionId={result?.sessionId ?? null} context={chatContext} />
    </div>
  );
}
