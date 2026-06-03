import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { convertLink } from "@/lib/converter";
import { resolveLink } from "@/lib/link-resolver";

export async function GET(req: Request) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const url = searchParams.get("url");

  if (!url) {
    return new NextResponse("Missing URL", { status: 400 });
  }

  const conversion = convertLink(url);
  const originalUrl = conversion.originalUrl ?? url;
  const resolved = resolveLink(originalUrl);

  if (!resolved.id || resolved.platform === "unknown") {
    return new NextResponse("Could not parse link or unsupported platform", { status: 400 });
  }

  const { platform, id: itemId } = resolved;
  let source = "";

  switch (platform) {
    case "weidian":
      source = "WD";
      break;
    case "taobao":
      source = "TB";
      break;
    case "1688":
      source = "AL";
      break;
    case "tmall":
      source = "TM";
      break;
    default:
      source = "WD";
  }

  try {
    const detailUrl = `https://www.acbuy.com/prefix-api/store-product/product/api/item/detail?itemId=${itemId}&source=${source}`;
    const detailRes = await fetch(detailUrl, { cache: "no-store" });
    const detailJson = await detailRes.json();

    const spuId = `${source}${itemId}`;
    const weightUrl = `https://www.acbuy.com/prefix-api/store-product/product/api/getMeasureBySpuIds?spuIds=${spuId}`;
    const weightRes = await fetch(weightUrl, { cache: "no-store" });
    const weightJson = await weightRes.json();

    let price = 0;

    if (detailJson?.success && detailJson.data?.skus) {
      const skus = detailJson.data.skus;

      if (Array.isArray(skus) && skus.length > 0) {
        price = skus.reduce((min: number, sku: { price?: string; promotionPrice?: string }) => {
          const parsedPrice = Number.parseFloat(sku.price || sku.promotionPrice || "999999");
          return parsedPrice < min ? parsedPrice : min;
        }, 999999);

        if (price === 999999) {
          price = 0;
        }
      }
    } else if (detailJson?.data?.price) {
      price = Number.parseFloat(detailJson.data.price);
    }

    let weight = 0;

    if (weightJson?.success && Array.isArray(weightJson.data) && weightJson.data.length > 0) {
      weight = weightJson.data[0].weight || 0;
    }

    if (weight === 0) {
      try {
        const usfansUrl = `https://www.usfans.com/api/goods/estimate-info?goodsId=${itemId}`;
        const usfansRes = await fetch(usfansUrl, { cache: "no-store" });
        const usfansJson = await usfansRes.json();

        if (usfansJson?.success && usfansJson.data?.weight) {
          weight = usfansJson.data.weight;
        }
      } catch (usfansError) {
        console.error("USFANS Fallback Error:", usfansError);
      }
    }

    if (weight === 0) {
      try {
        const cnfansUrl = `https://cnfans.com/wp-json/openapi/v1/product/detail?skupid=${itemId}&site=cnfans&lang=en&wmc-currency=USD`;
        const cnfansRes = await fetch(cnfansUrl, {
          cache: "no-store",
          headers: {
            "From-Source-Type": "PC",
          },
        });
        const cnfansJson = await cnfansRes.json();

        if (cnfansJson?.data?.weight) {
          weight = cnfansJson.data.weight;
        }
      } catch (cnfansError) {
        console.error("CNFANS Fallback Error:", cnfansError);
      }
    }

    return NextResponse.json({
      originalUrl,
      platform,
      productId: itemId,
      price,
      weight,
      name: detailJson?.data?.title || "",
      imageUrl: detailJson?.data?.mainImgUrl || "",
    });
  } catch (error) {
    console.error("Lookup Error:", error);
    return new NextResponse("Failed to fetch data", { status: 500 });
  }
}
