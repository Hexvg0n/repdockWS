import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";

import { getPublicUrl } from "@/lib/discord-oauth";
import { getMongoClient } from "@/lib/mongodb";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type RestoreState = {
  guildId: string;
  createdAt: number;
  mode?: "restore" | "verify";
};

type RestoreUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  guildId: string;
  accessToken: string;
  analytics?: RestoreUserAnalytics;
  firstConsentedAt?: string;
  refreshToken: string;
  expiresAt: number;
  verifiedAt?: string | null;
  scopes: string;
  consentedAt: string;
  updatedAt: string;
};

type RestoreUserAnalytics = {
  capturedAt: string;
  device: {
    browser: string;
    os: string;
    type: "bot" | "desktop" | "mobile" | "tablet" | "unknown";
    userAgent: string;
  };
  ipHash: string | null;
  ipSource: string;
  language: string;
  location: {
    city: string;
    country: string;
    countryName: string;
    latitude: string;
    longitude: string;
    region: string;
    source: string;
    timezone: string;
  };
  source: "restore" | "verify";
};

type RestoreUsersFile = {
  users: Record<string, RestoreUser>;
};

type DiscordTokenResponse = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  scope: string;
  token_type: string;
};

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

const statePath =
  process.env.RESTORE_STATES_PATH ??
  path.join(process.cwd(), "bot", "restore_oauth_states.json");

const usersPath =
  process.env.RESTORE_USERS_PATH ??
  path.join(process.cwd(), "bot", "restore_users.json");
const configPath = path.join(process.cwd(), "bot", "ticket_config.json");
const restoreLogsPath = process.env.RESTORE_LOGS_PATH ?? path.join(process.cwd(), "bot", "restore_migration_logs.json");
const DISCORD_EPOCH = BigInt("1420070400000");

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

type RestoreSettings = typeof DEFAULT_RESTORE_SETTINGS;

type RestoreLogEntry = {
  action: string;
  createdAt: string;
  details?: string;
  status: "blocked" | "failed" | "info" | "skipped" | "success";
  userId?: string;
  username?: string;
};

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

function clampNumber(value: unknown, min: number, max: number, fallback: number) {
  const nextValue = Number(value);
  if (!Number.isFinite(nextValue)) return fallback;
  return Math.min(Math.max(Math.round(nextValue), min), max);
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

async function getRestoreSettings() {
  const config = await readJson<{ restore?: Partial<RestoreSettings> }>(configPath, {});
  return normalizeRestoreSettings(config.restore);
}

async function appendRestoreLog(entry: RestoreLogEntry, settings?: RestoreSettings) {
  const data = await readJson<{ logs?: RestoreLogEntry[] }>(restoreLogsPath, { logs: [] });
  const logs = [...(data.logs ?? []), entry].slice(-500);
  await writeJson(restoreLogsPath, { logs });

  if (settings?.webhookLogsEnabled && settings.webhookUrl) {
    await sendWebhookLog(settings.webhookUrl, entry);
  }
}

async function sendWebhookLog(webhookUrl: string, entry: RestoreLogEntry) {
  try {
    await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        embeds: [
          {
            title: `RepDock Restore: ${entry.action}`,
            description: entry.details || entry.status,
            color: entry.status === "success" ? 0x22c55e : entry.status === "failed" || entry.status === "blocked" ? 0xef4444 : 0x3b82f6,
            fields: [
              entry.userId ? { name: "User ID", value: entry.userId, inline: true } : null,
              entry.username ? { name: "User", value: entry.username, inline: true } : null,
              { name: "Status", value: entry.status, inline: true },
            ].filter(Boolean),
            timestamp: entry.createdAt,
          },
        ],
      }),
    });
  } catch (error) {
    console.error("Restore webhook log failed", error);
  }
}

function renderHtml(title: string, body: string, status = 200) {
  return new NextResponse(
    `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
  </head>
  <body style="margin:0;font-family:Arial,sans-serif;background:#111318;color:#f4f4f5">
    <main style="max-width:680px;margin:0 auto;padding:48px 24px">
      <h1 style="margin:0 0 12px;font-size:28px">${title}</h1>
      <p style="line-height:1.6;color:#d4d4d8">${body}</p>
    </main>
  </body>
</html>`,
    {
      status,
      headers: { "Content-Type": "text/html; charset=utf-8" },
    },
  );
}

