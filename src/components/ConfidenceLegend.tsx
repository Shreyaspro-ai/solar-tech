import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { useI18n } from "@/lib/i18n";

export function ConfidenceLegend() {
  const { t } = useI18n();

  const bands = [
    { label: t("legendHighLabel"), body: t("legendHighBody"), color: "var(--score-high)", mark: "●" },
    { label: t("legendMidLabel"), body: t("legendMidBody"), color: "var(--score-mid)", mark: "▲" },
    { label: t("legendLowLabel"), body: t("legendLowBody"), color: "var(--score-low)", mark: "■" },
  ];

  const quality = [
    { Icon: ShieldCheck, label: t("qualityHigh"), body: t("legendQualityHighBody"), tone: "text-score-high" },
    { Icon: ShieldQuestion, label: t("qualityMedium"), body: t("legendQualityMediumBody"), tone: "text-score-mid" },
    { Icon: ShieldAlert, label: t("qualityLow"), body: t("legendQualityLowBody"), tone: "text-score-low" },
  ];

  return (
    <section className="surface-panel p-5 sm:p-6">
      <h3 className="text-base font-semibold on-media">{t("legendTitle")}</h3>
      <p className="mt-1 max-w-2xl text-xs leading-relaxed on-media-muted">{t("legendBody")}</p>

      <div className="mt-5 grid gap-6 md:grid-cols-2">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] on-media-muted">
            {t("legendScoreTitle")}
          </h4>
          <ul className="mt-3 space-y-3">
            {bands.map((b) => (
              <li key={b.label} className="flex gap-3">
                <span
                  className="mt-0.5 grid size-5 shrink-0 place-items-center rounded-full text-[9px] leading-none"
                  style={{ background: b.color, color: "oklch(0.22 0.02 70)" }}
                  aria-hidden
                >
                  {b.mark}
                </span>
                <span>
                  <span className="block text-sm font-medium on-media">{b.label}</span>
                  <span className="block text-xs leading-relaxed on-media-muted">{b.body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <h4 className="text-xs font-semibold uppercase tracking-[0.14em] on-media-muted">
            {t("legendQualityTitle")}
          </h4>
          <ul className="mt-3 space-y-3">
            {quality.map(({ Icon, label, body, tone }) => (
              <li key={label} className="flex gap-3">
                <Icon className={`mt-0.5 size-5 shrink-0 ${tone}`} aria-hidden />
                <span>
                  <span className="block text-sm font-medium on-media">{label}</span>
                  <span className="block text-xs leading-relaxed on-media-muted">{body}</span>
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
