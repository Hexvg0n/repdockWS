import { NextResponse } from "next/server";
import { ObjectId } from "mongodb";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { normalizeCategoryName, slugifyCategory } from "@/lib/w2c-categories";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { W2CCategory } from "@/types/w2c";

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

    const categories = await db
      .collection<W2CCategory>("w2c_categories")
      .find({})
      .sort({ name: 1 })
      .toArray();

    return NextResponse.json({
      categories: categories.map((category) => ({
        id: category.id,
        name: category.name,
        slug: category.slug,
        createdAt: category.createdAt,
        createdBy: category.createdBy,
      })),
    });
  } catch (error) {
    console.error("W2C categories GET failed", error);
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

  const body = (await request.json()) as Partial<{ name: string }>;
  const name = normalizeCategoryName(body.name ?? "");
  const slug = slugifyCategory(name);

  if (!name || !slug) {
    return new NextResponse("Missing category name", { status: 400 });
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<W2CCategory>("w2c_categories");
    const existingCategory = await collection.findOne({ slug });

    if (existingCategory) {
      return NextResponse.json({ category: existingCategory, created: false });
    }

    const category: W2CCategory = {
      id: new ObjectId().toHexString(),
      name,
      slug,
      createdAt: new Date().toISOString(),
      createdBy: session.globalName ?? session.username,
    };

    await collection.insertOne(category);

    return NextResponse.json({ category, created: true });
  } catch (error) {
    console.error("W2C categories POST failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}
