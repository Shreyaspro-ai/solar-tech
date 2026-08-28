import { ShieldCheck, ShieldAlert, ShieldQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function ConfidenceBadge({
  quality,
  className,
}: {
  quality: "high" | "medium" | "low";
  className?: string;
}) {
  const { t } = useI18n();
  const map = {
    high: { Icon: ShieldCheck, label: t("qualityHigh"), tone: "text-score-high" },
    medium: { Icon: ShieldQuestion, label: t("qualityMedium"), tone: "text-score-mid" },
    low: { Icon: ShieldAlert, label: t("qualityLow"), tone: "text-score-low" },
  } as const;
  const { Icon, label, tone } = map[quality];

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border border-border bg-card/80 px-2.5 py-1 text-xs font-medium",
        tone,
        className,
      )}
    >
      <Icon className="size-3.5" aria-hidden />
      <span className="sr-only">{t("dataQuality")}: </span>
      {label}
    </span>
  );
}
