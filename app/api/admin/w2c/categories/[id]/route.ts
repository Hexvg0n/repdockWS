import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { normalizeCategoryName, slugifyCategory } from "@/lib/w2c-categories";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
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

  const body = (await request.json()) as Partial<{ name: string }>;
  const name = normalizeCategoryName(body.name ?? "");
  const slug = slugifyCategory(name);

  if (!name || !slug) {
    return new NextResponse("Missing category name", { status: 400 });
  }

  const { id } = await params;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<W2CCategory>("w2c_categories");
    const existing = await collection.findOne({ id });

    if (!existing) {
      return new NextResponse("Category not found", { status: 404 });
    }

    const duplicate = await collection.findOne({ slug, id: { $ne: id } });

    if (duplicate) {
      return new NextResponse("Category with this name already exists", { status: 409 });
    }

    await Promise.all([
      collection.updateOne({ id }, { $set: { name, slug } }),
      db.collection<W2CProduct>("w2c_products").updateMany(
        { "metadata.category": existing.name },
        { $set: { "metadata.category": name } },
      ),
    ]);

    const category = await collection.findOne({ id });

    return NextResponse.json({ category });
  } catch (error) {
    console.error("W2C category PATCH failed", error);
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

    const collection = db.collection<W2CCategory>("w2c_categories");
    const category = await collection.findOne({ id });

    if (!category) {
      return new NextResponse("Category not found", { status: 404 });
    }

    const fallbackName = "Uncategorized";
    const fallbackSlug = slugifyCategory(fallbackName);

    await Promise.all([
      collection.deleteOne({ id }),
      collection.updateOne(
        { slug: fallbackSlug },
        {
          $setOnInsert: {
            id: new ObjectId().toHexString(),
            name: fallbackName,
            slug: fallbackSlug,
            createdAt: new Date().toISOString(),
            createdBy: session.globalName ?? session.username,
          },
        },
        { upsert: true },
      ),
      db.collection<W2CProduct>("w2c_products").updateMany(
        { "metadata.category": category.name },
        { $set: { "metadata.category": fallbackName } },
      ),
    ]);

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("W2C category DELETE failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}
