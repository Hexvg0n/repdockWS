import { getMongoClient } from "@/lib/mongodb";

export const currencyCodes = ["CNY", "PLN", "USD", "EUR"] as const;

export type CurrencyCode = (typeof currencyCodes)[number];

export type CurrencyRatesResult = {
  base: "CNY";
  fetchedAt: string;
  rates: Record<CurrencyCode, number>;
  source: "frankfurter" | "fallback" | "mongo-cache" | "memory-cache";
  stale: boolean;
};

type FrankfurterResponse = {
  base: string;
  date: string;
  rates: Partial<Record<Exclude<CurrencyCode, "CNY">, number>>;
};

type CurrencyRatesCacheDocument = CurrencyRatesResult & {
  _id: "currency-rates:cny";
};

const cacheId = "currency-rates:cny";
const cacheTtlMs = 1000 * 60 * 60 * 6;
const staleTtlMs = 1000 * 60 * 60 * 24 * 3;
const fallbackRates: Record<CurrencyCode, number> = {
  CNY: 1,
  PLN: 0.52,
  USD: 0.14,
  EUR: 0.13,
};

let memoryCache: CurrencyRatesResult | null = null;
let inFlightFetch: Promise<CurrencyRatesResult> | null = null;

export async function getCurrencyRates(): Promise<CurrencyRatesResult> {
  if (memoryCache && isFresh(memoryCache.fetchedAt, cacheTtlMs)) {
    return { ...memoryCache, source: "memory-cache", stale: false };
  }

  const mongoCache = await readMongoCache();

  if (mongoCache && isFresh(mongoCache.fetchedAt, cacheTtlMs)) {
    memoryCache = mongoCache;
    return { ...mongoCache, source: "mongo-cache", stale: false };
  }

  if (!inFlightFetch) {
    inFlightFetch = fetchFreshRates()
      .then(async (rates) => {
        memoryCache = rates;
        await writeMongoCache(rates);
        return rates;
      })
      .finally(() => {
        inFlightFetch = null;
      });
  }

  try {
    return await inFlightFetch;
  } catch (error) {
    console.error("Currency rates refresh failed", error);

    if (mongoCache && isFresh(mongoCache.fetchedAt, staleTtlMs)) {
      memoryCache = mongoCache;
      return { ...mongoCache, source: "mongo-cache", stale: true };
    }

    if (memoryCache && isFresh(memoryCache.fetchedAt, staleTtlMs)) {
      return { ...memoryCache, source: "memory-cache", stale: true };
    }

    return {
      base: "CNY",
      fetchedAt: new Date().toISOString(),
      rates: fallbackRates,
      source: "fallback",
      stale: true,
    };
  }
}

async function fetchFreshRates(): Promise<CurrencyRatesResult> {
  const response = await fetch(
    "https://api.frankfurter.dev/v1/latest?base=CNY&symbols=PLN,USD,EUR",
    {
      cache: "no-store",
      signal: AbortSignal.timeout(8000),
    },
  );

  if (!response.ok) {
    throw new Error(`Frankfurter returned ${response.status}`);
  }

  const data = (await response.json()) as FrankfurterResponse;
  const rates = {
    CNY: 1,
    PLN: readRate(data.rates.PLN, "PLN"),
    USD: readRate(data.rates.USD, "USD"),
    EUR: readRate(data.rates.EUR, "EUR"),
  };

  return {
    base: "CNY",
    fetchedAt: new Date().toISOString(),
    rates,
    source: "frankfurter",
    stale: false,
  };
}

function readRate(value: number | undefined, code: CurrencyCode) {
  if (!Number.isFinite(value)) {
    throw new Error(`Missing ${code} exchange rate`);
  }

  return Number(value);
}

async function readMongoCache() {
  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return null;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    const document = await db
      .collection<CurrencyRatesCacheDocument>("app_cache")
      .findOne({ _id: cacheId });

    return document ? normalizeCache(document) : null;
  } catch (error) {
    console.error("Currency rates Mongo cache read failed", error);
    return null;
  }
}

async function writeMongoCache(rates: CurrencyRatesResult) {
  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return;
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await db.collection<CurrencyRatesCacheDocument>("app_cache").updateOne(
      { _id: cacheId },
      {
        $set: {
          base: rates.base,
          fetchedAt: rates.fetchedAt,
          rates: rates.rates,
          source: rates.source,
          stale: rates.stale,
        },
        $setOnInsert: {
          _id: cacheId,
        },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Currency rates Mongo cache write failed", error);
  }
}

function normalizeCache(document: CurrencyRatesCacheDocument): CurrencyRatesResult | null {
  const rates = document.rates;

  if (
    !rates ||
    !Number.isFinite(rates.CNY) ||
    !Number.isFinite(rates.PLN) ||
    !Number.isFinite(rates.USD) ||
    !Number.isFinite(rates.EUR)
  ) {
    return null;
  }

  return {
    base: "CNY",
    fetchedAt: document.fetchedAt,
    rates,
    source: document.source,
    stale: document.stale,
  };
}

function isFresh(isoDate: string, ttlMs: number) {
  const timestamp = Date.parse(isoDate);

  return Number.isFinite(timestamp) && Date.now() - timestamp < ttlMs;
}
