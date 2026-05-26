import { ObjectId, type Collection, type Filter } from "mongodb";

import { normalizeW2CProduct } from "@/lib/w2c-products";
import type { TikTokAttachedProduct, TikTokItemPost, TikTokItemStatus } from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

type MongoBackedTikTokItem = TikTokItemPost & {
  _id?: ObjectId;
};

type MongoBackedProduct = W2CProduct & {
  _id?: ObjectId;
};

export function buildTikTokItemFilter(id: string): Filter<TikTokItemPost> {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ id }, { _id: new ObjectId(id) }],
    } as Filter<TikTokItemPost>;
  }

  return { id };
}

export function normalizeTikTokItem(item: MongoBackedTikTokItem): TikTokItemPost {
  const { _id, ...plainItem } = item;

  return {
    ...plainItem,
    id: String(item.id ?? _id),
    coverImage: plainItem.coverImage || plainItem.products[0]?.image || "",
    createdByAvatarUrl: plainItem.createdByAvatarUrl || "",
    products: plainItem.products.map((product) => ({ ...product, links: { ...product.links } })),
    stats: {
      views: plainItem.stats?.views ?? 0,
    },
  };
}

export function parseTikTokItemBody(body: Partial<Record<string, unknown>>) {
  const title = readString(body.title);
  const description = readString(body.description);
  const tiktokUrl = readString(body.tiktokUrl);
  const coverImage = readString(body.coverImage);
  const productIds = readStringArray(body.productIds).slice(0, 12);
  const status = readStatus(body.status);

  if (!title) return { error: "TikTok title is required." } as const;
  if (!isTikTokUrl(tiktokUrl)) return { error: "A valid TikTok URL is required." } as const;
  if (!productIds.length) return { error: "Attach at least one W2C item." } as const;

  return {
    data: {
      coverImage,
      description,
      productIds,
      status,
      tiktokUrl,
      title,
    },
  } as const;
}

export function mapW2CProductToTikTokProduct(product: W2CProduct): TikTokAttachedProduct {
  const normalizedProduct = normalizeW2CProduct(product);

  return {
    productId: normalizedProduct.id,
    name: normalizedProduct.name,
    image: normalizedProduct.image,
    priceCny: normalizedProduct.priceCny,
    links: { ...normalizedProduct.links },
    metadata: {
      brand: normalizedProduct.metadata.brand,
      category: normalizedProduct.metadata.category,
      gender: normalizedProduct.metadata.gender,
      season: normalizedProduct.metadata.season,
    },
  };
}

export async function loadW2CProductsByIds(collection: Collection<MongoBackedProduct>, productIds: string[]) {
  const objectIds = productIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const filter: Filter<MongoBackedProduct> = {
    $or: [
      { id: { $in: productIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
  const products = await collection.find(filter).toArray();
  const byId = new Map<string, MongoBackedProduct>();

  for (const product of products) {
    byId.set(String(product.id ?? product._id), product);
  }

  const orderedProducts: MongoBackedProduct[] = [];

  for (const id of productIds) {
    const product = byId.get(id);

    if (product) {
      orderedProducts.push(product);
    }
  }

  return orderedProducts;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStringArray(value: unknown) {
  if (!Array.isArray(value)) {
    return [];
  }

  return Array.from(
    new Set(
      value
        .map(readString)
        .filter(Boolean),
    ),
  );
}

function readStatus(value: unknown): TikTokItemStatus {
  if (value === "approved" || value === "pending" || value === "rejected") {
    return value;
  }

  return "pending";
}

function isTikTokUrl(value: string) {
  if (!value) {
    return false;
  }

  try {
    const url = new URL(value);
    const hostname = url.hostname.toLowerCase();
    return hostname === "tiktok.com" || hostname.endsWith(".tiktok.com");
  } catch {
    return false;
  }
}
