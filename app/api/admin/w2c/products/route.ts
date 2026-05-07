import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import {
  buildW2CProductLinks,
  ensureW2CCategoryExists,
  parseW2CProductBody,
} from "@/lib/w2c-admin-products";
import { normalizeCategoryName } from "@/lib/w2c-categories";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { validateW2CProductLink } from "@/lib/w2c-link-validation";
import type { W2CCategory, W2CProduct } from "@/types/w2c";

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

    const products = await db
      .collection<W2CProduct>("w2c_products")
      .find({})
      .sort({ "metadata.addedAt": -1 })
      .toArray();

    return NextResponse.json({
      products: products.map((product) => ({
        ...product,
        id: String(product.id ?? product._id),
        metadata: {
          ...product.metadata,
          purchases: product.metadata.purchases ?? 0,
        },
      })),
    });
  } catch (error) {
    console.error("W2C products GET failed", error);
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

  const body = (await request.json()) as Partial<Record<string, unknown>>;
  const parsedBody = parseW2CProductBody(body);

  if ("error" in parsedBody) {
    return new NextResponse(parsedBody.error, { status: 400 });
  }

  const input = parsedBody.data;
  const id = new ObjectId().toHexString();
  const addedAt = new Date().toISOString();
  const category = normalizeCategoryName(input.category);
  const validatedLink = validateW2CProductLink(input.link);

  if ("error" in validatedLink) {
    return new NextResponse(validatedLink.error, { status: 400 });
  }

  const { conversion, originalLink, resolved } = validatedLink;
  const links = buildW2CProductLinks(originalLink, conversion.convertedLinks);

  const product: W2CProduct = {
    id,
    name: input.name,
    image: input.image,
    priceCny: input.priceCny,
    rating: input.rating,
    links,
    metadata: {
      addedBy: session.globalName ?? session.username,
      clicks: {
        today: 0,
        week: 0,
        allTime: 0,
      },
      purchases: 0,
      addedAt,
      category,
      weight: input.weight,
      gender: input.gender,
      season: input.season,
      brand: input.brand,
      sourcePlatform: resolved.platform,
      sourceProductId: resolved.id ?? "",
    },
  };

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);
    await Promise.all([
      db.collection<W2CProduct>("w2c_products").insertOne(product),
      ensureW2CCategoryExists(
        db.collection<W2CCategory>("w2c_categories"),
        category,
        session.globalName ?? session.username,
      ),
    ]);
  } catch (error) {
    console.error("W2C product POST failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }

  return NextResponse.json({ product });
}
