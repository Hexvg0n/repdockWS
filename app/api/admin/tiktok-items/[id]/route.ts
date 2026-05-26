import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import {
  mapW2CProductToTikTokProduct,
  buildTikTokItemFilter,
  normalizeTikTokItem,
  parseTikTokItemBody,
  loadW2CProductsByIds,
} from "@/lib/tiktok-items";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { TikTokItemPost } from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

type MongoBackedProduct = W2CProduct & {
  _id?: import("mongodb").ObjectId;
};

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return new NextResponse("MongoDB is not configured", { status: 500 });
  }

  const parsedBody = parseTikTokItemBody((await request.json()) as Partial<Record<string, unknown>>);

  if ("error" in parsedBody) {
    return new NextResponse(parsedBody.error, { status: 400 });
  }

  const { id } = await params;
  const data = parsedBody.data;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<TikTokItemPost>("tiktok_items");
    const existing = await collection.findOne(buildTikTokItemFilter(id));

    if (!existing) {
      return new NextResponse("TikTok item not found", { status: 404 });
    }

    const products = await loadW2CProductsByIds(db.collection<MongoBackedProduct>("w2c_products"), data.productIds);

    if (!products.length) {
      return new NextResponse("Attach at least one existing W2C item.", { status: 400 });
    }

    const attachedProducts = products.map(mapW2CProductToTikTokProduct);

    await collection.updateOne(buildTikTokItemFilter(id), {
      $set: {
        coverImage: data.coverImage || attachedProducts[0]?.image || "",
        description: data.description,
        products: attachedProducts,
        status: data.status,
        tiktokUrl: data.tiktokUrl,
        title: data.title,
      },
    });

    const item = await collection.findOne(buildTikTokItemFilter(id));

    return NextResponse.json({ item: item ? normalizeTikTokItem(item) : null });
  } catch (error) {
    console.error("Admin TikTok items PATCH failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return new NextResponse("MongoDB is not configured", { status: 500 });
  }

  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const result = await db.collection<TikTokItemPost>("tiktok_items").deleteOne(buildTikTokItemFilter(id));

    if (!result.deletedCount) {
      return new NextResponse("TikTok item not found", { status: 404 });
    }

    await db.collection("tiktok_item_views").deleteMany({ itemId: id });

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Admin TikTok items DELETE failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}
