import { useMemo, useState } from "react";
import { ChevronRight, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Flag } from "./Flag";
import { COUNTRIES, type Country } from "@/lib/countries";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function CountryStep({
  value,
  onSelect,
}: {
  value: Country | null;
  onSelect: (c: Country) => void;
}) {
  const { t } = useI18n();
  const [query, setQuery] = useState("");

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    const sorted = [...COUNTRIES].sort((a, b) => a.name.localeCompare(b.name));
    return q ? sorted.filter((c) => c.name.toLowerCase().includes(q) || c.code.toLowerCase() === q) : sorted;
  }, [query]);

  return (
    <section className="surface-panel mx-auto w-full max-w-3xl overflow-hidden">
      <div className="border-b border-white/10 bg-white/5 px-5 py-4">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-baseline gap-3">
          <h2 className="truncate text-lg font-semibold on-media">{t("countryLabel")}</h2>
          <span className="shrink-0 text-xs on-media-muted">{t("countryCount", { n: list.length })}</span>
        </div>
        <p className="mt-1 text-xs on-media-muted">{t("countryHint")}</p>
        <div className="relative mt-3">
          <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-white/60" />
          <Input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={t("countrySearch")}
            aria-label={t("countrySearch")}
            className="h-11 rounded-xl border-white/20 bg-white/10 ps-9 text-white placeholder:text-white/50"
          />
        </div>
      </div>

      {list.length === 0 ? (
        <p className="px-5 py-10 text-center text-sm on-media-muted">{t("noCountryMatch")}</p>
      ) : (
        <ul className="grid max-h-[24rem] gap-1 overflow-y-auto p-2 sm:grid-cols-2">
          {list.map((c) => (
            <li key={c.code}>
              <button
                type="button"
                onClick={() => onSelect(c)}
                className={cn(
                  "group flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-start text-sm text-white transition-colors hover:bg-white/10",
                  value?.code === c.code && "bg-white/15 font-medium",
                )}
              >
                <Flag code={c.code} />
                <span className="min-w-0 flex-1 truncate">{c.name}</span>
                <span className="shrink-0 text-[11px] font-medium on-media-muted">{c.currency}</span>
                <ChevronRight
                  className="size-4 shrink-0 text-white/50 opacity-0 transition-opacity group-hover:opacity-100 rtl:rotate-180"
                  aria-hidden
                />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
