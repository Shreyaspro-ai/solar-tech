import { useEffect, useState } from "react";
import { Check, Loader2, Sun } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Animated sequence tied to the real sequential analysis calls. */
export function AnalysisLoading({ stage }: { stage: number }) {
  const { t } = useI18n();
  const [tick, setTick] = useState(0);
  const steps = [t("analysisGeometry"), t("analysisSun"), t("analysisScoring")];

  useEffect(() => {
    const id = window.setInterval(() => setTick((v) => v + 1), 700);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="mx-auto flex max-w-md flex-col items-center gap-8 py-16 text-center" aria-live="polite">
      <div className="relative flex size-28 items-center justify-center">
        <div className="absolute inset-0 rounded-full bg-gradient-sun animate-sun-pulse" />
        <Sun className="relative size-12 text-sun-foreground" aria-hidden />
      </div>
      <ul className="w-full space-y-3 text-start">
        {steps.map((label, i) => {
          const done = i < stage;
          const active = i === stage;
          return (
            <li
              key={label}
              className={cn(
                "flex items-center gap-3 rounded-xl border border-border bg-card/70 px-4 py-3 text-sm transition-opacity",
                !done && !active && "opacity-45",
              )}
            >
              {done ? (
                <Check className="size-4 text-score-high" aria-hidden />
              ) : active ? (
                <Loader2 className="size-4 animate-spin text-sun" aria-hidden />
              ) : (
                <span className="size-4 rounded-full border border-border" aria-hidden />
              )}
              <span>{label}</span>
              {active ? <span className="ms-auto text-xs text-muted-foreground">{".".repeat(tick % 4)}</span> : null}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
