import { useMemo, useState } from "react";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
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
    <section className="mx-auto w-full max-w-xl space-y-4">
      <h2 className="text-center text-xl font-semibold">{t("countryLabel")}</h2>
      <div className="relative">
        <Search className="pointer-events-none absolute start-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t("countrySearch")}
          aria-label={t("countrySearch")}
          className="ps-9"
        />
      </div>
      <ul className="grid max-h-[22rem] gap-2 overflow-y-auto rounded-2xl border border-border bg-card p-2 shadow-soft sm:grid-cols-2">
        {list.map((c) => (
          <li key={c.code}>
            <button
              type="button"
              onClick={() => onSelect(c)}
              className={cn(
                "flex w-full items-center justify-between gap-2 rounded-xl px-3 py-2.5 text-start text-sm transition-colors hover:bg-accent",
                value?.code === c.code && "bg-accent font-medium",
              )}
            >
              <span>{c.name}</span>
              <span className="text-xs text-muted-foreground">{c.currency}</span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
