import { randomUUID } from "node:crypto";

import { NextRequest, NextResponse } from "next/server";

import { getMongoClient } from "@/lib/mongodb";
import { buildOutfitFilter } from "@/lib/outfits";
import { ensureW2CIndexes } from "@/lib/w2c-indexes";
import type { Outfit } from "@/types/outfits";

type OutfitView = {
  anonymousId: string;
  createdAt: string;
  lastSeenAt: string;
  outfitId: string;
};

const anonymousCookieName = "repdock_anon_id";
const anonymousCookieMaxAge = 60 * 60 * 24 * 400;
const rateLimitWindowMs = 60_000;
const rateLimitMaxRequests = 120;
const viewRateLimit = new Map<string, { count: number; resetAt: number }>();

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const mongoClient = getMongoClient();

  if (!mongoClient) {
    return buildViewResponse({ counted: false, newAnonymousId: null });
  }

  const { anonymousId, newAnonymousId } = getAnonymousId(request);
  const rateLimitKey = `${anonymousId}:${id}:outfit-view`;

  if (isRateLimited(rateLimitKey)) {
    return buildViewResponse(
      { counted: false, newAnonymousId },
      { error: "Too many view requests" },
      429,
    );
  }

  const client = await mongoClient;
  const db = client.db(process.env.MONGODB_DB ?? "repdock");
  await ensureW2CIndexes(db);

  const nowIso = new Date().toISOString();
  const views = db.collection<OutfitView>("outfit_views");
  const inserted = await views.updateOne(
    {
      anonymousId,
      outfitId: id,
    },
    {
      $set: {
        lastSeenAt: nowIso,
      },
      $setOnInsert: {
        anonymousId,
        createdAt: nowIso,
        outfitId: id,
      },
    },
    { upsert: true },
  );

  if (inserted.upsertedCount > 0) {
    await db.collection<Outfit>("outfits").updateOne(buildOutfitFilter(id), {
      $inc: { "stats.views": 1 },
    });
  }

  return buildViewResponse({
    counted: inserted.upsertedCount > 0,
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

function buildViewResponse(
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
  const current = viewRateLimit.get(key);

  if (!current || current.resetAt <= now) {
    viewRateLimit.set(key, {
      count: 1,
      resetAt: now + rateLimitWindowMs,
    });
    return false;
  }

  current.count += 1;
  return current.count > rateLimitMaxRequests;
}
