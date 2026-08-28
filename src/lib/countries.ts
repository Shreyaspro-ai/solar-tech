export type Country = {
  code: string;
  name: string;
  /** null when the country has no postal code system */
  postal: RegExp | null;
  postalExample?: string;
  /** average residential electricity tariff, USD/kWh (indicative) */
  tariff: number;
  /** indicative installed cost, USD per kW */
  costPerKw: number;
  currency: string;
  /** rough currency conversion from USD, for display only */
  fx: number;
  lang?: string;
};

// Postal patterns are deliberately permissive format checks (layer 1 only).
export const COUNTRIES: Country[] = [
  { code: "IN", name: "India", postal: /^[1-9]\d{5}$/, postalExample: "560001", tariff: 0.09, costPerKw: 620, currency: "INR", fx: 96, lang: "hi" },
  { code: "US", name: "United States", postal: /^\d{5}(-\d{4})?$/, postalExample: "94303", tariff: 0.17, costPerKw: 2600, currency: "USD", fx: 1, lang: "en" },
  { code: "GB", name: "United Kingdom", postal: /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i, postalExample: "SW1A 1AA", tariff: 0.3, costPerKw: 1900, currency: "GBP", fx: 0.78, lang: "en" },
  { code: "DE", name: "Germany", postal: /^\d{5}$/, postalExample: "10115", tariff: 0.36, costPerKw: 1500, currency: "EUR", fx: 0.92, lang: "de" },
  { code: "FR", name: "France", postal: /^\d{5}$/, postalExample: "75001", tariff: 0.25, costPerKw: 2000, currency: "EUR", fx: 0.92, lang: "fr" },
  { code: "ES", name: "Spain", postal: /^\d{5}$/, postalExample: "28001", tariff: 0.24, costPerKw: 1400, currency: "EUR", fx: 0.92, lang: "es" },
  { code: "IT", name: "Italy", postal: /^\d{5}$/, postalExample: "00100", tariff: 0.31, costPerKw: 1700, currency: "EUR", fx: 0.92 },
  { code: "PT", name: "Portugal", postal: /^\d{4}-\d{3}$/, postalExample: "1000-001", tariff: 0.24, costPerKw: 1400, currency: "EUR", fx: 0.92, lang: "pt" },
  { code: "NL", name: "Netherlands", postal: /^\d{4}\s?[A-Z]{2}$/i, postalExample: "1011 AB", tariff: 0.32, costPerKw: 1500, currency: "EUR", fx: 0.92 },
  { code: "BE", name: "Belgium", postal: /^\d{4}$/, postalExample: "1000", tariff: 0.34, costPerKw: 1600, currency: "EUR", fx: 0.92 },
  { code: "CH", name: "Switzerland", postal: /^\d{4}$/, postalExample: "8001", tariff: 0.3, costPerKw: 2200, currency: "CHF", fx: 0.88 },
  { code: "AT", name: "Austria", postal: /^\d{4}$/, postalExample: "1010", tariff: 0.28, costPerKw: 1600, currency: "EUR", fx: 0.92, lang: "de" },
  { code: "SE", name: "Sweden", postal: /^\d{3}\s?\d{2}$/, postalExample: "111 20", tariff: 0.2, costPerKw: 1600, currency: "SEK", fx: 10.5 },
  { code: "NO", name: "Norway", postal: /^\d{4}$/, postalExample: "0150", tariff: 0.15, costPerKw: 1800, currency: "NOK", fx: 10.8 },
  { code: "DK", name: "Denmark", postal: /^\d{4}$/, postalExample: "1050", tariff: 0.35, costPerKw: 1600, currency: "DKK", fx: 6.9 },
  { code: "FI", name: "Finland", postal: /^\d{5}$/, postalExample: "00100", tariff: 0.2, costPerKw: 1600, currency: "EUR", fx: 0.92 },
  { code: "PL", name: "Poland", postal: /^\d{2}-\d{3}$/, postalExample: "00-001", tariff: 0.2, costPerKw: 1200, currency: "PLN", fx: 4 },
  { code: "TR", name: "Türkiye", postal: /^\d{5}$/, postalExample: "34000", tariff: 0.1, costPerKw: 900, currency: "TRY", fx: 41, lang: "tr" },
  { code: "RU", name: "Russia", postal: /^\d{6}$/, postalExample: "101000", tariff: 0.06, costPerKw: 1000, currency: "RUB", fx: 90, lang: "ru" },
  { code: "UA", name: "Ukraine", postal: /^\d{5}$/, postalExample: "01001", tariff: 0.07, costPerKw: 1000, currency: "UAH", fx: 41 },
  { code: "BR", name: "Brazil", postal: /^\d{5}-?\d{3}$/, postalExample: "01001-000", tariff: 0.16, costPerKw: 800, currency: "BRL", fx: 5.4, lang: "pt" },
  { code: "MX", name: "Mexico", postal: /^\d{5}$/, postalExample: "01000", tariff: 0.11, costPerKw: 1000, currency: "MXN", fx: 18, lang: "es" },
  { code: "AR", name: "Argentina", postal: /^[A-Z]?\d{4}[A-Z]{0,3}$/i, postalExample: "C1000", tariff: 0.07, costPerKw: 1100, currency: "ARS", fx: 1000, lang: "es" },
  { code: "CL", name: "Chile", postal: /^\d{7}$/, postalExample: "8320000", tariff: 0.17, costPerKw: 1100, currency: "CLP", fx: 960, lang: "es" },
  { code: "CO", name: "Colombia", postal: /^\d{6}$/, postalExample: "110111", tariff: 0.16, costPerKw: 1100, currency: "COP", fx: 4100, lang: "es" },
  { code: "CA", name: "Canada", postal: /^[A-Z]\d[A-Z]\s?\d[A-Z]\d$/i, postalExample: "K1A 0B1", tariff: 0.13, costPerKw: 2200, currency: "CAD", fx: 1.38 },
  { code: "AU", name: "Australia", postal: /^\d{4}$/, postalExample: "2000", tariff: 0.22, costPerKw: 900, currency: "AUD", fx: 1.5 },
  { code: "NZ", name: "New Zealand", postal: /^\d{4}$/, postalExample: "6011", tariff: 0.2, costPerKw: 1600, currency: "NZD", fx: 1.65 },
  { code: "JP", name: "Japan", postal: /^\d{3}-?\d{4}$/, postalExample: "100-0001", tariff: 0.22, costPerKw: 2000, currency: "JPY", fx: 150, lang: "ja" },
  { code: "CN", name: "China", postal: /^\d{6}$/, postalExample: "100000", tariff: 0.08, costPerKw: 700, currency: "CNY", fx: 7.2, lang: "zh" },
  { code: "KR", name: "South Korea", postal: /^\d{5}$/, postalExample: "04524", tariff: 0.1, costPerKw: 1300, currency: "KRW", fx: 1350 },
  { code: "TW", name: "Taiwan", postal: /^\d{3}(\d{2})?$/, postalExample: "100", tariff: 0.09, costPerKw: 1200, currency: "TWD", fx: 32 },
  { code: "ID", name: "Indonesia", postal: /^\d{5}$/, postalExample: "10110", tariff: 0.1, costPerKw: 800, currency: "IDR", fx: 16000, lang: "id" },
  { code: "MY", name: "Malaysia", postal: /^\d{5}$/, postalExample: "50000", tariff: 0.12, costPerKw: 800, currency: "MYR", fx: 4.4 },
  { code: "SG", name: "Singapore", postal: /^\d{6}$/, postalExample: "018956", tariff: 0.23, costPerKw: 1200, currency: "SGD", fx: 1.34 },
  { code: "TH", name: "Thailand", postal: /^\d{5}$/, postalExample: "10200", tariff: 0.13, costPerKw: 850, currency: "THB", fx: 34 },
  { code: "VN", name: "Vietnam", postal: /^\d{6}$/, postalExample: "100000", tariff: 0.08, costPerKw: 700, currency: "VND", fx: 25000, lang: "vi" },
  { code: "PH", name: "Philippines", postal: /^\d{4}$/, postalExample: "1000", tariff: 0.19, costPerKw: 950, currency: "PHP", fx: 58 },
  { code: "BD", name: "Bangladesh", postal: /^\d{4}$/, postalExample: "1000", tariff: 0.07, costPerKw: 700, currency: "BDT", fx: 120, lang: "bn" },
  { code: "PK", name: "Pakistan", postal: /^\d{5}$/, postalExample: "44000", tariff: 0.09, costPerKw: 600, currency: "PKR", fx: 280, lang: "ur" },
  { code: "LK", name: "Sri Lanka", postal: /^\d{5}$/, postalExample: "00100", tariff: 0.08, costPerKw: 700, currency: "LKR", fx: 300 },
  { code: "NP", name: "Nepal", postal: /^\d{5}$/, postalExample: "44600", tariff: 0.07, costPerKw: 750, currency: "NPR", fx: 140, lang: "hi" },
  { code: "AE", name: "United Arab Emirates", postal: null, tariff: 0.08, costPerKw: 800, currency: "AED", fx: 3.67, lang: "ar" },
  { code: "SA", name: "Saudi Arabia", postal: /^\d{5}(-\d{4})?$/, postalExample: "11564", tariff: 0.05, costPerKw: 750, currency: "SAR", fx: 3.75, lang: "ar" },
  { code: "QA", name: "Qatar", postal: null, tariff: 0.03, costPerKw: 800, currency: "QAR", fx: 3.64, lang: "ar" },
  { code: "KW", name: "Kuwait", postal: /^\d{5}$/, postalExample: "13001", tariff: 0.03, costPerKw: 800, currency: "KWD", fx: 0.31, lang: "ar" },
  { code: "OM", name: "Oman", postal: /^\d{3}$/, postalExample: "100", tariff: 0.05, costPerKw: 800, currency: "OMR", fx: 0.38, lang: "ar" },
  { code: "EG", name: "Egypt", postal: /^\d{5}$/, postalExample: "11511", tariff: 0.04, costPerKw: 700, currency: "EGP", fx: 48, lang: "ar" },
  { code: "MA", name: "Morocco", postal: /^\d{5}$/, postalExample: "10000", tariff: 0.12, costPerKw: 900, currency: "MAD", fx: 10, lang: "ar" },
  { code: "ZA", name: "South Africa", postal: /^\d{4}$/, postalExample: "0001", tariff: 0.15, costPerKw: 900, currency: "ZAR", fx: 18 },
  { code: "KE", name: "Kenya", postal: /^\d{5}$/, postalExample: "00100", tariff: 0.16, costPerKw: 1000, currency: "KES", fx: 130, lang: "sw" },
  { code: "TZ", name: "Tanzania", postal: /^\d{5}$/, postalExample: "11101", tariff: 0.1, costPerKw: 1000, currency: "TZS", fx: 2700, lang: "sw" },
  { code: "UG", name: "Uganda", postal: null, tariff: 0.19, costPerKw: 1100, currency: "UGX", fx: 3700, lang: "sw" },
  { code: "NG", name: "Nigeria", postal: /^\d{6}$/, postalExample: "100001", tariff: 0.06, costPerKw: 1000, currency: "NGN", fx: 1550 },
  { code: "GH", name: "Ghana", postal: /^[A-Z]{2}-?\d{3,4}-?\d{4}$/i, postalExample: "GA-005-0001", tariff: 0.09, costPerKw: 1000, currency: "GHS", fx: 15 },
  { code: "ET", name: "Ethiopia", postal: /^\d{4}$/, postalExample: "1000", tariff: 0.03, costPerKw: 1100, currency: "ETB", fx: 120 },
  { code: "IE", name: "Ireland", postal: /^[A-Z]\d{2}\s?[A-Z\d]{4}$/i, postalExample: "D02 AF30", tariff: 0.35, costPerKw: 1900, currency: "EUR", fx: 0.92 },
  { code: "GR", name: "Greece", postal: /^\d{3}\s?\d{2}$/, postalExample: "104 31", tariff: 0.24, costPerKw: 1300, currency: "EUR", fx: 0.92 },
  { code: "IL", name: "Israel", postal: /^\d{5}(\d{2})?$/, postalExample: "9103401", tariff: 0.15, costPerKw: 1100, currency: "ILS", fx: 3.7 },
  { code: "HK", name: "Hong Kong", postal: null, tariff: 0.16, costPerKw: 1500, currency: "HKD", fx: 7.8, lang: "zh" },
  { code: "AO", name: "Angola", postal: null, tariff: 0.04, costPerKw: 1200, currency: "AOA", fx: 900, lang: "pt" },
  { code: "PA", name: "Panama", postal: null, tariff: 0.17, costPerKw: 1100, currency: "USD", fx: 1, lang: "es" },
  { code: "FJ", name: "Fiji", postal: null, tariff: 0.17, costPerKw: 1400, currency: "FJD", fx: 2.25 },
  { code: "ZW", name: "Zimbabwe", postal: null, tariff: 0.1, costPerKw: 1100, currency: "USD", fx: 1 },
];

export const DEFAULT_COUNTRY: Country = {
  code: "US",
  name: "United States",
  postal: /^\d{5}(-\d{4})?$/,
  tariff: 0.15,
  costPerKw: 2000,
  currency: "USD",
  fx: 1,
};

export function getCountry(code: string | null | undefined): Country | undefined {
  if (!code) return undefined;
  return COUNTRIES.find((c) => c.code === code);
}
