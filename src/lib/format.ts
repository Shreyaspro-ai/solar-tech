import type { Economics } from "./solar-model";

/** Formats a USD amount into the site's local currency for display only. */
export function money(usd: number, eco: Economics, lang: string, compact = false): string {
  const value = usd * eco.fx;
  try {
    return new Intl.NumberFormat(lang, {
      style: "currency",
      currency: eco.currency,
      maximumFractionDigits: 0,
      notation: compact && Math.abs(value) >= 100000 ? "compact" : "standard",
    }).format(value);
  } catch {
    return `${Math.round(value).toLocaleString()} ${eco.currency}`;
  }
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
