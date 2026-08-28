import { useEffect, useState } from "react";
import { scoreBand } from "@/lib/solar-model";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";
import { ConfidenceBadge } from "./ConfidenceBadge";
import { TypewriterText } from "./TypewriterText";

export function ScoreDisplay({
  score,
  explanation,
  quality,
}: {
  score: number;
  explanation: string;
  quality: "high" | "medium" | "low";
}) {
  const { t } = useI18n();
  const band = scoreBand(score);
  const [shown, setShown] = useState(0);

  useEffect(() => {
    const reduce = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setShown(score);
      return;
    }
    let raf = 0;
    const start = performance.now();
    const step = (now: number) => {
      const p = Math.min(1, (now - start) / 900);
      setShown(Math.round(score * (1 - Math.pow(1 - p, 3))));
      if (p < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [score]);

  const tone =
    band === "high" ? "text-score-high" : band === "mid" ? "text-score-mid" : "text-score-low";
  const ring =
    band === "high"
      ? "var(--score-high)"
      : band === "mid"
        ? "var(--score-mid)"
        : "var(--score-low)";

  return (
    <section className="flex flex-col items-center gap-5 text-center">
      <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">{t("suitability")}</p>
      <div
        className="relative grid size-52 place-items-center rounded-full sm:size-60"
        style={{
          background: `conic-gradient(${ring} ${shown * 3.6}deg, var(--muted) 0deg)`,
        }}
        role="img"
        aria-label={`${t("suitability")}: ${score} / 100`}
      >
        <div className="grid size-[86%] place-items-center rounded-full bg-card">
          <span className={cn("text-display text-7xl leading-none sm:text-8xl", tone)}>{shown}</span>
          <span className="mt-1 text-xs text-muted-foreground">{t("outOf100")}</span>
        </div>
      </div>
      <ConfidenceBadge quality={quality} />
      <div className="max-w-md">
        <p className="mb-1 text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">{t("whyThis")}</p>
        <TypewriterText text={explanation} className="text-base leading-relaxed text-foreground" />
      </div>
    </section>
  );
}
