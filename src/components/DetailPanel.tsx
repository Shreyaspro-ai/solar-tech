import { useMemo, useState } from "react";
import { Bar, BarChart, CartesianGrid, Cell, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useI18n } from "@/lib/i18n";
import { money, monthLabels, num, usdOnly } from "@/lib/format";
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
  const avgKwh = Math.round(live.monthlyKwh.reduce((a, b) => a + b, 0) / 12);
  const peakKwh = Math.max(...live.monthlyKwh);
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
            {t("costUsdLabel")}: {usdOnly(live.lifetimeSavingsUsd, lang, true)} {t("lifetimeSavings").toLowerCase()}
            {" · "}
            {usdOnly(live.annualSavingsUsd, lang)} {t("perYear")}
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
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-base font-semibold">{t("monthlyOutput")}</h3>
          <ul className="flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
            <li className="flex items-center gap-1.5">
              <span className="legend-dot" style={{ background: "var(--chart-1)" }} aria-hidden />
              {t("keyMonthly")}
            </li>
            <li className="flex items-center gap-1.5">
              <span className="legend-dot" style={{ background: "var(--chart-4)" }} aria-hidden />
              {t("keyBest")}
            </li>
            <li className="flex items-center gap-1.5">
              <span
                className="inline-block h-0 w-4 border-t-2 border-dashed"
                style={{ borderColor: "var(--chart-2)" }}
                aria-hidden
              />
              {t("keyAverage")} · {num(avgKwh, lang)} kWh
            </li>
          </ul>
        </div>
        <div className="h-60 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData} margin={{ top: 8, right: 4, left: -18, bottom: 0 }}>
              <defs>
                <linearGradient id="barMonthly" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-1)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-1)" stopOpacity={0.45} />
                </linearGradient>
                <linearGradient id="barPeak" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--chart-4)" stopOpacity={1} />
                  <stop offset="100%" stopColor="var(--chart-4)" stopOpacity={0.5} />
                </linearGradient>
              </defs>
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
                  color: "var(--foreground)",
                }}
                formatter={(v: number) => [`${num(v, lang)} kWh`, t("keyMonthly")]}
              />
              <ReferenceLine
                y={avgKwh}
                stroke="var(--chart-2)"
                strokeDasharray="5 4"
                strokeWidth={2}
                ifOverflow="extendDomain"
              />
              <Bar dataKey="kwh" radius={[6, 6, 0, 0]}>
                {chartData.map((d) => (
                  <Cell key={d.month} fill={d.kwh === peakKwh ? "url(#barPeak)" : "url(#barMonthly)"} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </section>
  );
}
