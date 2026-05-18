import { NextRequest, NextResponse } from "next/server";
import type { Filter } from "mongodb";
import { cookies } from "next/headers";
import { ObjectId } from "mongodb";

import { parseSessionCookieValue, sessionCookieName } from "@/lib/auth";
import { getMongoClient } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeOutfit, parseOutfitBody } from "@/lib/outfits";
import type { Outfit, OutfitsResponse } from "@/types/outfits";

const pageSize = 12;

export async function GET(request: NextRequest) {
  const cursor = Math.max(0, Number(request.nextUrl.searchParams.get("cursor") ?? 0));
  const search = request.nextUrl.searchParams.get("search")?.trim() ?? "";
  const clientPromise = getMongoClient();

  if (!clientPromise) {
    return NextResponse.json(emptyOutfitsResponse());
  }

  const filter: Filter<Outfit> = { status: "approved" };

  if (search) {
    const searchRegex = { $regex: escapeRegex(search), $options: "i" };
    filter.$or = [
      { title: searchRegex },
      { description: searchRegex },
      { createdBy: searchRegex },
      { "items.title": searchRegex },
    ];
  }

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<Outfit>("outfits");
    const [outfits, total] = await Promise.all([
      collection.find(filter).sort({ createdAt: -1 }).skip(cursor).limit(pageSize).toArray(),
      collection.countDocuments(filter),
    ]);

    return NextResponse.json({
      outfits: outfits.map((outfit) => normalizeOutfit(outfit)),
      nextCursor: cursor + outfits.length < total ? cursor + outfits.length : null,
      total,
    } satisfies OutfitsResponse);
  } catch (error) {
    console.error("Outfits query failed", error);
    return NextResponse.json(emptyOutfitsResponse());
  }
}

function emptyOutfitsResponse(): OutfitsResponse {
  return {
    outfits: [],
    nextCursor: null,
    total: 0,
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export async function POST(request: Request) {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(sessionCookieName)?.value);

  if (!session) {
    return new NextResponse("Login required", { status: 401 });
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
    createdBy: session.globalName || session.username,
    createdByAvatarUrl: session.avatarUrl,
    description: data.description,
    image: data.image,
    items: data.items,
    stats: {
      likes: 0,
      views: 0,
    },
    status: "pending",
    title: data.title,
  };

  try {
    const client = await clientPromise;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);
    await db.collection<Outfit>("outfits").insertOne(outfit);
  } catch (error) {
    console.error("Public outfit submit failed", error);
    return new NextResponse(error instanceof Error ? error.message : "MongoDB request failed", { status: 503 });
  }

  return NextResponse.json({ outfit: normalizeOutfit(outfit) }, { status: 201 });
}
