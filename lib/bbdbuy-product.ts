import { resolveLink, type LinkPlatform } from "@/lib/link-resolver";
import type { W2CBBDBuyProductDetails, W2CProduct } from "@/types/w2c";

type BBDBuySource = "WEIDIAN" | "TAOBAO" | "1688";
type ACBuySource = "WD" | "TB" | "AL" | "TM";

type BBDBuyResponse = {
  code?: number;
  success?: boolean;
  data?: {
    productInfo?: BBDBuyProductInfo;
    productDetail?: {
      productDescImgList?: unknown;
    };
  };
  msg?: string;
};

type BBDBuyProductInfo = {
  title?: unknown;
  titleTrans?: unknown;
  source?: unknown;
  sourceProductId?: unknown;
  productUrl?: unknown;
  skuList?: unknown;
  skuPropList?: unknown;
  imgList?: unknown;
  sales?: unknown;
  postFee?: unknown;
  daysToArrival?: unknown;
  minNum?: unknown;
  sellerInfo?: unknown;
  price?: unknown;
};

type BBDBuySku = {
  skuID?: unknown;
  propId_valueId?: unknown;
  propName_valueName?: unknown;
  imgUrl?: unknown;
  stock?: unknown;
  valueIdList?: unknown;
  price?: unknown;
};

type BBDBuySkuProp = {
  propId?: unknown;
  propName?: unknown;
  propNameTrans?: unknown;
  propValueList?: unknown;
};

type BBDBuySkuPropValue = {
  valueID?: unknown;
  valueId?: unknown;
  valueName?: unknown;
  valueNameTrans?: unknown;
};

const bbdbuyProductEndpoint = "https://www.bbdbuyeu.com/api/product/search/id";
const acbuyProductEndpoint = "https://www.acbuy.com/prefix-api/store-product/product/api/item/detail";

export async function getBBDBuyProductDetails(product: W2CProduct) {
  const identity = getProductIdentity(product);

  if (!identity) {
    return null;
  }

  const endpoint = process.env.BBDBUY_PRODUCT_ENDPOINT ?? bbdbuyProductEndpoint;

  try {
    const response = await fetch(endpoint, {
      method: "POST",
      cache: "no-store",
      headers: buildBBDBuyHeaders(),
      body: JSON.stringify({
        source: identity.source,
        sourceProductId: identity.sourceProductId,
      }),
    });

    if (!response.ok) {
      return getACBuyProductDetails(product);
    }

    const data = (await response.json()) as BBDBuyResponse;

    if (!data.success || !data.data?.productInfo) {
      return getACBuyProductDetails(product);
    }

    return mapBBDBuyDetails(data, identity);
  } catch (error) {
    console.warn("BBDBuy product lookup crashed, using fallback", error);
    return getACBuyProductDetails(product);
  }
}

async function getACBuyProductDetails(product: W2CProduct) {
  const identity = getACBuyProductIdentity(product);

  if (!identity) {
    return null;
  }

  const endpoint = process.env.ACBUY_PRODUCT_ENDPOINT ?? acbuyProductEndpoint;
  const url = new URL(endpoint);
  url.searchParams.set("itemId", identity.sourceProductId);
  url.searchParams.set("source", identity.source);

  try {
    const response = await fetch(url, {
      cache: "no-store",
      headers: {
        Accept: "application/json",
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36",
      },
    });

    if (!response.ok) {
      console.warn("ACBuy product fallback failed", {
        status: response.status,
        source: identity.source,
        sourceProductId: identity.sourceProductId,
      });
      return null;
    }

    const data = (await response.json()) as ACBuyResponse;

    if (data.code !== 200 || !data.data) {
      console.warn("ACBuy product fallback returned no product", {
        code: data.code,
        message: data.msg,
        source: identity.source,
        sourceProductId: identity.sourceProductId,
      });
      return null;
    }

    return mapACBuyDetails(data.data, identity);
  } catch (error) {
    console.warn("ACBuy product fallback crashed", error);
    return null;
  }
}

function getProductIdentity(product: W2CProduct) {
  const fromMetadata = mapPlatformToBBDBuySource(product.metadata.sourcePlatform);

  if (fromMetadata && product.metadata.sourceProductId) {
    return {
      source: fromMetadata,
      sourceProductId: product.metadata.sourceProductId,
    };
  }

  const resolved = resolveLink(product.links.original);
  const source = mapPlatformToBBDBuySource(resolved.platform);

  if (!source || !resolved.id) {
    return null;
  }

  return {
    source,
    sourceProductId: resolved.id,
  };
}

