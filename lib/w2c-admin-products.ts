import { ObjectId, type Collection } from "mongodb";

import { slugifyCategory } from "@/lib/w2c-categories";
import type { W2CCategory, W2CGender, W2CProduct } from "@/types/w2c";

export type W2CProductInput = {
  brand: string;
  category: string;
  gender: W2CGender;
  image: string;
  link: string;
  name: string;
  priceCny: number;
  rating: number;
  season: string;
  weight: number;
};

export function parseW2CProductBody(
  body: Partial<Record<string, unknown>>,
): { data: W2CProductInput } | { error: string } {
  const requiredFields = ["brand", "category", "gender", "image", "link", "name", "season"];
  const strings: Record<string, string> = {};

  for (const field of requiredFields) {
    const value = body[field];

    if (typeof value !== "string" || !value.trim()) {
      return { error: `Missing ${field}` };
    }

    strings[field] = value.trim();
  }

  if (strings.gender !== "men" && strings.gender !== "women") {
    return { error: "Invalid gender" };
  }

  const priceCny = Number(body.priceCny);
  const rating = body.rating === undefined || body.rating === "" ? 4.5 : Number(body.rating);
  const weight = Number(body.weight);

  if (!Number.isFinite(priceCny) || priceCny <= 0) {
    return { error: "Invalid price" };
  }

  if (!Number.isFinite(weight) || weight < 0) {
    return { error: "Invalid weight" };
  }

  if (!Number.isFinite(rating) || rating < 0 || rating > 5) {
    return { error: "Invalid rating" };
  }

  return {
    data: {
      brand: strings.brand,
      category: strings.category,
      gender: strings.gender,
      image: strings.image,
      link: strings.link,
      name: strings.name,
      priceCny,
      rating,
      season: strings.season,
      weight,
    },
  };
}

export async function ensureW2CCategoryExists(
  collection: Collection<W2CCategory>,
  categoryName: string,
  createdBy: string,
) {
  const slug = slugifyCategory(categoryName);

  if (!slug) {
    return;
  }

  await collection.updateOne(
    { slug },
    {
      $setOnInsert: {
        id: new ObjectId().toHexString(),
        name: categoryName,
        slug,
        createdAt: new Date().toISOString(),
        createdBy,
      },
    },
    { upsert: true },
  );
}

export function buildW2CProductLinks(
  originalLink: string,
  convertedLinks: Array<{ key: string; url: string }>,
): W2CProduct["links"] {
  const byKey = new Map(convertedLinks.map((link) => [link.key, link.url]));

  return {
    original: originalLink,
    ACBUY: byKey.get("acbuy") ?? originalLink,
    KAKOBUY: byKey.get("kakobuy") ?? originalLink,
    RIZZITGO: byKey.get("rizzitgo") ?? originalLink,
    USFANS: byKey.get("usfans") ?? originalLink,
  };
}
