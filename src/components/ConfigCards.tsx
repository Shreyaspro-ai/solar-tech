import { Check, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useI18n } from "@/lib/i18n";
import { money, num } from "@/lib/format";
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
}: {
  configs: Candidate[];
  recommendedLabel: Candidate["label"];
  recommendedReason: string;
  activeLabel: Candidate["label"];
  onSelect: (label: Candidate["label"]) => void;
  economics: Economics;
}) {
  const { t, lang } = useI18n();
  const title: Record<Candidate["label"], string> = {
    budget: t("cfgBudget"),
    balanced: t("cfgBalanced"),
    max: t("cfgMax"),
  };

  return (
    <section className="space-y-4">
      <h2 className="text-display text-center text-2xl">{t("configsTitle")}</h2>
      <div className="grid gap-4 sm:grid-cols-3">
        {configs.map((c) => {
          const isRec = c.label === recommendedLabel;
          const isActive = c.label === activeLabel;
          return (
            <article
              key={c.label}
              className={cn(
                "relative flex flex-col gap-4 rounded-2xl border bg-card p-5 shadow-soft transition-all hover-lift",
                isRec ? "border-sun/70 bg-accent/20" : "border-border",
                isActive && "ring-2 ring-sun ring-offset-2 ring-offset-background",
              )}
            >
              {isRec ? (
                <span className="absolute -top-3 start-5 inline-flex items-center gap-1 rounded-full bg-gradient-sun px-3 py-1 text-[11px] font-semibold text-sun-foreground shadow-soft">
                  <Sparkles className="size-3" aria-hidden />
                  {t("recommended")}
                </span>
              ) : null}

              <header>
                <h3 className="text-lg font-semibold">{title[c.label]}</h3>
                <p className="text-xs text-muted-foreground">
                  {c.systemKw} kW · {c.panels} {t("panels")}
                </p>
              </header>

              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("tilt")}</dt>
                  <dd className="font-medium">{c.tilt}°</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("azimuth")}</dt>
                  <dd className="font-medium">
                    {c.azimuth}° {compassLabel(c.azimuth)}
                  </dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("annualOutput")}</dt>
                  <dd className="font-medium">{num(c.annualKwh, lang)} kWh</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("estCost")}</dt>
                  <dd className="font-medium">{money(c.costUsd, economics, lang, true)}</dd>
                </div>
                <div className="flex justify-between gap-2">
                  <dt className="text-muted-foreground">{t("payback")}</dt>
                  <dd className="font-medium">
                    {c.paybackYears} {t("years")}
                  </dd>
                </div>
              </dl>

              {isRec ? (
                <TypewriterText
                  text={recommendedReason}
                  speed={22}
                  className="rounded-xl bg-accent/50 p-3 text-xs leading-relaxed text-accent-foreground"
                />
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
