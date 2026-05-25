import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const configPath = path.join(process.cwd(), "bot", "ticket_config.json");
const defaultRestoreUsersPath = path.join(process.cwd(), "bot", "restore_users.json");
const restoreLogsPath = process.env.RESTORE_LOGS_PATH ?? path.join(process.cwd(), "bot", "restore_migration_logs.json");

const DEFAULT_RESTORE_SETTINGS = {
  blacklistUserIds: [] as string[],
  leftServerMinDays: 0,
  maxBatchSize: 250,
  maxLeaveDetections: 0,
  minAccountAgeDays: 0,
  minPullDelayMs: 0,
  maxPullDelayMs: 0,
  minStayDurationDays: 0,
  pullCooldownMinutes: 0,
  webhookLogsEnabled: false,
  webhookUrl: "",
};

type BotConfig = {
  ids?: Record<string, unknown>;
  restore?: Partial<RestoreSettings>;
  [key: string]: unknown;
};

type RestoreSettings = typeof DEFAULT_RESTORE_SETTINGS;

type RestoreLogEntry = {
  action: string;
  createdAt: string;
  details?: string;
  status: "blocked" | "failed" | "info" | "skipped" | "success";
  userId?: string;
  username?: string;
};

type RestoreUserAnalytics = {
  capturedAt?: string;
  device?: {
    browser?: string;
    os?: string;
    type?: string;
    userAgent?: string;
  };
  ipHash?: string | null;
  language?: string;
  location?: {
    city?: string;
    country?: string;
    countryName?: string;
    region?: string;
    source?: string;
    timezone?: string;
  };
  source?: string;
};

