import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getMongoClient } from "@/lib/mongodb";
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

  const increments: Record<string, 1> = {};

  if (body.type === "buy") {
    if (inserted.upsertedCount > 0) {
      increments["metadata.purchases"] = 1;
    }
  } else if (inserted.upsertedCount > 0) {
    increments["metadata.clicks.allTime"] = 1;
    increments["metadata.clicks.today"] = 1;
    increments["metadata.clicks.week"] = 1;
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
      increments["metadata.clicks.today"] = 1;
    }

    if (weekUpdate.modifiedCount > 0) {
      increments["metadata.clicks.week"] = 1;
    }
  }

  if (Object.keys(increments).length > 0) {
    await products.updateOne(buildW2CProductFilter(id), { $inc: increments });
  }

  return buildInteractionResponse({
    counted:
      increments["metadata.clicks.allTime"] === 1 ||
      increments["metadata.purchases"] === 1,
    increments,
    newAnonymousId,
  });
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

function getDayKey(date: Date) {
  return date.toISOString().slice(0, 10);
}

function getWeekKey(date: Date) {
  const utcDate = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate()));
  const day = utcDate.getUTCDay() || 7;
  utcDate.setUTCDate(utcDate.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(utcDate.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((utcDate.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);

  return `${utcDate.getUTCFullYear()}-${String(week).padStart(2, "0")}`;
}