function getACBuyProductIdentity(product: W2CProduct) {
  const fromMetadata = mapPlatformToACBuySource(product.metadata.sourcePlatform);

  if (fromMetadata && product.metadata.sourceProductId) {
    return {
      source: fromMetadata,
      sourceProductId: product.metadata.sourceProductId,
    };
  }

  const resolved = resolveLink(product.links.original);
  const source = mapPlatformToACBuySource(resolved.platform);

  if (!source || !resolved.id) {
    return null;
  }

  return {
    source,
    sourceProductId: resolved.id,
  };
}

function mapPlatformToBBDBuySource(platform?: LinkPlatform | string | null): BBDBuySource | null {
  const normalized = String(platform ?? "").toLowerCase();

  if (normalized === "weidian" || normalized === "wd" || normalized === "weidian.com") {
    return "WEIDIAN";
  }

  if (normalized === "taobao" || normalized === "tmall" || normalized === "tb" || normalized === "tm") {
    return "TAOBAO";
  }

  if (normalized === "1688" || normalized === "al" || normalized === "ali_1688") {
    return "1688";
  }

  return null;
}

function mapPlatformToACBuySource(platform?: LinkPlatform | string | null): ACBuySource | null {
  const normalized = String(platform ?? "").toLowerCase();

  if (normalized === "weidian" || normalized === "wd" || normalized === "weidian.com") {
    return "WD";
  }

  if (normalized === "taobao" || normalized === "tb") {
    return "TB";
  }

  if (normalized === "tmall" || normalized === "tm") {
    return "TM";
  }

  if (normalized === "1688" || normalized === "al" || normalized === "ali_1688") {
    return "AL";
  }

  return null;
}

function buildBBDBuyHeaders(): HeadersInit {
  const headers: Record<string, string> = {
    Accept: "application/json, text/plain, */*",
    "Content-Type": "application/json",
    "User-Agent":
      "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome Safari/537.36",
    "X-Currency": process.env.BBDBUY_CURRENCY ?? "CNY",
    "X-Language": process.env.BBDBUY_LANGUAGE ?? "en",
    "X-Timezone": process.env.BBDBUY_TIMEZONE ?? "Asia/Shanghai",
  };

  if (process.env.BBDBUY_COOKIE) {
    headers.Cookie = process.env.BBDBUY_COOKIE;
  }

  if (process.env.BBDBUY_AUTHORIZATION) {
    headers.Authorization = process.env.BBDBUY_AUTHORIZATION;
  }

  return headers;
}

function mapBBDBuyDetails(
  response: BBDBuyResponse,
  identity: { source: BBDBuySource; sourceProductId: string },
): W2CBBDBuyProductDetails {
  const productInfo = response.data?.productInfo ?? {};
  const skuList = readArray<BBDBuySku>(productInfo.skuList).map(mapSku);
  const priceCny = readNumber(productInfo.price) ?? getMinSkuPrice(skuList);

  return {
    title: readString(productInfo.title),
    titleTrans: readString(productInfo.titleTrans),
    source: readString(productInfo.source) || identity.source,
    sourceProductId: readString(productInfo.sourceProductId) || identity.sourceProductId,
    productUrl: readString(productInfo.productUrl),
    priceCny,
    postFee: readNullableString(productInfo.postFee),
    daysToArrival: readNumber(productInfo.daysToArrival),
    minNum: readNumber(productInfo.minNum),
    sales: readNumber(productInfo.sales),
    totalStock: skuList.reduce((sum, sku) => sum + sku.stock, 0),
    seller: mapSeller(productInfo.sellerInfo),
    skuList,
    skuPropList: readArray<BBDBuySkuProp>(productInfo.skuPropList).map(mapSkuProp),
    imgList: uniqueStrings(readArray(productInfo.imgList).map(readString)),
    detailImages: uniqueStrings(
      readArray(response.data?.productDetail?.productDescImgList).map(readString),
    ),
    fetchedAt: new Date().toISOString(),
  };
}

type ACBuyResponse = {
  code?: number;
  msg?: string;
  data?: ACBuyProductInfo;
};

type ACBuyProductInfo = {
  detailUrl?: unknown;
  description?: unknown;
  images?: unknown;
  minNum?: unknown;
  picUrl?: unknown;
  postFee?: unknown;
  price?: unknown;
  saleCount?: unknown;
  sales?: unknown;
  sellerInfo?: unknown;
  skus?: unknown;
  source?: unknown;
  startQuantity?: unknown;
  thirdGoodsId?: unknown;
  title?: unknown;
  titleEn?: unknown;
};

