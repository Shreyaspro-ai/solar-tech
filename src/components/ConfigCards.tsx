import { useState } from "react";
import { Check, ChevronDown, Coins, Compass, Leaf, PanelsTopLeft, Sparkles, Zap } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { dualMoney, dualSmallMoney, money, num, usdOnly } from "@/lib/format";
import { compassLabel, type Candidate, type Economics } from "@/lib/solar-model";
import { cn } from "@/lib/utils";
import { TypewriterText } from "./TypewriterText";

export function ConfigCards({
  configs,
  recommendedLabel,
  recommendedReason,
  activeLabel,
  onSelect,
  economics,
  panelWatts = 400,
}: {
  configs: Candidate[];
  recommendedLabel: Candidate["label"];
  recommendedReason: string;
  activeLabel: Candidate["label"];
  onSelect: (label: Candidate["label"]) => void;
  economics: Economics;
  panelWatts?: number;
}) {
  const { t, lang } = useI18n();
  const [open, setOpen] = useState<Candidate["label"] | null>(recommendedLabel);

  const title: Record<Candidate["label"], string> = {
    budget: t("cfgBudget"),
    balanced: t("cfgBalanced"),
    max: t("cfgMax"),
  };

  // value = lifetime cost per kWh produced; lower is better
  const perKwh = (c: Candidate) => (c.annualKwh > 0 ? c.costUsd / (c.annualKwh * 25) : Infinity);
  const bestValue = configs.slice().sort((a, b) => perKwh(a) - perKwh(b))[0]?.label;

  return (
    <section className="space-y-4">
      <div className="mx-auto max-w-2xl text-center">
        <h2 className="text-display text-2xl sm:text-3xl">{t("solutionsTitle")}</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{t("solutionsBody")}</p>
      </div>

      <div className="grid items-start gap-4 lg:grid-cols-3">
        {configs.map((c) => {
          const isRec = c.label === recommendedLabel;
          const isActive = c.label === activeLabel;
          const isBest = c.label === bestValue;
          const isOpen = open === c.label;
          const monthly = Math.round(c.annualKwh / 12);
          const dir = compassLabel(c.azimuth);

          const perks = [
            {
              Icon: PanelsTopLeft,
              title: t("perkPanelsTitle"),
              body: t("perkPanelsBody", { panels: c.panels, watt: panelWatts, kw: c.systemKw }),
            },
            {
              Icon: Compass,
              title: t("perkOrientTitle"),
              body: t("perkOrientBody", { tilt: c.tilt, dir, az: c.azimuth }),
            },
            {
              Icon: Zap,
              title: t("perkYieldTitle"),
              body: t("perkYieldBody", { kwh: num(c.annualKwh, lang), monthly: num(monthly, lang) }),
            },
            {
              Icon: Coins,
              title: t("perkMoneyTitle"),
              body: t("perkMoneyBody", {
                savings: dualMoney(c.annualSavingsUsd, economics, lang),
                lifetime: dualMoney(c.lifetimeSavingsUsd, economics, lang, true),
              }),
            },
            {
              Icon: Leaf,
              title: t("perkGreenTitle"),
              body: t("perkGreenBody", { co2: c.co2TonsPerYear }),
            },
          ];

          return (
            <article
              key={c.label}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover-lift",
                isRec ? "border-sun/70 bg-accent/25" : "border-border",
                isActive && "ring-2 ring-ring ring-offset-2 ring-offset-background",
              )}
            >
              <div className="absolute -top-3 start-5 flex flex-wrap gap-1.5">
                {isRec ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-gradient-sun px-3 py-1 text-[11px] font-semibold text-sun-foreground shadow-soft">
                    <Sparkles className="size-3" aria-hidden />
                    {t("recommended")}
                  </span>
                ) : null}
                {isBest && !isRec ? (
                  <span className="inline-flex items-center gap-1 rounded-full bg-forest px-3 py-1 text-[11px] font-semibold text-forest-foreground shadow-soft">
                    {t("bestValue")}
                  </span>
                ) : null}
              </div>

              <header className="pt-1">
                <h3 className="text-lg font-semibold">{title[c.label]}</h3>
                <p className="text-xs text-muted-foreground">
                  {c.systemKw} kW · {c.panels} {t("panels")} · {t("tilt")} {c.tilt}° {dir}
                </p>
              </header>

              <div className="rounded-xl border border-border/70 bg-secondary/50 p-3">
                <p className="text-[11px] uppercase tracking-wider text-muted-foreground">{t("costLocal")}</p>
                <p className="text-display text-2xl leading-tight">{money(c.costUsd, economics, lang, true)}</p>
                {economics.currency !== "USD" ? (
                  <p className="text-xs text-muted-foreground">
                    {t("costUsdLabel")}: {usdOnly(c.costUsd, lang, true)}
                  </p>
                ) : null}
              </div>

              <dl className="space-y-2 text-sm">
                <Row label={t("annualOutput")} value={`${num(c.annualKwh, lang)} kWh`} />
                <Row label={t("payback")} value={`${c.paybackYears} ${t("years")}`} />
                <Row
                  label={t("perKwh")}
                  value={perKwh(c) === Infinity ? "—" : dualSmallMoney(perKwh(c), economics, lang)}
                />
              </dl>

              {isRec ? (
                <TypewriterText
                  text={recommendedReason}
                  speed={22}
                  className="rounded-xl bg-accent/60 p-3 text-xs leading-relaxed text-accent-foreground"
                />
              ) : null}

              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : c.label)}
                aria-expanded={isOpen}
                className="flex items-center justify-between rounded-xl border border-border bg-background/60 px-3 py-2 text-xs font-medium transition-colors hover:bg-accent/40"
              >
                {isOpen ? t("hideInside") : t("whatsInside")}
                <ChevronDown className={cn("size-4 transition-transform", isOpen && "rotate-180")} aria-hidden />
              </button>

              {isOpen ? (
                <ul className="space-y-3 rounded-xl bg-muted/50 p-3">
                  {perks.map(({ Icon, title: pt, body }) => (
                    <li key={pt} className="flex gap-2.5">
                      <Icon className="mt-0.5 size-4 shrink-0 text-sun" aria-hidden />
                      <span>
                        <span className="block text-xs font-semibold">{pt}</span>
                        <span className="block text-xs leading-relaxed text-muted-foreground">{body}</span>
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <Button
                variant={isActive ? "default" : "secondary"}
                size="sm"
                className="mt-auto gap-2 rounded-full"
                onClick={() => onSelect(c.label)}
                aria-pressed={isActive}
              >
                {isActive ? <Check className="size-4" aria-hidden /> : null}
                {isActive ? t("applied") : t("applyToRoof")}
              </Button>
            </article>
          );
        })}
      </div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="text-end font-medium">{value}</dd>
    </div>
  );
}
