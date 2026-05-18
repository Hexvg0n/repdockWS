import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { buildOutfitFilter, normalizeOutfit, parseOutfitBody } from "@/lib/outfits";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { Outfit } from "@/types/outfits";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return new NextResponse("MongoDB is not configured", { status: 500 });
  }

  const parsedBody = parseOutfitBody((await request.json()) as Partial<Record<string, unknown>>);

  if ("error" in parsedBody) {
    return new NextResponse(parsedBody.error, { status: 400 });
  }

  const { id } = await params;
  const data = parsedBody.data;

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<Outfit>("outfits");
    const existing = await collection.findOne(buildOutfitFilter(id));

    if (!existing) {
      return new NextResponse("Outfit not found", { status: 404 });
    }

    const result = await collection.updateOne(buildOutfitFilter(id), {
      $set: {
        createdBy: data.createdBy || session.globalName || session.username,
        createdByAvatarUrl: existing.createdByAvatarUrl || session.avatarUrl,
        description: data.description,
        image: data.image,
        items: data.items,
        status: data.status,
        title: data.title,
      },
    });

    const outfit = await collection.findOne(buildOutfitFilter(id));

    return NextResponse.json({ outfit: outfit ? normalizeOutfit(outfit) : null });
  } catch (error) {
    console.error("Admin outfits PATCH failed", error);
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
    const result = await db.collection<Outfit>("outfits").deleteOne(buildOutfitFilter(id));

    if (!result.deletedCount) {
      return new NextResponse("Outfit not found", { status: 404 });
    }

    return NextResponse.json({ deleted: true });
  } catch (error) {
    console.error("Admin outfits DELETE failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }
}
