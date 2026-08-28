import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Defs, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { dualMoney, money, monthLabels, num, usdOnly } from "@/lib/format";
import { compassLabel, evaluate, type Candidate, type Economics, type SiteData } from "@/lib/solar-model";
import { ConfidenceBadge } from "./ConfidenceBadge";

export function DetailPanel({
  site,
  economics,
  base,
  onTuneChange,
}: {
  site: SiteData;
  economics: Economics;
  base: Candidate;
  onTuneChange?: (azimuth: number) => void;
}) {
  const { t, lang } = useI18n();
  const [tilt, setTilt] = useState(base.tilt);
  const [azimuth, setAzimuth] = useState(base.azimuth);

  // Recalculated synchronously on every slider frame — this is the live model.
  const live = useMemo(
    () => evaluate(site, economics, tilt, azimuth, base.systemKw),
    [site, economics, tilt, azimuth, base.systemKw],
  );

  const months = monthLabels(lang);
  const chartData = live.monthlyKwh.map((v, i) => ({ month: months[i], kwh: v }));
  const delta = live.annualKwh - base.annualKwh;

  const reset = () => {
    setTilt(base.tilt);
    setAzimuth(base.azimuth);
    onTuneChange?.(base.azimuth);
  };

  return (
    <section className="space-y-6">
      <div className="flex flex-col items-center gap-3 rounded-2xl border border-border bg-card p-6 text-center shadow-soft">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-muted-foreground">
          {t("lifetimeSavings")}
        </p>
        <p className="text-display text-5xl leading-none text-forest sm:text-6xl">
          {money(live.lifetimeSavingsUsd, economics, lang, true)}
        </p>
        <p className="text-sm text-muted-foreground">
          {money(live.annualSavingsUsd, economics, lang)} {t("perYear")} · {t("payback")} {live.paybackYears}{" "}
          {t("years")}
        </p>
        {economics.currency !== "USD" ? (
          <p className="text-xs text-muted-foreground">
            {t("costUsdLabel")}: {usdOnly(live.lifetimeSavingsUsd, lang, true)} · {usdOnly(live.annualSavingsUsd, lang)}{" "}
            {t("perYear")}
          </p>
        ) : null}
        <div className="flex flex-wrap items-center justify-center gap-2 pt-1">
          <ConfidenceBadge quality={site.dataQuality} />
          <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs text-muted-foreground">
            {t("co2")}: {live.co2TonsPerYear} {t("tonsPerYear")}
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <div className="mb-1 flex flex-wrap items-baseline justify-between gap-2">
          <h3 className="text-base font-semibold">{t("tuneTitle")}</h3>
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={reset}>
            <RotateCcw className="size-3.5" aria-hidden /> {t("resetTune")}
          </Button>
        </div>
        <p className="mb-4 text-xs text-muted-foreground">{t("tuneHint")}</p>

        <div className="space-y-5">
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <label htmlFor="tilt-slider" className="text-muted-foreground">
                {t("tilt")}
              </label>
              <span className="font-medium">{tilt}°</span>
            </div>
            <Slider
              id="tilt-slider"
              min={0}
              max={60}
              step={1}
              value={[tilt]}
              onValueChange={([v]) => setTilt(v ?? 0)}
              aria-label={t("tilt")}
            />
          </div>
          <div>
            <div className="mb-2 flex justify-between text-sm">
              <label htmlFor="az-slider" className="text-muted-foreground">
                {t("azimuth")}
              </label>
              <span className="font-medium">
                {azimuth}° {compassLabel(azimuth)}
              </span>
            </div>
            <Slider
              id="az-slider"
              min={0}
              max={359}
              step={1}
              value={[azimuth]}
              onValueChange={([v]) => {
                setAzimuth(v ?? 0);
                onTuneChange?.(v ?? 0);
              }}
              aria-label={t("azimuth")}
            />
          </div>
        </div>

        <div className="mt-5 flex flex-wrap items-baseline gap-x-4 gap-y-1 rounded-xl bg-secondary/70 p-4">
          <span className="text-display text-3xl leading-none">{num(live.annualKwh, lang)}</span>
          <span className="text-sm text-muted-foreground">kWh · {t("annualOutput")}</span>
          <span
            className={
              delta >= 0 ? "ms-auto text-sm font-medium text-score-high" : "ms-auto text-sm font-medium text-score-low"
            }
          >
            {delta >= 0 ? "+" : ""}
            {num(delta, lang)} kWh
          </span>
        </div>
      </div>

      <div className="rounded-2xl border border-border bg-card p-5 shadow-soft">
        <h3 className="mb-4 text-base font-semibold">{t("monthlyOutput")}</h3>
        <div className="h-56 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 4, right: 4, left: -18, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="month" tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" interval={0} />
              <YAxis tick={{ fontSize: 11 }} stroke="var(--muted-foreground)" width={48} />
              <Tooltip
                cursor={{ fill: "var(--muted)" }}
                contentStyle={{
                  background: "var(--card)",
                  border: "1px solid var(--border)",
                  borderRadius: "0.75rem",
                  fontSize: "0.8rem",
                }}
                formatter={(v: number) => [`${num(v, lang)} kWh`, t("annualOutput")]}
              />
              <Bar dataKey="kwh" fill="var(--sun)" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
