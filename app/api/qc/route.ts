import { NextResponse } from "next/server";
import crypto from "crypto";

import { convertLink } from "@/lib/converter";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type PlatformName = "taobao" | "tmall" | "1688" | "weidian";
type SourceName = "ACBuy" | "USFans" | "CNFans";

type ProductData = {
  platformCode: "TB" | "AL" | "WD";
  itemId: string;
  platform: PlatformName;
  originalUrl: string;
};

type QCImage = {
  photoUrl: string;
  createTime: string | number | null;
  skuId: string | null;
  source: SourceName;
};

type SourceMeta = {
  ok: boolean;
  count: number;
  status?: number;
  skipped?: boolean;
  error?: string;
};

type SourceResult = {
  images: QCImage[];
  meta: SourceMeta;
};

type ACBuyQCItem = {
  photoUrl?: unknown;
  url?: unknown;
  imgUrl?: unknown;
  createTime?: unknown;
  addTime?: unknown;
  skuId?: unknown;
  skuName?: unknown;
};

type USFansQCItem = string | {
  url?: unknown;
  photoUrl?: unknown;
  imgUrl?: unknown;
  createTime?: unknown;
  addTime?: unknown;
  skuId?: unknown;
  skuName?: unknown;
};

type CNFansInboundDay = {
  waterMarkImageUrlList?: unknown;
  signedTime?: unknown;
};

type JsonObject = Record<string, unknown>;

const MAX_URL_LENGTH = 4096;
const UPSTREAM_TIMEOUT_MS = 8_000;

const PLATFORM_CODES: Record<PlatformName, ProductData["platformCode"]> = {
  taobao: "TB",
  tmall: "TB",
  "1688": "AL",
  weidian: "WD",
};

const ITEM_ID_PATTERNS: Record<PlatformName, RegExp[]> = {
  taobao: [/[?&]id=(\d+)/],
  tmall: [/[?&]id=(\d+)/],
  "1688": [/\/offer\/(\d+)\.html/],
  weidian: [/[?&]itemI[dD]=(\d+)/],
};

class UpstreamError extends Error {
  status?: number;

  constructor(message: string, status?: number) {
    super(message);
    this.name = "UpstreamError";
    this.status = status;
  }
}

const isObject = (value: unknown): value is JsonObject =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const asString = (value: unknown): string | null => {
  if (typeof value === "string" && value.trim()) return value.trim();
  if (typeof value === "number" && Number.isFinite(value)) return String(value);
  return null;
};

const normalizeImageUrl = (value: unknown): string | null => {
  const raw = asString(value);
  if (!raw) return null;

  const candidate = raw.startsWith("//") ? `https:${raw}` : raw;

  try {
    const parsed = new URL(candidate);
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") return null;
    return parsed.toString();
  } catch {
    return null;
  }
};

const extractItemId = (url: string, platform: PlatformName): string | null => {
  for (const pattern of ITEM_ID_PATTERNS[platform]) {
    const match = url.match(pattern);
    if (match?.[1]) return match[1];
  }

  return null;
};

function parseProductUrl(inputUrl: string): ProductData | null {
  const converted = convertLink(inputUrl);
  const platform = converted.platform as PlatformName | null;
  const originalUrl = converted.originalUrl;

  if (!platform || !originalUrl || !(platform in PLATFORM_CODES)) return null;

  const itemId = extractItemId(originalUrl, platform);
  if (!itemId) return null;

  return {
    platform,
    itemId,
    originalUrl,
    platformCode: PLATFORM_CODES[platform],
  };
}

function calculateSignature(
  params: Record<string, string | number>,
  body: JsonObject,
  secretKey: string,
): string {
  const paramsToSign: Record<string, string> = {};

  for (const [key, value] of Object.entries(params)) {
    if (key === "signature") continue;
    paramsToSign[key] = String(value);
  }

  paramsToSign.body = JSON.stringify(body);

  const stringToSign = Object.keys(paramsToSign)
    .sort()
    .map((key) => `${key}=${paramsToSign[key]}`)
    .join("&");

  return crypto.createHmac("sha256", secretKey).update(stringToSign).digest("hex");
}

