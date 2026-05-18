import { ObjectId } from "mongodb";
import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getMongoClient, getMongoUnavailableMessage } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeOutfit, parseOutfitBody } from "@/lib/outfits";
import type { Outfit } from "@/types/outfits";

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

    const outfits = await db.collection<Outfit>("outfits").find({}).sort({ createdAt: -1 }).toArray();

    return NextResponse.json({ outfits: outfits.map((outfit) => normalizeOutfit(outfit)) });
  } catch (error) {
    console.error("Admin outfits GET failed", error);
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

  const parsedBody = parseOutfitBody((await request.json()) as Partial<Record<string, unknown>>);

  if ("error" in parsedBody) {
    return new NextResponse(parsedBody.error, { status: 400 });
  }

  const data = parsedBody.data;
  const outfit: Outfit = {
    id: new ObjectId().toHexString(),
    createdAt: new Date().toISOString(),
    createdBy: data.createdBy || session.globalName || session.username,
    createdByAvatarUrl: session.avatarUrl,
    description: data.description,
    image: data.image,
    items: data.items,
    stats: {
      likes: 0,
      views: 0,
    },
    status: data.status,
    title: data.title,
  };

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);
    await db.collection<Outfit>("outfits").insertOne(outfit);
  } catch (error) {
    console.error("Admin outfits POST failed", error);
    return new NextResponse(getMongoUnavailableMessage(error), { status: 503 });
  }

  return NextResponse.json({ outfit });
}