type ACBuySku = {
  picUrl?: unknown;
  price?: unknown;
  promotionPrice?: unknown;
  propArr?: unknown;
  quantity?: unknown;
  skuId?: unknown;
  thirdSkuId?: unknown;
};

type ACBuySkuPropItem = {
  attribute_index?: unknown;
  prop_Id?: unknown;
  prop_name?: unknown;
  prop_name_en?: unknown;
  value_id?: unknown;
  value_name?: unknown;
  value_name_en?: unknown;
};

function mapACBuyDetails(
  productInfo: ACBuyProductInfo,
  identity: { source: ACBuySource; sourceProductId: string },
): W2CBBDBuyProductDetails {
  const skuList = readArray<ACBuySku>(productInfo.skus).map(mapACBuySku);
  const images = uniqueStrings([
    ...readArray(productInfo.images).map((image) => normalizeImageUrl(readString(image))),
    normalizeImageUrl(readString(productInfo.picUrl)),
    ...skuList.map((sku) => sku.image ?? ""),
  ]);
  const detailImages = extractDescriptionImages(readString(productInfo.description));
  const priceCny = getMinSkuPrice(skuList) ?? normalizeACBuyPrice(productInfo.price);

  return {
    title: readString(productInfo.title),
    titleTrans: readString(productInfo.titleEn) || readString(productInfo.title),
    source: readString(productInfo.source) || identity.source,
    sourceProductId: readString(productInfo.thirdGoodsId) || identity.sourceProductId,
    productUrl: readString(productInfo.detailUrl),
    priceCny,
    postFee: readNullableString(productInfo.postFee),
    daysToArrival: null,
    minNum: readNumber(productInfo.minNum) ?? readNumber(productInfo.startQuantity),
    sales: readNumber(productInfo.sales) ?? readNumber(productInfo.saleCount),
    totalStock: skuList.reduce((sum, sku) => sum + sku.stock, 0),
    seller: mapACBuySeller(productInfo.sellerInfo),
    skuList,
    skuPropList: buildACBuySkuProps(readArray<ACBuySku>(productInfo.skus)),
    imgList: images,
    detailImages,
    fetchedAt: new Date().toISOString(),
  };
}

function mapACBuySku(sku: ACBuySku) {
  const propItems = readACBuySkuProps(sku).sort(compareACBuyPropIndex);
  const valueIdList = propItems.map(getACBuyValueId).filter(Boolean);

  return {
    id: readString(sku.skuId) || readString(sku.thirdSkuId),
    propIdValueId: propItems
      .map((prop) => `${readACBuyPropId(prop)}:${getACBuyValueId(prop)}`)
      .filter((value) => !value.endsWith(":"))
      .join(";"),
    propNameValueName: propItems
      .map((prop) => `${readString(prop.prop_name_en) || readString(prop.prop_name)}:${readString(prop.value_name_en) || readString(prop.value_name)}`)
      .join(";"),
    image: normalizeImageUrl(readNullableString(sku.picUrl)),
    stock: readNumber(sku.quantity) ?? 0,
    valueIdList,
    priceCny: readNumber(sku.price) ?? readNumber(sku.promotionPrice),
  };
}

function buildACBuySkuProps(skus: ACBuySku[]) {
  const props = new Map<
    string,
    {
      index: number;
      propId: string;
      propName: string;
      propNameTrans: string;
      values: Map<string, { valueId: string; valueName: string; valueNameTrans: string }>;
    }
  >();

  for (const sku of skus) {
    for (const propItem of readACBuySkuProps(sku)) {
      const propId = readACBuyPropId(propItem);
      const valueId = getACBuyValueId(propItem);

      if (!propId || !valueId) {
        continue;
      }

      const existing = props.get(propId) ?? {
        index: readACBuyPropIndex(propItem),
        propId,
        propName: readString(propItem.prop_name),
        propNameTrans: readString(propItem.prop_name_en),
        values: new Map(),
      };

      existing.values.set(valueId, {
        valueId,
        valueName: readString(propItem.value_name),
        valueNameTrans: readString(propItem.value_name_en) || readString(propItem.value_name),
      });
      props.set(propId, existing);
    }
  }

  return Array.from(props.values())
    .sort((first, second) => first.index - second.index)
    .map((prop) => ({
      propId: prop.propId,
      propName: prop.propName,
      propNameTrans: prop.propNameTrans || prop.propName,
      propValueList: Array.from(prop.values.values()),
    }));
}