async function fetchJson<T>(url: string | URL, init: RequestInit = {}): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS);

  try {
    const response = await fetch(url, {
      ...init,
      cache: "no-store",
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new UpstreamError(`Upstream returned HTTP ${response.status}`, response.status);
    }

    try {
      return (await response.json()) as T;
    } catch {
      throw new UpstreamError("Upstream returned invalid JSON", response.status);
    }
  } catch (error) {
    if (error instanceof UpstreamError) throw error;
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new UpstreamError("Upstream request timed out");
    }
    throw new UpstreamError(error instanceof Error ? error.message : "Upstream request failed");
  } finally {
    clearTimeout(timeout);
  }
}

const okResult = (images: QCImage[]): SourceResult => ({
  images,
  meta: { ok: true, count: images.length },
});

const skippedResult = (reason: string): SourceResult => ({
  images: [],
  meta: { ok: false, skipped: true, count: 0, error: reason },
});

const errorResult = (error: unknown): SourceResult => ({
  images: [],
  meta: {
    ok: false,
    count: 0,
    status: error instanceof UpstreamError ? error.status : undefined,
    error: error instanceof Error ? error.message : "Unknown error",
  },
});

async function fetchACBuyQC(productData: ProductData): Promise<SourceResult> {
  const appId = process.env.ACBUY_APP_ID;
  const secretKey = process.env.ACBUY_SECRET_KEY;

  if (!appId || !secretKey) {
    return skippedResult("ACBuy credentials are not configured");
  }

  try {
    const goodsId = `${productData.platformCode}${productData.itemId}`;
    const timestamp = Date.now();
    const nonce = crypto.randomBytes(16).toString("hex");

    const queryParams = { appId, nonce, timestamp };
    const body = { goodsId };
    const signature = calculateSignature(queryParams, body, secretKey);

    const targetUrl = new URL("https://openapi.acbuy.com/products/qc/list");
    targetUrl.searchParams.set("appId", appId);
    targetUrl.searchParams.set("nonce", nonce);
    targetUrl.searchParams.set("timestamp", String(timestamp));
    targetUrl.searchParams.set("signature", signature);

    const data = await fetchJson<{ data?: unknown }>(targetUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const rawItems = Array.isArray(data.data) ? data.data : [];
    const images = rawItems.flatMap((item): QCImage[] => {
      if (!isObject(item)) return [];

      const typed = item as ACBuyQCItem;
      const photoUrl = normalizeImageUrl(typed.photoUrl ?? typed.url ?? typed.imgUrl);
      if (!photoUrl) return [];

      return [{
        photoUrl,
        createTime: asString(typed.createTime ?? typed.addTime),
        skuId: asString(typed.skuId ?? typed.skuName) ?? "Inne",
        source: "ACBuy",
      }];
    });

    return okResult(images);
  } catch (error) {
    console.error("ACBuy QC fetch failed:", error);
    return errorResult(error);
  }
}

async function fetchUSFansQC(productData: ProductData): Promise<SourceResult> {
  try {
    const targetUrl = new URL("https://www.usfans.com/api/goods/estimate-info");
    targetUrl.searchParams.set("goodsId", productData.itemId);

    const data = await fetchJson<unknown>(targetUrl, {
      headers: {
        Accept: "application/json",
        "User-Agent": "Mozilla/5.0",
      },
    });

    let rawItems: unknown[] = [];

    if (isObject(data) && isObject(data.data) && Array.isArray(data.data.qcImages)) {
      rawItems = data.data.qcImages;
    } else if (isObject(data) && Array.isArray(data.data)) {
      rawItems = data.data;
    } else if (Array.isArray(data)) {
      rawItems = data;
    }

    const images = rawItems.flatMap((item): QCImage[] => {
      const qcItem = item as USFansQCItem;

      if (typeof qcItem === "string") {
        const photoUrl = normalizeImageUrl(qcItem);
        return photoUrl
          ? [{ photoUrl, createTime: null, skuId: "USFans Stock", source: "USFans" }]
          : [];
      }

      if (!isObject(qcItem)) return [];

      const photoUrl = normalizeImageUrl(qcItem.url ?? qcItem.photoUrl ?? qcItem.imgUrl);
      if (!photoUrl) return [];

      return [{
        photoUrl,
        createTime: asString(qcItem.createTime ?? qcItem.addTime),
        skuId: asString(qcItem.skuId ?? qcItem.skuName) ?? "Inne",
        source: "USFans",
      }];
    });

    return okResult(images);
  } catch (error) {
    console.error("USFans QC fetch failed:", error);
    return errorResult(error);
  }
}

async function fetchCNFansQC(productData: ProductData): Promise<SourceResult> {
  try {
    const targetUrl = new URL("https://cnfans.com/wp-json/openapi/v1/product/detail");
    targetUrl.searchParams.set("skupid", productData.itemId);
    targetUrl.searchParams.set("site", "cnfans");
    targetUrl.searchParams.set("lang", "en");
    targetUrl.searchParams.set("wmc-currency", "USD");

    const data = await fetchJson<unknown>(targetUrl, {
      headers: {
        Accept: "application/json",
        "From-Source-Type": "PC",
        "User-Agent": "Mozilla/5.0",
      },
    });

    const inboundDays =
      isObject(data) &&
      data.code === 200 &&
      isObject(data.data) &&
      Array.isArray(data.data.inboundDays)
        ? data.data.inboundDays
        : [];

    const images = inboundDays.flatMap((inbound): QCImage[] => {
      if (!isObject(inbound)) return [];

      const typed = inbound as CNFansInboundDay;
      const urls = Array.isArray(typed.waterMarkImageUrlList) ? typed.waterMarkImageUrlList : [];

      return urls.flatMap((url): QCImage[] => {
        const photoUrl = normalizeImageUrl(url);
        if (!photoUrl) return [];

        return [{
          photoUrl,
          createTime: asString(typed.signedTime),
          skuId: null,
          source: "CNFans",
        }];
      });
    });

    return okResult(images);
  } catch (error) {
    console.error("CNFans QC fetch failed:", error);
    return errorResult(error);
  }
}

function dedupeImages(images: QCImage[]): QCImage[] {
  const seen = new Set<string>();

  return images.filter((image) => {
    if (seen.has(image.photoUrl)) return false;
    seen.add(image.photoUrl);
    return true;
  });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const url = isObject(body) ? body.url : undefined;

  if (typeof url !== "string" || !url.trim()) {
    return NextResponse.json({ error: "URL must be a non-empty string" }, { status: 400 });
  }

  const trimmedUrl = url.trim();

  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL is too long" }, { status: 413 });
  }

  try {
    const productData = parseProductUrl(trimmedUrl);

    if (!productData) {
      return NextResponse.json(
        { error: "Unsupported URL or product ID not found" },
        { status: 400 },
      );
    }

    const [acbuy, usfans, cnfans] = await Promise.all([
      fetchACBuyQC(productData),
      fetchUSFansQC(productData),
      fetchCNFansQC(productData),
    ]);

    const data = dedupeImages([
      ...acbuy.images,
      ...usfans.images,
      ...cnfans.images,
    ]);

    const meta = {
      product: productData,
      sources: {
        acbuy: acbuy.meta,
        usfans: usfans.meta,
        cnfans: cnfans.meta,
      },
    };

    if (data.length === 0) {
      const anySourceWorked = [acbuy.meta, usfans.meta, cnfans.meta].some((source) => source.ok);

      return NextResponse.json(
        {
          error: anySourceWorked
            ? "No QC photos found for this product"
            : "QC providers are currently unavailable",
          meta,
        },
        { status: anySourceWorked ? 404 : 502 },
      );
    }

    return NextResponse.json({ data, meta }, { status: 200 });
  } catch (error) {
    console.error("Unexpected error in /api/qc:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching QC data" },
      { status: 500 },
    );
  }
}
