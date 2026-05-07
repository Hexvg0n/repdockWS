import { NextResponse } from "next/server";

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

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
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
  const { id } = await params;
  const category = normalizeCategoryName(input.category);
  const validatedLink = validateW2CProductLink(input.link);

  if ("error" in validatedLink) {
    return new NextResponse(validatedLink.error, { status: 400 });
  }

  const { conversion, originalLink, resolved } = validatedLink;

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
      name: input.name,
      image: input.image,
      priceCny: input.priceCny,
      rating: input.rating,
      links: buildW2CProductLinks(originalLink, conversion.convertedLinks),
      metadata: {
        ...existing.metadata,
        category,
        gender: input.gender,
        weight: input.weight,
        season: input.season,
        brand: input.brand,
        sourcePlatform: resolved.platform,
        sourceProductId: resolved.id ?? "",
      },
    };

    await Promise.all([
      collection.updateOne({ id }, { $set: productPatch }),
      ensureW2CCategoryExists(
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
