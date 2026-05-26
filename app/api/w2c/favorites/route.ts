import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Collection, type Filter } from "mongodb";

import { parseSessionCookieValue, sessionCookieName } from "@/lib/auth";
import { getMongoClient } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeW2CProduct } from "@/lib/w2c-products";
import type { W2CProduct } from "@/types/w2c";

type W2CFavorite = {
  createdAt: string;
  productId: string;
  userId: string;
};

type MongoBackedProduct = W2CProduct & {
  _id?: ObjectId;
};

export async function GET() {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json({ productIds: [], products: [] });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const favorites = await db
      .collection<W2CFavorite>("w2c_favorites")
      .find({ userId: session.id })
      .sort({ createdAt: -1 })
      .toArray();
    const productIds = favorites.map((favorite) => favorite.productId);
    const products = await loadProductsByIds(db.collection<MongoBackedProduct>("w2c_products"), productIds);

    return NextResponse.json({
      productIds,
      products: products.map((product) => normalizeW2CProduct(product)),
    });
  } catch (error) {
    console.error("W2C favorites GET failed", error);
    return NextResponse.json({ error: "Could not load favorites" }, { status: 503 });
  }
}

export async function POST(request: Request) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { productId?: string };
  const productId = body.productId?.trim();

  if (!productId) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const product = await db.collection<MongoBackedProduct>("w2c_products").findOne(buildProductIdFilter(productId));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    await db.collection<W2CFavorite>("w2c_favorites").updateOne(
      {
        productId: String(product.id ?? product._id),
        userId: session.id,
      },
      {
        $setOnInsert: {
          createdAt: new Date().toISOString(),
          productId: String(product.id ?? product._id),
          userId: session.id,
        },
      },
      { upsert: true },
    );

    return NextResponse.json({ favorite: true, product: normalizeW2CProduct(product) });
  } catch (error) {
    console.error("W2C favorites POST failed", error);
    return NextResponse.json({ error: "Could not save favorite" }, { status: 503 });
  }
}

export async function DELETE(request: NextRequest) {
  const session = await getSession();

  if (!session) {
    return NextResponse.json({ error: "Login required" }, { status: 401 });
  }

  const body = (await request.json().catch(() => ({}))) as { productId?: string };
  const productId = body.productId?.trim() || request.nextUrl.searchParams.get("productId")?.trim();

  if (!productId) {
    return NextResponse.json({ error: "Product id is required" }, { status: 400 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 500 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    await db.collection<W2CFavorite>("w2c_favorites").deleteOne({
      productId,
      userId: session.id,
    });

    return NextResponse.json({ favorite: false });
  } catch (error) {
    console.error("W2C favorites DELETE failed", error);
    return NextResponse.json({ error: "Could not remove favorite" }, { status: 503 });
  }
}

async function getSession() {
  const cookieStore = await cookies();
  return parseSessionCookieValue(cookieStore.get(sessionCookieName)?.value);
}

async function loadProductsByIds(collection: Collection<MongoBackedProduct>, productIds: string[]) {
  if (!productIds.length) {
    return [];
  }

  const objectIds = productIds.filter(ObjectId.isValid).map((id) => new ObjectId(id));
  const filter: Filter<MongoBackedProduct> = {
    $or: [
      { id: { $in: productIds } },
      ...(objectIds.length ? [{ _id: { $in: objectIds } }] : []),
    ],
  };
  const products = await collection.find(filter).toArray();
  const byId = new Map(products.map((product) => [String(product.id ?? product._id), product]));
  const orderedProducts: MongoBackedProduct[] = [];

  for (const productId of productIds) {
    const product = byId.get(productId);

    if (product) {
      orderedProducts.push(product);
    }
  }

  return orderedProducts;
}

function buildProductIdFilter(productId: string): Filter<MongoBackedProduct> {
  if (ObjectId.isValid(productId)) {
    return {
      $or: [{ id: productId }, { _id: new ObjectId(productId) }],
    } as Filter<MongoBackedProduct>;
  }

  return { id: productId } as Filter<MongoBackedProduct>;
}
