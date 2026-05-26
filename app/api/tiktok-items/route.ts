import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeTikTokItem } from "@/lib/tiktok-items";
import type { TikTokItemPost, TikTokItemsResponse } from "@/types/tiktok-items";

const pageSize = 12;

export async function GET(request: NextRequest) {
  const cursor = Math.max(0, Number(request.nextUrl.searchParams.get("cursor") ?? 0));
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json(emptyTikTokItemsResponse());
  }

  const filter: Filter<TikTokItemPost> = { status: "approved" };

  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { createdBy: searchRegex },
      { "products.name": searchRegex },
      { "products.metadata.brand": searchRegex },
      { "products.metadata.category": searchRegex },
    ];
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<TikTokItemPost>("tiktok_items");
    const [items, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip(cursor).limit(pageSize).toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      items: items.map((item) => normalizeTikTokItem(item)),
      nextCursor: cursor + items.length < total ? cursor + items.length : null,
      total,
    } satisfies TikTokItemsResponse);
  } catch (error) {
    console.error("TikTok items query failed", error);
    return NextResponse.json(emptyTikTokItemsResponse());
  }
}

export async function POST() {
  return new NextResponse("TikTok items are managed from the admin panel.", { status: 405 });
}

function emptyTikTokItemsResponse(): TikTokItemsResponse {
  return {
    items: [],
    nextCursor: null,
    total: 0,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
