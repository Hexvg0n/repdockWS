import { NextResponse } from "next/server";

import { getBBDBuyProductDetails } from "@/lib/bbdbuy-product";
import { getMongoClient } from "@/lib/mongodb";
import { buildW2CProductFilter, normalizeW2CProduct } from "@/lib/w2c-products";
import type { W2CProduct } from "@/types/w2c";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mongoClient = getMongoClient();

  if (!mongoClient) {
    return NextResponse.json({ error: "MongoDB is not configured" }, { status: 503 });
  }

  try {
    const client = await mongoClient;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    const product = await db
      .collection<W2CProduct>("w2c_products")
      .findOne(buildW2CProductFilter(id));

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const normalizedProduct = normalizeW2CProduct(product);
    const bbdbuyDetails = await getBBDBuyProductDetails(normalizedProduct);

    return NextResponse.json({ bbdbuyDetails, product: normalizedProduct });
  } catch (error) {
    console.error("W2C product GET failed", error);
    return NextResponse.json({ error: "Failed to load product" }, { status: 500 });
  }
}
