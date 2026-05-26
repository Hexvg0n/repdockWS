import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import {
  mapW2CProductToTikTokProduct,
  normalizeTikTokItem,
  parseTikTokItemBody,
  loadW2CProductsByIds,
} from "@/lib/tiktok-items";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { TikTokItemPost } from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

type MongoBackedProduct = W2CProduct & {
  _id?: ObjectId;
};

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return new NextResponse("MongoDB is not configured", { status: 500 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const items = await db.collection<TikTokItemPost>("tiktok_items").find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ items: items.map((item) => normalizeTikTokItem(item)) });
  } catch (error) {
    console.error("Admin TikTok items GET failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}

export async function POST(request: Request) {
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

  const data = parsedBody.data;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const products = await loadW2CProductsByIds(db.collection<MongoBackedProduct>("w2c_products"), data.productIds);

    if (!products.length) {
      return new NextResponse("Attach at least one existing W2C item.", { status: 400 });
    }

    const attachedProducts = products.map(mapW2CProductToTikTokProduct);
    const item: TikTokItemPost = {
      id: new ObjectId().toHexString(),
      coverImage: data.coverImage || attachedProducts[0]?.image || "",
      createdAt: new Date().toISOString(),
      createdBy: session.globalName || session.username,
      createdByAvatarUrl: session.avatarUrl,
      description: data.description,
      products: attachedProducts,
      stats: {
        views: 0,
      },
      status: data.status,
      tiktokUrl: data.tiktokUrl,
      title: data.title,
    };

    await db.collection<TikTokItemPost>("tiktok_items").insertOne(item);

    return NextResponse.json({ item: normalizeTikTokItem(item) }, { status: 201 });
  } catch (error) {
    console.error("Admin TikTok items POST failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}
