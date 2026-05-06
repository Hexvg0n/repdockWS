import { NextRequest, NextResponse } from "next/server";
import { ObjectId, type Filter } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import type { W2CProduct } from "@/types/w2c";

type InteractionType = "view" | "buy";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const body = (await request.json().catch(() => ({}))) as {
    type?: InteractionType;
  };

  if (body.type !== "view" && body.type !== "buy") {
    return NextResponse.json({ error: "Invalid interaction type" }, { status: 400 });
  }

  const mongoClient = getMongoClient();

  if (!mongoClient) {
    return NextResponse.json({ ok: true });
  }

  const client = await mongoClient;
  const db = client.db(process.env.MONGODB_DB ?? "repdock");
  const collection = db.collection<W2CProduct>("w2c_products");

  const update =
    body.type === "view"
      ? {
          $inc: {
            "metadata.clicks.today": 1,
            "metadata.clicks.week": 1,
            "metadata.clicks.allTime": 1,
          },
        }
      : {
          $inc: {
            "metadata.purchases": 1,
          },
        };

  await collection.updateOne(buildProductFilter(id), update);

  return NextResponse.json({ ok: true });
}

function buildProductFilter(id: string): Filter<W2CProduct> {
  if (ObjectId.isValid(id)) {
    return {
      $or: [{ id }, { _id: new ObjectId(id) }],
    } as Filter<W2CProduct>;
  }

  return { id };
}
