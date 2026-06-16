import { NextResponse } from "next/server";

import { lookupW2CProduct } from "@/lib/w2c-product-lookup";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  try {
    return NextResponse.json(await lookupW2CProduct(url));
  } catch (error) {
    console.error("W2C public lookup error:", error);
    return new NextResponse(error instanceof Error ? error.message : "Failed to fetch product data", {
      status: 400,
    });
  }
}
