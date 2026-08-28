import type { Economics } from "./solar-model";

/**
 * Formats a USD amount into the site's local currency for display only.
 * `compact` is honoured only for genuinely large numbers so the local and
 * USD figures never end up in different notations.
 */
export function money(usd: number, eco: Economics, lang: string, compact = false): string {
  const value = usd * eco.fx;
  return formatCurrency(value, eco.currency, lang, compact && Math.abs(usd) >= 100000);
}

/** USD side of any figure. Always en-US so separators are unambiguous. */
export function usdOnly(usd: number, _lang: string, compact = false): string {
  return formatCurrency(usd, "USD", "en-US", compact && Math.abs(usd) >= 100000);
}

function formatCurrency(value: number, currency: string, lang: string, compact: boolean): string {
  try {
    return new Intl.NumberFormat(lang, {
      style: "currency",
      currency,
      maximumFractionDigits: compact ? 1 : 0,
      notation: compact ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString("en-US")} ${currency}`;
  }
}

/**
 * Local currency plus a USD reference. Both sides use the same notation, so
 * a compact local value never sits next to a full-length USD value.
 */
export function dualMoney(usd: number, eco: Economics, lang: string, compact = false): string {
  const useCompact = compact && Math.abs(usd) >= 100000;
  const local = formatCurrency(usd * eco.fx, eco.currency, lang, useCompact);
  if (eco.currency === "USD" || eco.fx === 1) return local;
  return `${local} (${formatCurrency(usd, "USD", "en-US", useCompact)})`;
}

export function num(value: number, lang: string, digits = 0): string {
  try {
    return new Intl.NumberFormat(lang, { maximumFractionDigits: digits }).format(value);
  } catch {
    return String(Math.round(value));
  }
}

export function monthLabels(lang: string): string[] {
  try {
    const fmt = new Intl.DateTimeFormat(lang, { month: "short" });
    return Array.from({ length: 12 }, (_, i) => fmt.format(new Date(2024, i, 1)));
  } catch {
    return ["1", "2", "3", "4", "5", "6", "7", "8", "9", "10", "11", "12"];
  }
}

/** Small per-unit amounts (e.g. cost per kWh) need decimals on both sides. */
export function dualSmallMoney(usd: number, eco: Economics, lang: string): string {
  const fmt = (v: number, cur: string, locale: string, digits: number) => {
    try {
      return new Intl.NumberFormat(locale, {
        style: "currency",
        currency: cur,
        minimumFractionDigits: digits,
        maximumFractionDigits: digits,
      }).format(v);
    } catch {
      return `${v.toFixed(digits)} ${cur}`;
    }
  };
  const local = eco.fx * usd;
  const localStr = fmt(local, eco.currency, lang, local < 10 ? 2 : 1);
  if (eco.currency === "USD" || eco.fx === 1) return localStr;
  return `${localStr} (${fmt(usd, "USD", "en-US", 3)})`;
}