function getRestoreRedirectUri(request: NextRequest) {
  return process.env.RESTORE_REDIRECT_URI ?? getPublicUrl(request, "/api/restore/callback").toString();
}

function getFirstHeader(request: NextRequest, names: string[]) {
  for (const name of names) {
    const value = request.headers.get(name);
    if (value) return value.trim();
  }

  return "";
}

function getClientIp(request: NextRequest) {
  const forwardedFor = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "";
  const candidate =
    getFirstHeader(request, ["cf-connecting-ip", "true-client-ip", "x-real-ip"]) ||
    forwardedFor;

  return candidate.replace(/^\[|\]$/g, "").replace(/:\d+$/, "");
}

function hashIp(ip: string) {
  if (!ip) return null;

  const salt = process.env.RESTORE_ANALYTICS_SALT ?? process.env.AUTH_SECRET ?? process.env.DISCORD_CLIENT_SECRET ?? "repdock";
  return crypto.createHash("sha256").update(`${salt}:${ip}`).digest("hex").slice(0, 24);
}

function getDiscordAccountCreatedAt(userId: string) {
  try {
    return Number((BigInt(userId) >> BigInt(22)) + DISCORD_EPOCH);
  } catch {
    return 0;
  }
}

function isOlderThanDays(timestamp: number, days: number) {
  if (days <= 0) return true;
  return Number.isFinite(timestamp) && timestamp <= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getVerificationBlockReason(userId: string, settings: RestoreSettings) {
  if (settings.blacklistUserIds.includes(userId)) {
    return "Ten uzytkownik jest zablokowany i nie moze przejsc weryfikacji.";
  }

  if (settings.minAccountAgeDays > 0 && !isOlderThanDays(getDiscordAccountCreatedAt(userId), settings.minAccountAgeDays)) {
    return `Konto Discord jest mlodsze niz ${settings.minAccountAgeDays} dni.`;
  }

  return "";
}

function decodeHeaderValue(value: string) {
  if (!value) return "";

  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function parseUserAgent(userAgent: string): RestoreUserAnalytics["device"] {
  const value = userAgent.toLowerCase();
  const browser =
    value.includes("edg/") ? "Edge" :
    value.includes("opr/") || value.includes("opera") ? "Opera" :
    value.includes("samsungbrowser") ? "Samsung Internet" :
    value.includes("firefox/") ? "Firefox" :
    value.includes("chrome/") || value.includes("crios/") ? "Chrome" :
    value.includes("safari/") ? "Safari" :
    value.includes("discord") ? "Discord" :
    "Unknown";
  const os =
    value.includes("windows") ? "Windows" :
    value.includes("iphone") || value.includes("ipad") ? "iOS" :
    value.includes("android") ? "Android" :
    value.includes("mac os") || value.includes("macintosh") ? "macOS" :
    value.includes("cros") ? "ChromeOS" :
    value.includes("linux") ? "Linux" :
    "Unknown";
  const type =
    /bot|crawler|spider|preview/i.test(userAgent) ? "bot" :
    /ipad|tablet|kindle|silk/i.test(userAgent) ? "tablet" :
    /mobile|iphone|android/i.test(userAgent) ? "mobile" :
    userAgent ? "desktop" :
    "unknown";

  return {
    browser,
    os,
    type,
    userAgent: userAgent.slice(0, 300),
  };
}

function getHeaderLocation(request: NextRequest) {
  const country = getFirstHeader(request, ["cf-ipcountry", "x-vercel-ip-country", "x-appengine-country"]);
  const city = decodeHeaderValue(getFirstHeader(request, ["cf-ipcity", "x-vercel-ip-city", "x-appengine-city"]));
  const region = decodeHeaderValue(getFirstHeader(request, ["cf-region", "x-vercel-ip-country-region", "x-appengine-region"]));
  const timezone = getFirstHeader(request, ["cf-timezone", "x-vercel-ip-timezone"]);
  const latitude = getFirstHeader(request, ["cf-iplatitude", "x-vercel-ip-latitude", "x-appengine-citylatlong"]).split(",")[0] ?? "";
  const longitude =
    getFirstHeader(request, ["cf-iplongitude", "x-vercel-ip-longitude"]) ||
    (getFirstHeader(request, ["x-appengine-citylatlong"]).split(",")[1] ?? "");

  return {
    city,
    country,
    countryName: country,
    latitude,
    longitude,
    region,
    source: country || city || region ? "headers" : "none",
    timezone,
  };
}

function isPrivateIp(ip: string) {
  return (
    !ip ||
    ip === "::1" ||
    ip.startsWith("127.") ||
    ip.startsWith("10.") ||
    ip.startsWith("192.168.") ||
    /^172\.(1[6-9]|2\d|3[0-1])\./.test(ip)
  );
}

async function getLocation(request: NextRequest, ip: string): Promise<RestoreUserAnalytics["location"]> {
  const headerLocation = getHeaderLocation(request);
  const lookupUrl = process.env.RESTORE_GEOLOOKUP_URL;

  if (!lookupUrl || isPrivateIp(ip)) {
    return headerLocation;
  }

  try {
    const response = await fetch(lookupUrl.replace("{ip}", encodeURIComponent(ip)), {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) return headerLocation;

    const data = (await response.json()) as Record<string, unknown>;
    return {
      city: String(data.city ?? headerLocation.city ?? ""),
      country: String(data.countryCode ?? data.country_code ?? data.country ?? headerLocation.country ?? ""),
      countryName: String(data.countryName ?? data.country_name ?? data.country ?? headerLocation.countryName ?? ""),
      latitude: String(data.lat ?? data.latitude ?? headerLocation.latitude ?? ""),
      longitude: String(data.lon ?? data.longitude ?? headerLocation.longitude ?? ""),
      region: String(data.regionName ?? data.region_name ?? data.region ?? headerLocation.region ?? ""),
      source: "lookup",
      timezone: String(data.timezone ?? headerLocation.timezone ?? ""),
    };
  } catch (error) {
    console.error("Restore geolocation lookup failed:", error);
    return headerLocation;
  }
}

async function collectAnalytics(request: NextRequest, source: "restore" | "verify", capturedAt: string): Promise<RestoreUserAnalytics> {
  const ip = getClientIp(request);
  const userAgent = request.headers.get("user-agent") ?? "";
  const language = request.headers.get("accept-language")?.split(",")[0]?.trim() ?? "";

  return {
    capturedAt,
    device: parseUserAgent(userAgent),
    ipHash: hashIp(ip),
    ipSource: ip ? "request" : "none",
    language,
    location: await getLocation(request, ip),
    source,
  };
}

async function getVerifyRoleId() {
  if (process.env.DISCORD_VERIFY_ROLE_ID || process.env.VERIFY_ROLE_ID) {
    return process.env.DISCORD_VERIFY_ROLE_ID ?? process.env.VERIFY_ROLE_ID ?? "";
  }

  const config = await readJson<{ ids?: Record<string, unknown> }>(configPath, {});
  return String(config.ids?.verifyRoleId ?? config.ids?.verifiedRoleId ?? "");
}

async function assignVerificationRole(guildId: string, userId: string) {
  const roleId = await getVerifyRoleId();
  const botToken = process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN;

  if (!roleId) {
    return {
      ok: false,
      message: "Brakuje DISCORD_VERIFY_ROLE_ID, wiec nie nadano roli weryfikacji.",
    };
  }

  if (!botToken) {
    return {
      ok: false,
      message: "Brakuje DISCORD_BOT_TOKEN, wiec nie nadano roli weryfikacji.",
    };
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`,
    {
      method: "PUT",
      headers: {
        Authorization: `Bot ${botToken}`,
        "X-Audit-Log-Reason": encodeURIComponent("RepDock OAuth verification"),
      },
    },
  );

  if (response.ok || response.status === 204) {
    return { ok: true, message: "Rola weryfikacji zostala nadana." };
  }

  const details = await response.text().catch(() => "");
  return {
    ok: false,
    message: `Zgoda restore zostala zapisana, ale nie udalo sie nadac roli (${response.status}). ${details}`,
  };
}

async function saveRestoreUser(user: RestoreUser) {
  const data = await readJson<RestoreUsersFile>(usersPath, { users: {} });
  const existing = data.users[user.id];
  const mergedUser = {
    ...existing,
    ...user,
    firstConsentedAt: existing?.firstConsentedAt ?? existing?.consentedAt ?? user.consentedAt,
    verifiedAt: user.verifiedAt ?? existing?.verifiedAt ?? null,
  };

  data.users[user.id] = mergedUser;
  await writeJson(usersPath, data);

  const client = getMongoClient();
  if (!client) return;

  try {
    const db = (await client).db(process.env.MONGODB_DB ?? "repdock");
    await db.collection("restore_users").updateOne(
      { id: user.id },
      {
        $set: mergedUser,
        $setOnInsert: { createdAt: new Date() },
      },
      { upsert: true },
    );
  } catch (error) {
    console.error("Restore MongoDB mirror failed:", error);
  }
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!code || !state) {
    return renderHtml("Restore nieudany", "Brakuje kodu autoryzacji lub parametru state.", 400);
  }

  if (!clientId || !clientSecret) {
    return renderHtml("Restore nieudany", "Discord OAuth nie jest skonfigurowany.", 500);
  }

  const states = await readJson<Record<string, RestoreState>>(statePath, {});
  const savedState = states[state];
  delete states[state];
  await writeJson(statePath, states);

  if (!savedState || savedState.createdAt < Date.now() - 10 * 60 * 1000) {
    return renderHtml("Restore nieudany", "Sesja autoryzacji wygasla. Sprobuj ponownie.", 400);
  }

  const tokenResponse = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: getRestoreRedirectUri(request),
    }),
  });

  if (!tokenResponse.ok) {
    return renderHtml(
      "Restore nieudany",
      `Discord odrzucil wymiane kodu OAuth (${tokenResponse.status}).`,
      502,
    );
  }

  const token = (await tokenResponse.json()) as DiscordTokenResponse;
  const userResponse = await fetch("https://discord.com/api/v10/users/@me", {
    headers: { Authorization: `${token.token_type} ${token.access_token}` },
  });

  if (!userResponse.ok) {
    return renderHtml(
      "Restore nieudany",
      `Nie udalo sie pobrac profilu Discord (${userResponse.status}).`,
      502,
    );
  }

  const discordUser = (await userResponse.json()) as DiscordUserResponse;
  const now = new Date().toISOString();
  const mode = savedState.mode === "verify" ? "verify" : "restore";
  const settings = await getRestoreSettings();
  const blockReason = getVerificationBlockReason(discordUser.id, settings);

  if (blockReason) {
    await appendRestoreLog(
      {
        action: mode,
        createdAt: now,
        details: blockReason,
        status: "blocked",
        userId: discordUser.id,
        username: discordUser.username,
      },
      settings,
    );

    return renderHtml("Weryfikacja odrzucona", blockReason, 403);
  }

  await saveRestoreUser({
    id: discordUser.id,
    analytics: await collectAnalytics(request, mode, now),
    username: discordUser.username,
    globalName: discordUser.global_name ?? null,
    avatar: discordUser.avatar ?? null,
    guildId: savedState.guildId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    verifiedAt: mode === "verify" ? now : null,
    scopes: token.scope,
    consentedAt: now,
    updatedAt: now,
  });

  if (savedState.mode === "verify") {
    const verification = await assignVerificationRole(savedState.guildId, discordUser.id);
    await appendRestoreLog(
      {
        action: "verify",
        createdAt: new Date().toISOString(),
        details: verification.message,
        status: verification.ok ? "success" : "failed",
        userId: discordUser.id,
        username: discordUser.username,
      },
      settings,
    );

    return renderHtml(
      verification.ok ? "Weryfikacja zakonczona" : "Restore zapisany",
      verification.ok
        ? "Dziekujemy. Twoja zgoda restore zostala zapisana, a rola weryfikacji zostala nadana. Mozesz zamknac te strone."
        : verification.message,
      verification.ok ? 200 : 207,
    );
  }

  await appendRestoreLog(
    {
      action: "restore",
      createdAt: new Date().toISOString(),
      details: "Zgoda restore zostala zapisana.",
      status: "success",
      userId: discordUser.id,
      username: discordUser.username,
    },
    settings,
  );

  return renderHtml(
    "Restore zapisany",
    "Dziekujemy. Twoja zgoda restore zostala zapisana. Mozesz zamknac te strone.",
  );
}
