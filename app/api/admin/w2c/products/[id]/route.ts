import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getAdminSession } from "@/lib/admin-auth";
import { convertLink } from "@/lib/converter";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { resolveLink } from "@/lib/link-resolver";
import { normalizeCategoryName, slugifyCategory } from "@/lib/w2c-categories";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { W2CCategory, W2CGender, W2CProduct } from "@/types/w2c";

type ProductBody = Partial<{
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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return new NextResponse("MongoDB is not configured", { status: 500 });
  }

  const body = (await request.json()) as ProductBody;
  const validationError = validateProductBody(body);

  if (validationError) {
    return new NextResponse(validationError, { status: 400 });
  }

  const { id } = await params;
  const submittedLink = body.link!.trim();
  const conversion = convertLink(submittedLink);
  const originalLink = conversion.originalUrl ?? submittedLink;
  const category = normalizeCategoryName(body.category!);
  const resolved = resolveLink(originalLink);

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<W2CProduct>("w2c_products");
    const existing = await collection.findOne({ id });

    if (!existing) {
      return new NextResponse("Product not found", { status: 404 });
    }

    const productPatch: Partial<W2CProduct> = {
      name: body.name!.trim(),
      image: body.image!.trim(),
      priceCny: Number(body.priceCny),
      rating: Number(body.rating ?? 4.5),
      links: buildProductLinks(originalLink, conversion.convertedLinks),
      metadata: {
        ...existing.metadata,
        category,
        gender: body.gender === "women" ? "women" : "men",
        weight: Number(body.weight),
        season: body.season!.trim(),
        brand: body.brand!.trim(),
        sourcePlatform: resolved.platform,
        sourceProductId: resolved.id ?? "",
      },
    };

    await Promise.all([
      collection.updateOne({ id }, { $set: productPatch }),
      ensureCategoryExists(
        db.collection<W2CCategory>("w2c_categories"),
        category,
        session.globalName ?? session.username,
      ),
    ]);

    const product = await collection.findOne({ id });

    return NextResponse.json({ product });
  } catch (error) {
    console.error("W2C product PATCH failed", error);
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
    const result = await db.collection<W2CProduct>("w2c_products").deleteOne({ id });

    if (!result.deletedCount) {
      return new NextResponse("Product not found", { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("W2C product DELETE failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
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