type RestoreStatsUser = {
  id?: string;
  analytics?: RestoreUserAnalytics;
  consentedAt?: string;
  expiresAt?: number;
  globalName?: string | null;
  guildId?: string;
  username?: string;
  updatedAt?: string;
  verifiedAt?: string | null;
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

async function getRestoreLogs() {
  const data = await readJson<{ logs?: RestoreLogEntry[] }>(restoreLogsPath, { logs: [] });
  return (data.logs ?? []).slice(-80).reverse();
}

async function getRestoreStats() {
  const usersPath = process.env.RESTORE_USERS_PATH ?? defaultRestoreUsersPath;
  const data = await readJson<{ users?: Record<string, RestoreStatsUser> }>(usersPath, { users: {} });
  const users = Object.values(data.users ?? {}).filter((user) => user?.id);
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
  const verifiedUsers = users.filter((user) => user.verifiedAt || user.analytics?.source === "verify");
  const deviceTypes = countBy(users, (user) => user.analytics?.device?.type || "unknown");
  const browsers = countBy(users, (user) => user.analytics?.device?.browser || "Unknown");
  const operatingSystems = countBy(users, (user) => user.analytics?.device?.os || "Unknown");
  const countries = countBy(users, (user) => user.analytics?.location?.countryName || user.analytics?.location?.country || "Unknown");
  const cities = countBy(users, (user) => formatCity(user.analytics?.location));
  const languages = countBy(users, (user) => user.analytics?.language || "Unknown");
  const locationsKnown = users.filter((user) => {
    const location = user.analytics?.location;
    return Boolean(location?.country || location?.countryName || location?.city || location?.region);
  }).length;
  const uniqueIpHashes = new Set(users.map((user) => user.analytics?.ipHash).filter(Boolean)).size;

  return {
    analytics: {
      browsers: topEntries(browsers),
      cities: topEntries(cities),
      countries: topEntries(countries),
      deviceTypes,
      languages: topEntries(languages),
      locationsKnown,
      operatingSystems: topEntries(operatingSystems),
      restoreOnlyCount: users.length - verifiedUsers.length,
      uniqueIpHashes,
      verifiedCount: verifiedUsers.length,
    },
    count: users.length,
    expiredTokens,
    guilds,
    latestConsentAt: latestConsentAt ? new Date(latestConsentAt).toISOString() : null,
    recent7d,
    users: users
      .map((user) => ({
        id: String(user.id),
        analytics: user.analytics ? {
          capturedAt: user.analytics.capturedAt ?? null,
          device: {
            browser: user.analytics.device?.browser ?? "Unknown",
            os: user.analytics.device?.os ?? "Unknown",
            type: user.analytics.device?.type ?? "unknown",
          },
          ipHash: user.analytics.ipHash ?? null,
          language: user.analytics.language ?? "",
          location: {
            city: user.analytics.location?.city ?? "",
            country: user.analytics.location?.country ?? "",
            countryName: user.analytics.location?.countryName ?? "",
            region: user.analytics.location?.region ?? "",
            source: user.analytics.location?.source ?? "none",
            timezone: user.analytics.location?.timezone ?? "",
          },
          source: user.analytics.source ?? "restore",
        } : null,
        consentedAt: user.consentedAt ?? user.updatedAt ?? null,
        displayName: user.globalName || user.username || user.id || "Unknown",
        guildId: user.guildId ?? "",
        tokenStatus: (user.expiresAt ?? 0) > now + 60_000 ? "valid" : "expired",
        username: user.username || user.id || "Unknown",
      }))
      .sort((first, second) => Date.parse(second.consentedAt ?? "") - Date.parse(first.consentedAt ?? "")),
    validTokens,
    usersPath,
  };
}

function getMigrationAnalytics(logs: RestoreLogEntry[]) {
  const now = Date.now();
  const oneDay = 24 * 60 * 60 * 1000;
  const pullLogs = logs.filter((log) => log.action === "pull");
  const verifyLogs = logs.filter((log) => log.action === "verify");

  return {
    blockedVerifications: verifyLogs.filter((log) => log.status === "blocked").length,
    failedPulls: pullLogs.filter((log) => log.status === "failed").length,
    last24h: logs.filter((log) => Date.parse(log.createdAt) > now - oneDay).length,
    pulled: pullLogs.filter((log) => log.status === "success").length,
    skippedPulls: pullLogs.filter((log) => log.status === "skipped").length,
    totalLogs: logs.length,
    verificationLogs: verifyLogs.length,
  };
}

function countBy<T>(items: T[], getKey: (item: T) => string) {
  return items.reduce<Record<string, number>>((accumulator, item) => {
    const key = getKey(item) || "Unknown";
    accumulator[key] = (accumulator[key] ?? 0) + 1;
    return accumulator;
  }, {});
}

function topEntries(values: Record<string, number>, limit = 6) {
  return Object.entries(values)
    .filter(([label]) => label !== "Unknown")
    .sort((first, second) => second[1] - first[1])
    .slice(0, limit)
    .map(([label, value]) => ({ label, value }));
}

function formatCity(location?: RestoreUserAnalytics["location"]) {
  if (!location?.city && !location?.region) return "Unknown";
  return [location.city, location.region, location.country || location.countryName].filter(Boolean).join(", ");
}

function normalizeRestoreSettings(value: Partial<RestoreSettings> | undefined): RestoreSettings {
  const source = value ?? {};

  return {
    blacklistUserIds: Array.isArray(source.blacklistUserIds)
      ? source.blacklistUserIds.map(String).map((id) => id.trim()).filter(Boolean).slice(0, 500)
      : [],
    leftServerMinDays: clampNumber(source.leftServerMinDays, 0, 365, DEFAULT_RESTORE_SETTINGS.leftServerMinDays),
    maxBatchSize: clampNumber(source.maxBatchSize, 1, 1000, DEFAULT_RESTORE_SETTINGS.maxBatchSize),
    maxLeaveDetections: clampNumber(source.maxLeaveDetections, 0, 50, DEFAULT_RESTORE_SETTINGS.maxLeaveDetections),
    minAccountAgeDays: clampNumber(source.minAccountAgeDays, 0, 3650, DEFAULT_RESTORE_SETTINGS.minAccountAgeDays),
    minPullDelayMs: clampNumber(source.minPullDelayMs, 0, 60_000, DEFAULT_RESTORE_SETTINGS.minPullDelayMs),
    maxPullDelayMs: clampNumber(source.maxPullDelayMs, 0, 60_000, DEFAULT_RESTORE_SETTINGS.maxPullDelayMs),
    minStayDurationDays: clampNumber(source.minStayDurationDays, 0, 3650, DEFAULT_RESTORE_SETTINGS.minStayDurationDays),
    pullCooldownMinutes: clampNumber(source.pullCooldownMinutes, 0, 24 * 60, DEFAULT_RESTORE_SETTINGS.pullCooldownMinutes),
    webhookLogsEnabled: Boolean(source.webhookLogsEnabled),
    webhookUrl: typeof source.webhookUrl === "string" ? source.webhookUrl.trim().slice(0, 500) : "",
  };
}

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.min(Math.max(Math.round(nextValue), min), max);
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
  const logs = await getRestoreLogs();
  const settings = normalizeRestoreSettings(config.restore);

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
    logs,
    migrationAnalytics: getMigrationAnalytics(logs),
    settings,
    stats: restoreStats,
  });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = (await request.json()) as {
      restoreSettings?: Partial<RestoreSettings>;
      restorePanelChannelId?: unknown;
      verifyRoleId?: unknown;
    };
    const config = await readJson<BotConfig>(configPath, {});
    const ids = {
      ...(config.ids ?? {}),
      restorePanelChannelId: typeof body.restorePanelChannelId === "string" ? body.restorePanelChannelId.trim() : "",
      verifyRoleId: typeof body.verifyRoleId === "string" ? body.verifyRoleId.trim() : "",
    };

    await writeJson(configPath, {
      ...config,
      ids,
      restore: normalizeRestoreSettings(body.restoreSettings ?? config.restore),
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore config write failed", error);
    return NextResponse.json({ error: "Failed to save restore configuration" }, { status: 500 });
  }
}
