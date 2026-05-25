import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const configPath = path.join(process.cwd(), "bot", "ticket_config.json");
const defaultRestoreUsersPath = path.join(process.cwd(), "bot", "restore_users.json");

type BotConfig = {
  ids?: Record<string, unknown>;
  [key: string]: unknown;
};

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? null : new NextResponse("Unauthorized", { status: 401 });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  try {
    return JSON.parse(await fs.readFile(filePath, "utf8")) as T;
  } catch {
    return fallback;
  }
}

async function writeJson(filePath: string, value: unknown) {
  await fs.mkdir(path.dirname(filePath), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(value, null, 2), "utf8");
}

async function getRestoreStats() {
  const usersPath = process.env.RESTORE_USERS_PATH ?? defaultRestoreUsersPath;
  const data = await readJson<{
    users?: Record<
      string,
      {
        consentedAt?: string;
        expiresAt?: number;
        guildId?: string;
        updatedAt?: string;
      }
    >;
  }>(usersPath, { users: {} });
  const users = Object.values(data.users ?? {});
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const validTokens = users.filter((user) => (user.expiresAt ?? 0) > now + 60_000).length;
  const expiredTokens = users.filter((user) => Boolean(user.expiresAt) && (user.expiresAt ?? 0) <= now + 60_000).length;
  const recent7d = users.filter((user) => {
    const time = Date.parse(user.consentedAt ?? user.updatedAt ?? "");
    return Number.isFinite(time) && time > now - 7 * oneDay;
  }).length;
  const latestConsentAt = users
    .map((user) => Date.parse(user.consentedAt ?? user.updatedAt ?? ""))
    .filter(Number.isFinite)
    .sort((a, b) => b - a)[0];
  const guilds = users.reduce<Record<string, number>>((accumulator, user) => {
    const key = user.guildId || "unknown";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});

  return {
    count: users.length,
    expiredTokens,
    guilds,
    latestConsentAt: latestConsentAt ? new Date(latestConsentAt).toISOString() : null,
    recent7d,
    validTokens,
    usersPath,
  };
}

function getPublicBaseUrl() {
  return (
    process.env.PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_BASE_URL ??
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    ""
  ).replace(/\/+$/, "");
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await readJson<BotConfig>(configPath, {});
  const ids = config.ids ?? {};
  const publicBaseUrl = getPublicBaseUrl();
  const restoreStats = await getRestoreStats();

  return NextResponse.json({
    config: {
      verifyRoleId: String(ids.verifyRoleId ?? ids.verifiedRoleId ?? process.env.DISCORD_VERIFY_ROLE_ID ?? ""),
      restorePanelChannelId: String(ids.restorePanelChannelId ?? ""),
    },
    env: {
      hasBotToken: Boolean(process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN),
      hasClientId: Boolean(process.env.DISCORD_CLIENT_ID),
      hasClientSecret: Boolean(process.env.DISCORD_CLIENT_SECRET),
      publicBaseUrl,
      restoreRedirectUri: process.env.RESTORE_REDIRECT_URI || (publicBaseUrl ? `${publicBaseUrl}/api/restore/callback` : ""),
    },
    stats: restoreStats,
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      restorePanelChannelId?: unknown;
      verifyRoleId?: unknown;
    };
    const config = await readJson<BotConfig>(configPath, {});
    const ids = {
      ...(config.ids ?? {}),
      restorePanelChannelId: typeof body.restorePanelChannelId === "string" ? body.restorePanelChannelId.trim() : "",
      verifyRoleId: typeof body.verifyRoleId === "string" ? body.verifyRoleId.trim() : "",
    };

    await writeJson(configPath, { ...config, ids });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore config write failed", error);
    return NextResponse.json({ error: "Failed to save restore configuration" }, { status: 500 });
  }
}
