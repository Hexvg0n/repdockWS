import { NextRequest, NextResponse } from "next/server";
import type { Filter, Sort } from "mongodb";

import { getMongoClient } from "@/lib/mongodb";
import { getWeekKey } from "@/lib/w2c-interaction-periods";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import { normalizeW2CProduct } from "@/lib/w2c-products";
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
    const productsPromise =
      filters.sort === "popular"
        ? collection
            .aggregate<W2CProduct>([
              { $match: mongoFilter },
              {
                $addFields: {
                  "__sort.weekClicks": {
                    $cond: [
                      { $eq: ["$metadata.clicks.weekKey", getWeekKey(new Date())] },
                      { $ifNull: ["$metadata.clicks.week", 0] },
                      0,
                    ],
                  },
                  "__sort.purchases": { $ifNull: ["$metadata.purchases", 0] },
                  "__sort.allTimeClicks": { $ifNull: ["$metadata.clicks.allTime", 0] },
                  "__sort.rating": { $ifNull: ["$rating", 0] },
                },
              },
              {
                $sort: {
                  "__sort.weekClicks": -1,
                  "__sort.purchases": -1,
                  "__sort.allTimeClicks": -1,
                  "__sort.rating": -1,
                  "metadata.addedAt": -1,
                  _id: -1,
                },
              },
              { $skip: cursor },
              { $limit: pageSize },
              { $project: { __sort: 0 } },
            ])
            .toArray()
        : collection.find(mongoFilter).sort(sort).skip(cursor).limit(pageSize).toArray();

    const [products, total, productCategories, savedCategories, brands, seasons] = await Promise.all([
      productsPromise,
      collection.countDocuments(mongoFilter),
      collection.distinct("metadata.category"),
      categoriesCollection.find({}).sort({ name: 1 }).toArray(),
      collection.distinct("metadata.brand"),
      collection.distinct("metadata.season"),
    ]);
    const categories = mergeCategories(savedCategories, productCategories);

    const normalizedProducts = products.map((product) => normalizeW2CProduct(product));

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
    sort: readSort(params.get("sort")),
  };
}

function readSort(value: string | null) {
  if (
    value === "newest" ||
    value === "price-low" ||
    value === "price-high" ||
    value === "rating" ||
    value === "popular"
  ) {
    return value;
  }

  return "newest";
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
    "metadata.gender": { $in: [filters.gender, "neutral"] },
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
    return { "metadata.addedAt": -1, _id: -1 };
  }

  if (sort === "price-low") {
    return { priceCny: 1, "metadata.addedAt": -1, _id: -1 };
  }

  if (sort === "price-high") {
    return { priceCny: -1, "metadata.addedAt": -1, _id: -1 };
  }

  if (sort === "rating") {
    return { rating: -1, "metadata.clicks.allTime": -1, "metadata.addedAt": -1, _id: -1 };
  }

  return { "metadata.addedAt": -1, _id: -1 };
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
