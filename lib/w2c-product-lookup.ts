import { getBBDBuyProductDetails } from "@/lib/bbdbuy-product";
import { convertLink } from "@/lib/converter";
import { resolveLink, type LinkPlatform } from "@/lib/link-resolver";
import type { W2CProduct } from "@/types/w2c";

export type W2CProductLookupResult = {
  imageUrl: string;
  name: string;
  originalUrl: string;
  platform: Exclude<LinkPlatform, "unknown">;
  price: number;
  productId: string;
  weight: number;
};

type ACBuySource = "AL" | "TB" | "TM" | "WD";

const safeProductIdPattern = /^[A-Za-z0-9_-]+$/;

export async function lookupW2CProduct(url: string): Promise<W2CProductLookupResult> {
  const conversion = convertLink(url);
  const originalUrl = conversion.originalUrl ?? url;
  const resolved = resolveLink(originalUrl);

  if (!resolved.id || resolved.platform === "unknown") {
    throw new Error("Could not parse link or unsupported platform");
  }

  if (!safeProductIdPattern.test(resolved.id)) {
    throw new Error("Invalid product id");
  }

  const source = mapPlatformToACBuySource(resolved.platform);
  const detailUrl = `https://www.acbuy.com/prefix-api/store-product/product/api/item/detail?itemId=${encodeURIComponent(
    resolved.id,
  )}&source=${source}`;
  const detailRes = await fetch(detailUrl, { cache: "no-store" });
  const detailJson = await detailRes.json();

  const spuId = `${source}${resolved.id}`;
  const weightUrl = `https://www.acbuy.com/prefix-api/store-product/product/api/getMeasureBySpuIds?spuIds=${encodeURIComponent(
    spuId,
  )}`;
  const weightRes = await fetch(weightUrl, { cache: "no-store" });
  const weightJson = await weightRes.json();

  let imageUrl = readString(detailJson?.data?.mainImgUrl);
  let name = readString(detailJson?.data?.title);
  let price = readACBuyPrice(detailJson);
  let weight = readACBuyWeight(weightJson);

  if (!imageUrl || !name || price === 0) {
    const bbdbuyDetails = await readBBDBuyDetails(originalUrl, resolved.platform, resolved.id);

    if (bbdbuyDetails) {
      imageUrl = imageUrl || bbdbuyDetails.imgList[0] || "";
      name = name || bbdbuyDetails.titleTrans || bbdbuyDetails.title;
      price = price || bbdbuyDetails.priceCny || 0;
    }
  }

  if (weight === 0) {
    weight = await readUSFansWeight(resolved.id);
  }

  if (weight === 0) {
    weight = await readCNFansWeight(resolved.id);
  }

  return {
    imageUrl,
    name,
    originalUrl,
    platform: resolved.platform,
    price,
    productId: resolved.id,
    weight,
  };
}

async function readBBDBuyDetails(
  originalUrl: string,
  platform: Exclude<LinkPlatform, "unknown">,
  productId: string,
) {
  try {
    const product: W2CProduct = {
      id: `lookup:${platform}:${productId}`,
      image: "",
      links: {
        original: originalUrl,
      },
      metadata: {
        addedAt: new Date(0).toISOString(),
        addedBy: "lookup",
        brand: "",
        category: "",
        clicks: {
          allTime: 0,
          today: 0,
          week: 0,
        },
        gender: "neutral",
        purchases: 0,
        season: "",
        sourcePlatform: platform,
        sourceProductId: productId,
        weight: 0,
      },
      name: "",
      priceCny: 0,
      rating: 0,
    };

    return await getBBDBuyProductDetails(product);
  } catch (error) {
    console.error("BBDBUY lookup fallback error:", error);
    return null;
  }
}

function mapPlatformToACBuySource(platform: Exclude<LinkPlatform, "unknown">): ACBuySource {
  switch (platform) {
    case "1688":
      return "AL";
    case "taobao":
      return "TB";
    case "tmall":
      return "TM";
    case "weidian":
      return "WD";
  }
}

function readACBuyPrice(detailJson: unknown) {
  const data = readRecord(readRecord(detailJson).data);
  const skus = data.skus;

  if (Array.isArray(skus) && skus.length > 0) {
    const price = skus.reduce((min, sku) => {
      const skuRecord = readRecord(sku);
      const parsedPrice = Number.parseFloat(
        readString(skuRecord.price) || readString(skuRecord.promotionPrice) || "999999",
      );

      return parsedPrice < min ? parsedPrice : min;
    }, 999999);

    return price === 999999 ? 0 : price;
  }

  const price = Number.parseFloat(readString(data.price));
  return Number.isFinite(price) ? price : 0;
}

function readACBuyWeight(weightJson: unknown) {
  const data = readRecord(weightJson).data;

  if (!Array.isArray(data) || data.length === 0) {
    return 0;
  }

  const weight = Number(readRecord(data[0]).weight);
  return Number.isFinite(weight) && weight > 0 ? Math.round(weight) : 0;
}

async function readUSFansWeight(itemId: string) {
  try {
    const usfansUrl = `https://www.usfans.com/api/goods/estimate-info?goodsId=${encodeURIComponent(itemId)}`;
    const usfansRes = await fetch(usfansUrl, { cache: "no-store" });
    const usfansJson = await usfansRes.json();
    const data = readRecord(usfansJson).data;
    const weight = Number(readRecord(data).weight);

    return Number.isFinite(weight) && weight > 0 ? Math.round(weight) : 0;
  } catch (error) {
    console.error("USFANS fallback error:", error);
    return 0;
  }
}

async function readCNFansWeight(itemId: string) {
  try {
    const cnfansUrl = `https://cnfans.com/wp-json/openapi/v1/product/detail?skupid=${encodeURIComponent(
      itemId,
    )}&site=cnfans&lang=en&wmc-currency=USD`;
    const cnfansRes = await fetch(cnfansUrl, {
      cache: "no-store",
      headers: {
        "From-Source-Type": "PC",
      },
    });
    const cnfansJson = await cnfansRes.json();
    const weight = Number(readRecord(readRecord(cnfansJson).data).weight);

    return Number.isFinite(weight) && weight > 0 ? Math.round(weight) : 0;
  } catch (error) {
    console.error("CNFANS fallback error:", error);
    return 0;
  }
}

function readRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === "object" ? (value as Record<string, unknown>) : {};
}

function readString(value: unknown) {
  return typeof value === "string" ? value : "";
}
