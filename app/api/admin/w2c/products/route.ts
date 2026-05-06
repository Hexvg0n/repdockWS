import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getAdminSession } from "@/lib/admin-auth";
import { convertLink } from "@/lib/converter";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { resolveLink } from "@/lib/link-resolver";
import { normalizeCategoryName, slugifyCategory } from "@/lib/w2c-categories";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { W2CCategory, W2CProduct, W2CGender } from "@/types/w2c";

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

  const body = (await request.json()) as Partial<{
    brand: string;
    category: string;
    gender: W2CGender;
    image: string;
    link: string;
    name: string;
    priceCny: number | string;
    rating: number | string;
    season: string;
    weight: number | string;
  }>;

  const validationError = validateProductBody(body);

  if (validationError) {
    return new NextResponse(validationError, { status: 400 });
  }

  const id = new ObjectId().toHexString();
  const addedAt = new Date().toISOString();
  const submittedLink = body.link!.trim();
  const conversion = convertLink(submittedLink);
  const originalLink = conversion.originalUrl ?? submittedLink;
  const category = normalizeCategoryName(body.category!);
  const resolved = resolveLink(originalLink);
  const links = buildProductLinks(originalLink, conversion.convertedLinks);

  const product: W2CProduct = {
    id,
    name: body.name!.trim(),
    image: body.image!.trim(),
    priceCny: Number(body.priceCny),
    rating: Number(body.rating ?? 4.5),
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
      weight: Number(body.weight),
      gender: body.gender === "women" ? "women" : "men",
      season: body.season!.trim(),
      brand: body.brand!.trim(),
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
      ensureCategoryExists(db.collection<W2CCategory>("w2c_categories"), category, session.globalName ?? session.username),
    ]);
  } catch (error) {
    console.error("W2C product POST failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }

  return NextResponse.json({ product });
}

async function ensureCategoryExists(
  collection: import("mongodb").Collection<W2CCategory>,
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

function buildProductLinks(
  originalLink: string,
  convertedLinks: ReturnType<typeof convertLink>["convertedLinks"],
): W2CProduct["links"] {
  const byKey = new Map(convertedLinks.map((link) => [link.key, link.url]));

  return {
    original: originalLink,
    ACBUY: byKey.get("acbuy") ?? originalLink,
    KAKOBUY: byKey.get("kakobuy") ?? originalLink,
    RIZZITGO: byKey.get("kakobuy") ?? originalLink,
    USFANS: byKey.get("usfans") ?? originalLink,
  };
}

function validateProductBody(body: Partial<Record<string, unknown>>) {
  const requiredFields = ["brand", "category", "gender", "image", "link", "name", "season"];

  for (const field of requiredFields) {
    if (typeof body[field] !== "string" || !body[field]?.toString().trim()) {
      return `Missing ${field}`;
    }
  }

  if (body.gender !== "men" && body.gender !== "women") {
    return "Invalid gender";
  }

  if (!Number.isFinite(Number(body.priceCny)) || Number(body.priceCny) <= 0) {
    return "Invalid price";
  }

  if (!Number.isFinite(Number(body.weight)) || Number(body.weight) < 0) {
    return "Invalid weight";
  }

  if (!Number.isFinite(Number(body.rating)) || Number(body.rating) < 0 || Number(body.rating) > 5) {
    return "Invalid rating";
  }

  return null;
}
