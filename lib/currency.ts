export const currencies = ["CNY", "PLN", "USD", "EUR"] as const;

export type CurrencyCode = (typeof currencies)[number];

export const fallbackCurrencyRates: Record<CurrencyCode, number> = {
  CNY: 1,
  PLN: 0.52,
  USD: 0.14,
  EUR: 0.13,
};

export function formatPrice(
  priceCny: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
) {
  const converted = priceCny * (rates[currency] ?? fallbackCurrencyRates[currency]);

  if (currency === "CNY") {
    return `${Math.round(converted)} CNY`;
  }

  if (currency === "USD") {
    return `$${converted.toFixed(2)}`;
  }

  return `${converted.toFixed(2)} ${currency}`;
}

export function readClientRate(value: number | undefined, fallback: number) {
  return Number.isFinite(value) ? Number(value) : fallback;
}
