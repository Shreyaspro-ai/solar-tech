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

/**
 * Local currency plus USD reference. Countries already on USD get one value.
 * FX rates are indicative (e.g. 1 USD = 96 INR).
 */
export function dualMoney(usd: number, eco: Economics, lang: string, compact = false): string {
  const local = money(usd, eco, lang, compact);
  if (eco.currency === "USD" || eco.fx === 1) return local;
  const inUsd = new Intl.NumberFormat(lang, {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
    notation: compact && Math.abs(usd) >= 100000 ? "compact" : "standard",
  }).format(usd);
  return `${local} (${inUsd})`;
}

/** Just the USD side, for secondary lines. */
export function usdOnly(usd: number, lang: string, compact = false): string {
  try {
    return new Intl.NumberFormat(lang, {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
      notation: compact && Math.abs(usd) >= 100000 ? "compact" : "standard",
    }).format(usd);
  } catch {
    return `$${Math.round(usd).toLocaleString()}`;
  }
}
