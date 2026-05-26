import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeW2CProduct } from "@/lib/w2c-products";
import type { TikTokProductSearchResponse } from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

const searchLimit = 12;

export async function GET(request: NextRequest) {
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json({ products: [] } satisfies TikTokProductSearchResponse);
  }

  const filter: Filter<W2CProduct> = {};

  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [
      { name: searchRegex },
      { "metadata.brand": searchRegex },
      { "metadata.category": searchRegex },
    ];
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const products = await db
      .collection<W2CProduct>("w2c_products")
      .find(filter)
      .sort(search ? { "metadata.clicks.week": -1 } : { "metadata.addedAt": -1 })
      .limit(searchLimit)
      .toArray();

    return NextResponse.json({
      products: products.map((product) => normalizeW2CProduct(product)),
    } satisfies TikTokProductSearchResponse);
  } catch (error) {
    console.error("TikTok product search failed", error);
    return NextResponse.json({ products: [] } satisfies TikTokProductSearchResponse);
  }
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
