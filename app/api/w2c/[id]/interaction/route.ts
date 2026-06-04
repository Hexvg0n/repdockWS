import { randomUUID } from "node:crypto";

import type { Collection } from "mongodb";
import { NextRequest, NextResponse } from "next/server";

import { getMongoClient } from "@/lib/mongodb";
import { getDayKey, getWeekKey } from "@/lib/w2c-interaction-periods";
import { buildW2CProductFilter } from "@/lib/w2c-products";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { W2CProduct } from "@/types/w2c";

type InteractionType = "view" | "buy";

type W2CInteraction = {
  anonymousId: string;
  createdAt: string;
  lastDayKey: string;
  lastSeenAt: string;
  lastWeekKey: string;
  productId: string;
  type: InteractionType;
};

const anonymousCookieName = "repdock_anon_id";
const anonymousCookieMaxAge = 60 * 60 * 24 * 400;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;
const interactionRateLimit = new Map<string, { count: number; resetAt: number }>();

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
    return buildInteractionResponse({ counted: false, newAnonymousId: null });
  }

  const { anonymousId, newAnonymousId } = getAnonymousId(request);
  const rateLimitKey = `${anonymousId}:${id}`;

  if (isRateLimited(rateLimitKey)) {
    return buildInteractionResponse(
      { counted: false, newAnonymousId },
      { error: "Too many interaction requests" },
      429,
    );
  }

  const client = await mongoClient;
  const db = client.db(process.env.MONGODB_DB ?? "repdock");
  await ensureW2CIndexes(db);

  const products = db.collection<W2CProduct>("w2c_products");
  const interactions = db.collection<W2CInteraction>("w2c_interactions");
  const now = new Date();
  const nowIso = now.toISOString();
  const dayKey = getDayKey(now);
  const weekKey = getWeekKey(now);
  const interactionFilter = {
    anonymousId,
    productId: id,
    type: body.type,
  };

  const inserted = await interactions.updateOne(
    interactionFilter,
    {
      $set: {
        lastSeenAt: nowIso,
      },
      $setOnInsert: {
        anonymousId,
        createdAt: nowIso,
        lastDayKey: dayKey,
        lastWeekKey: weekKey,
        productId: id,
        type: body.type,
      },
    },
    { upsert: true },
  );

  const increments = {
    allTimeViews: 0,
    purchases: 0,
    todayViews: 0,
    weekViews: 0,
  };

  if (body.type === "buy") {
    if (inserted.upsertedCount > 0) {
      increments.purchases = 1;
    }
  } else if (inserted.upsertedCount > 0) {
    increments.allTimeViews = 1;
    increments.todayViews = 1;
    increments.weekViews = 1;
  } else {
    const [dayUpdate, weekUpdate] = await Promise.all([
      interactions.updateOne(
        { ...interactionFilter, lastDayKey: { $ne: dayKey } },
        { $set: { lastDayKey: dayKey, lastSeenAt: nowIso } },
      ),
      interactions.updateOne(
        { ...interactionFilter, lastWeekKey: { $ne: weekKey } },
        { $set: { lastWeekKey: weekKey, lastSeenAt: nowIso } },
      ),
    ]);

    if (dayUpdate.modifiedCount > 0) {
      increments.todayViews = 1;
    }

    if (weekUpdate.modifiedCount > 0) {
      increments.weekViews = 1;
    }
  }

  if (hasAnyIncrement(increments)) {
    await updateProductInteractionCounters(products, id, dayKey, weekKey, increments);
  }

  const responseIncrements = buildResponseIncrements(increments);

  return buildInteractionResponse({
    counted:
      increments.allTimeViews === 1 ||
      increments.purchases === 1,
    increments: responseIncrements,
    newAnonymousId,
  });
}

function hasAnyIncrement(increments: InteractionIncrements) {
  return Object.values(increments).some((increment) => increment > 0);
}

type InteractionIncrements = {
  allTimeViews: number;
  purchases: number;
  todayViews: number;
  weekViews: number;
};

async function updateProductInteractionCounters(
  products: Collection<W2CProduct>,
  id: string,
  dayKey: string,
  weekKey: string,
  increments: InteractionIncrements,
) {
  await products.updateOne(buildW2CProductFilter(id), [
    {
      $set: {
        "metadata.clicks.allTime": {
          $add: [{ $ifNull: ["$metadata.clicks.allTime", 0] }, increments.allTimeViews],
        },
        "metadata.clicks.today": {
          $add: [
            {
              $cond: [
                { $eq: ["$metadata.clicks.todayKey", dayKey] },
                { $ifNull: ["$metadata.clicks.today", 0] },
                0,
              ],
            },
            increments.todayViews,
          ],
        },
        "metadata.clicks.todayKey": dayKey,
        "metadata.clicks.week": {
          $add: [
            {
              $cond: [
                { $eq: ["$metadata.clicks.weekKey", weekKey] },
                { $ifNull: ["$metadata.clicks.week", 0] },
                0,
              ],
            },
            increments.weekViews,
          ],
        },
        "metadata.clicks.weekKey": weekKey,
        "metadata.purchases": {
          $add: [{ $ifNull: ["$metadata.purchases", 0] }, increments.purchases],
        },
      },
    },
  ]);
}

function buildResponseIncrements(increments: InteractionIncrements) {
  const responseIncrements: Record<string, number> = {};

  if (increments.allTimeViews) {
    responseIncrements["metadata.clicks.allTime"] = increments.allTimeViews;
  }

  if (increments.todayViews) {
    responseIncrements["metadata.clicks.today"] = increments.todayViews;
  }

  if (increments.weekViews) {
    responseIncrements["metadata.clicks.week"] = increments.weekViews;
  }

  if (increments.purchases) {
    responseIncrements["metadata.purchases"] = increments.purchases;
  }

  return responseIncrements;
}

function getAnonymousId(request: NextRequest) {
  const existing = request.cookies.get(anonymousCookieName)?.value;

  if (existing && /^[a-f0-9-]{36}$/i.test(existing)) {
    return {
      anonymousId: existing,
      newAnonymousId: null,
    };
  }

  const anonymousId = randomUUID();

  return {
    anonymousId,
    newAnonymousId: anonymousId,
  };
}

function buildInteractionResponse(
  body: Record<string, unknown> & { newAnonymousId?: string | null },
  extraBody: Record<string, unknown> = {},
  status = 200,
) {
  const { newAnonymousId, ...responseBody } = body;
  const response = NextResponse.json({ ok: status < 400, ...responseBody, ...extraBody }, { status });

  if (newAnonymousId) {
    response.cookies.set(anonymousCookieName, newAnonymousId, {
      httpOnly: true,
      maxAge: anonymousCookieMaxAge,
      path: "/",
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
    });
  }

  return response;
}

function isRateLimited(key: string) {
  const now = Date.now();
  const current = interactionRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    interactionRateLimit.set(key, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });
    return false;
  }

  current.count += 1;
  return current.count > rateLimitMaxRequests;
}