function readACBuySkuProps(sku: ACBuySku) {
  return readArray<ACBuySkuPropItem>(sku.propArr);
}

function readACBuyPropIndex(prop: ACBuySkuPropItem) {
  const index = readNumber(prop.attribute_index);
  return typeof index === "number" ? index : 0;
}

function readACBuyPropId(prop: ACBuySkuPropItem) {
  return readString(prop.prop_Id) || readString(prop.prop_name_en) || readString(prop.prop_name) || String(readACBuyPropIndex(prop));
}

function getACBuyValueId(prop: ACBuySkuPropItem) {
  return readString(prop.value_id) || `${readACBuyPropId(prop)}:${readString(prop.value_name)}`;
}

function compareACBuyPropIndex(first: ACBuySkuPropItem, second: ACBuySkuPropItem) {
  return readACBuyPropIndex(first) - readACBuyPropIndex(second);
}

function mapACBuySeller(sellerInfo: unknown) {
  if (!sellerInfo || typeof sellerInfo !== "object") {
    return null;
  }

  const seller = sellerInfo as Record<string, unknown>;
  const shopName = readString(seller.shopName ?? seller.nick ?? seller.title);

  if (!shopName) {
    return null;
  }

  return {
    shopId: readString(seller.shopId ?? seller.sid ?? seller.userNumId),
    shopName,
    shopUrl: readString(seller.shopUrl),
  };
}

function mapSku(sku: BBDBuySku) {
  return {
    id: readString(sku.skuID),
    propIdValueId: readString(sku.propId_valueId),
    propNameValueName: readString(sku.propName_valueName),
    image: normalizeImageUrl(readNullableString(sku.imgUrl)),
    stock: readNumber(sku.stock) ?? 0,
    valueIdList: readValueIds(sku),
    priceCny: readNumber(sku.price),
  };
}

function mapSkuProp(prop: BBDBuySkuProp) {
  return {
    propId: readString(prop.propId),
    propName: readString(prop.propName),
    propNameTrans: readString(prop.propNameTrans),
    propValueList: readArray<BBDBuySkuPropValue>(prop.propValueList).map((value) => ({
      valueId: readString(value.valueID ?? value.valueId),
      valueName: readString(value.valueName),
      valueNameTrans: readString(value.valueNameTrans),
    })),
  };
}

function readValueIds(sku: BBDBuySku) {
  const list = readArray(sku.valueIdList).map(readString).filter(Boolean);

  if (list.length > 0) {
    return list;
  }

  return readString(sku.propId_valueId)
    .split(";")
    .map((pair) => pair.split(":")[1])
    .filter(Boolean);
}

function mapSeller(sellerInfo: unknown) {
  if (!sellerInfo || typeof sellerInfo !== "object") {
    return null;
  }

  const seller = sellerInfo as Record<string, unknown>;
  const shopName = readString(seller.shopName);

  if (!shopName) {
    return null;
  }

  return {
    shopId: readString(seller.shopId),
    shopName,
    shopUrl: readString(seller.shopUrl),
  };
}

function readArray<T = unknown>(value: unknown) {
  return Array.isArray(value) ? (value as T[]) : [];
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : value === undefined || value === null ? "" : String(value);
}

function readNullableString(value: unknown) {
  const text = readString(value);
  return text || null;
}

function readNumber(value: unknown) {
  const number = Number(value);
  return Number.isFinite(number) ? number : null;
}

function getMinSkuPrice(skuList: Array<{ priceCny: number | null }>) {
  const prices = skuList
    .map((sku) => sku.priceCny)
    .filter((price): price is number => typeof price === "number" && Number.isFinite(price));

  return prices.length ? Math.min(...prices) : null;
}

function normalizeACBuyPrice(value: unknown) {
  const price = readNumber(value);

  if (price === null) {
    return null;
  }

  return price > 1000 ? price / 100 : price;
}

function extractDescriptionImages(description: string) {
  const images = Array.from(description.matchAll(/<img[^>]+src=["']?([^"'\s>]+)["']?/gi)).map((match) =>
    normalizeImageUrl(match[1]) ?? "",
  );

  return uniqueStrings(images);
}

function normalizeImageUrl(value: string | null) {
  if (!value) {
    return null;
  }

  if (value.startsWith("//")) {
    return `https:${value}`;
  }

  if (value.startsWith("http://") || value.startsWith("https://")) {
    return value;
  }

  return value;
}

function uniqueStrings(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value))));
}
