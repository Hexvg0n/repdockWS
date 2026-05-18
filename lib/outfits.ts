import { ObjectId, type Filter } from "mongodb";

import type { Outfit, OutfitItem, OutfitStatus } from "@/types/outfits";

type MongoBackedOutfit = Outfit & {
  _id?: ObjectId;
};

export function buildOutfitFilter(id: string): Filter<Outfit> {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ id }, { _id: new ObjectId(id) }],
    } as Filter<Outfit>;
  }

  return { id };
}

export function normalizeOutfit(outfit: MongoBackedOutfit): Outfit {
  const { _id, ...plainOutfit } = outfit;

  return {
    ...plainOutfit,
    id: String(outfit.id ?? _id),
    createdByAvatarUrl: plainOutfit.createdByAvatarUrl || "",
    items: plainOutfit.items.map((item) => ({ ...item })),
    stats: {
      likes: plainOutfit.stats?.likes ?? 0,
      views: plainOutfit.stats?.views ?? 0,
    },
  };
}

export function parseOutfitBody(body: Partial<Record<string, unknown>>) {
  const title = readString(body.title);
  const description = readString(body.description);
  const image = readString(body.image);
  const createdBy = readString(body.createdBy);
  const status = readStatus(body.status);
  const items = readItems(body.items);

  if (!title) return { error: "Outfit title is required." } as const;
  if (!image) return { error: "Outfit image is required." } as const;
  if (!items.length) return { error: "Add at least one outfit item." } as const;

  return {
    data: {
      createdBy,
      description,
      image,
      items,
      status,
      title,
    },
  } as const;
}

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readStatus(value: unknown): OutfitStatus {
  if (value === "approved" || value === "pending" || value === "rejected") {
    return value;
  }

  return "pending";
}

function readItems(value: unknown): OutfitItem[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .map((item): OutfitItem | null => {
      if (!item || typeof item !== "object") {
        return null;
      }

      const record = item as Partial<Record<keyof OutfitItem, unknown>>;
      const title = readString(record.title);
      const image = readString(record.image);
      const link = readString(record.link);
      const priceCny = Number(record.priceCny);

      if (!title || !image || !link || !Number.isFinite(priceCny) || priceCny < 0) {
        return null;
      }

      return {
        id: readString(record.id) || new ObjectId().toHexString(),
        image,
        link,
        priceCny,
        title,
      };
    })
    .filter((item): item is OutfitItem => item !== null);
}
