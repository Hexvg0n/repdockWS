import { NextRequest, NextResponse } from "next/server";
import type { Filter, Sort } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { W2CCategory, W2CGender, W2CProduct, W2CProductsResponse } from "@/types/w2c";

const pageSize = 16;

export async function GET(request: NextRequest) {
  const params = request.nextUrl.searchParams;
  const cursor = Math.max(0, Number(params.get("cursor") ?? 0));
  const filters = readFilters(params);

  const mongoClient = getMongoClient();

  if (!mongoClient) {
    return NextResponse.json(emptyProductsResponse());
  }

  try {
    const client = await mongoClient;
    const db = client.db(process.env.MONGODB_DB ?? "repdock");
    await ensureW2CIndexes(db);

    const collection = db.collection<W2CProduct>("w2c_products");
    const categoriesCollection = db.collection<W2CCategory>("w2c_categories");
    const mongoFilter = buildMongoFilter(filters);
    const sort = buildMongoSort(filters.sort);

    const [products, total, productCategories, savedCategories, brands, seasons] = await Promise.all([
      collection.find(mongoFilter).sort(sort).skip(cursor).limit(pageSize).toArray(),
      collection.countDocuments(mongoFilter),
      collection.distinct("metadata.category"),
      categoriesCollection.find({}).sort({ name: 1 }).toArray(),
      collection.distinct("metadata.brand"),
      collection.distinct("metadata.season"),
    ]);
    const categories = mergeCategories(savedCategories, productCategories);

    const normalizedProducts = products.map((product) => ({
      ...product,
      id: String(product.id ?? product._id),
      metadata: {
        ...product.metadata,
        purchases: product.metadata.purchases ?? 0,
      },
    }));

    return NextResponse.json({
      products: normalizedProducts,
      nextCursor: cursor + products.length < total ? cursor + products.length : null,
      total,
      categories,
      brands,
      seasons,
    } satisfies W2CProductsResponse);
  } catch (error) {
    console.error("W2C MongoDB query failed", error);
    return NextResponse.json(emptyProductsResponse());
  }
}

type QueryFilters = {
  search: string;
  gender: W2CGender;
  category: string;
  brand: string;
  season: string;
  minPrice: number | null;
  maxPrice: number | null;
  sort: string;
};

function readFilters(params: URLSearchParams): QueryFilters {
  const gender = params.get("gender") === "women" ? "women" : "men";

  return {
    search: params.get("search")?.trim() ?? "",
    gender,
    category: params.get("category") ?? "All",
    brand: params.get("brand") ?? "All",
    season: params.get("season") ?? "All",
    minPrice: readNumber(params.get("minPrice")),
    maxPrice: readNumber(params.get("maxPrice")),
    sort: params.get("sort") ?? "popular",
  };
}

function readNumber(value: string | null) {
  if (!value) {
    return null;
  }

  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function buildMongoFilter(filters: QueryFilters): Filter<W2CProduct> {
  const mongoFilter: Filter<W2CProduct> = {
    "metadata.gender": filters.gender,
  };

  if (filters.search) {
    const searchRegex = {
      $regex: escapeRegex(filters.search),
      $options: "i",
    };

    mongoFilter.$or = [
      { name: searchRegex },
      { "metadata.brand": searchRegex },
      { "metadata.category": searchRegex },
    ];
  }

  if (filters.category !== "All") {
    mongoFilter["metadata.category"] = filters.category;
  }

  if (filters.brand !== "All") {
    mongoFilter["metadata.brand"] = filters.brand;
  }

  if (filters.season !== "All") {
    mongoFilter["metadata.season"] = { $in: getSeasonAliases(filters.season) };
  }

  if (filters.minPrice !== null || filters.maxPrice !== null) {
    mongoFilter.priceCny = {};

    if (filters.minPrice !== null) {
      mongoFilter.priceCny.$gte = filters.minPrice;
    }

    if (filters.maxPrice !== null) {
      mongoFilter.priceCny.$lte = filters.maxPrice;
    }
  }

  return mongoFilter;
}

function buildMongoSort(sort: string): Sort {
  if (sort === "newest") {
    return { "metadata.addedAt": -1 };
  }

  if (sort === "price-low") {
    return { priceCny: 1 };
  }

  if (sort === "price-high") {
    return { priceCny: -1 };
  }

  if (sort === "rating") {
    return { rating: -1 };
  }

  return { "metadata.clicks.week": -1 };
}

function emptyProductsResponse(): W2CProductsResponse {
  return {
    products: [],
    nextCursor: null,
    total: 0,
    categories: [],
    brands: [],
    seasons: [],
  };
}

function escapeRegex(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function getSeasonAliases(season: string) {
  if (season === "SS") {
    return ["SS", "Spring", "Summer"];
  }

  if (season === "FW") {
    return ["FW", "Autumn", "Winter"];
  }

  return [season];
}

function mergeCategories(savedCategories: W2CCategory[], productCategories: string[]) {
  const names = [...savedCategories.map((category) => category.name), ...productCategories]
    .filter((name): name is string => typeof name === "string" && Boolean(name.trim()))
    .map((name) => name.trim());

  return Array.from(new Set(names)).sort((first, second) => first.localeCompare(second));
}
