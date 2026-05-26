import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord-bot";
import { mutateJsonFile, readJsonFile } from "@/lib/json-file-store";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const usersPath = process.env.RESTORE_USERS_PATH ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "restore_users.json");
const configPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "ticket_config.json");
const restoreLogsPath = process.env.RESTORE_LOGS_PATH ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "restore_migration_logs.json");
const restoreRuntimePath = process.env.RESTORE_RUNTIME_PATH ?? path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "restore_runtime.json");
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

type RestoreUser = {
  id: string;
  username?: string;
  globalName?: string | null;
  guildId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  consentedAt?: string;
  firstConsentedAt?: string;
  lastMembershipStatus?: "in_guild" | "missing" | "unknown";
  leftDetectedAt?: string | null;
  leaveDetections?: number;
  updatedAt?: string;
};

type RestoreUsersFile = {
  users: Record<string, RestoreUser>;
};

type RestoreAction = "scan" | "pull";

type RestoreSettings = typeof DEFAULT_RESTORE_SETTINGS;

type RestoreLogEntry = {
  action: string;
  createdAt: string;
  details?: string;
  status: "blocked" | "failed" | "info" | "skipped" | "success";
  userId?: string;
  username?: string;
};

type RestoreResult = {
  id: string;
  username: string;
  displayName: string;
  consentedAt: string | null;
  tokenStatus: "valid" | "expired" | "missing" | "refreshed" | "refresh_failed";
  membership: "in_guild" | "missing" | "unknown";
  action: "none" | "pulled" | "skipped" | "failed";
  message: string;
};

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? null : new NextResponse("Unauthorized", { status: 401 });
}

async function readJson<T>(filePath: string, fallback: T): Promise<T> {
  return readJsonFile(filePath, fallback);
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

async function getVerifyRoleId() {
  if (process.env.DISCORD_VERIFY_ROLE_ID || process.env.VERIFY_ROLE_ID) {
    return process.env.DISCORD_VERIFY_ROLE_ID ?? process.env.VERIFY_ROLE_ID ?? "";
  }

  const config = await readJson<{ ids?: Record<string, unknown> }>(configPath, {});
  return String(config.ids?.verifyRoleId ?? config.ids?.verifiedRoleId ?? "");
}

async function checkGuildMember(token: string, guildId: string, userId: string) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, {
    headers: { Authorization: `Bot ${token}` },
    cache: "no-store",
  });

  if (response.ok) return "in_guild" as const;
  if (response.status === 404) return "missing" as const;
  throw new Error(`Discord member check failed (${response.status}): ${await response.text().catch(() => response.statusText)}`);
}

async function refreshAccessToken(user: RestoreUser) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret || !user.refreshToken) {
    throw new Error("Missing OAuth refresh configuration");
  }

  const response = await fetch("https://discord.com/api/v10/oauth2/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
      refresh_token: user.refreshToken,
    }),
  });

  if (!response.ok) {
    throw new Error(`Discord token refresh failed (${response.status})`);
  }

  const token = (await response.json()) as {
    access_token: string;
    expires_in: number;
    refresh_token?: string;
  };

  return {
    ...user,
    accessToken: token.access_token,
    refreshToken: token.refresh_token ?? user.refreshToken,
    expiresAt: Date.now() + token.expires_in * 1000,
    updatedAt: new Date().toISOString(),
  };
}

async function addGuildMember(token: string, guildId: string, user: RestoreUser) {
  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${user.id}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "Content-Type": "application/json",
      "X-Audit-Log-Reason": encodeURIComponent("RepDock restore pull"),
    },
    body: JSON.stringify({ access_token: user.accessToken }),
  });

  if (response.ok || response.status === 204) {
    return true;
  }

  throw new Error(`Discord pull failed (${response.status}): ${await response.text().catch(() => response.statusText)}`);
}

async function addVerifyRole(token: string, guildId: string, userId: string, roleId: string) {
  if (!roleId) return;

  const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}/roles/${roleId}`, {
    method: "PUT",
    headers: {
      Authorization: `Bot ${token}`,
      "X-Audit-Log-Reason": encodeURIComponent("RepDock restore pull role sync"),
    },
  });

  if (!response.ok && response.status !== 204) {
    console.warn("Restore role sync failed", await response.text().catch(() => response.statusText));
  }
}

async function appendRestoreLog(entry: RestoreLogEntry, settings?: RestoreSettings) {
  await mutateJsonFile<{ logs?: RestoreLogEntry[] }, void>(restoreLogsPath, { logs: [] }, (data) => {
    const logs = [...(data.logs ?? []), entry].slice(-500);
    return { next: { logs }, result: undefined };
  });

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

function getDiscordAccountCreatedAt(userId: string) {
  try {
    return Number((BigInt(userId) >> BigInt(22)) + DISCORD_EPOCH);
  } catch {
    return 0;
  }
}

function isOlderThanDays(timestamp: string | number | null | undefined, days: number) {
  if (days <= 0) return true;

  const time = typeof timestamp === "number" ? timestamp : Date.parse(timestamp ?? "");
  return Number.isFinite(time) && time <= Date.now() - days * 24 * 60 * 60 * 1000;
}

function getRandomDelay(settings: RestoreSettings) {
  const minDelay = Math.min(settings.minPullDelayMs, settings.maxPullDelayMs || settings.minPullDelayMs);
  const maxDelay = Math.max(settings.maxPullDelayMs, minDelay);

  if (maxDelay <= 0) return 0;
  return Math.floor(minDelay + Math.random() * (maxDelay - minDelay + 1));
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function updateMembershipMetadata(user: RestoreUser, membership: RestoreResult["membership"]) {
  const wasMissing = user.lastMembershipStatus === "missing";

  user.lastMembershipStatus = membership;
  user.updatedAt = new Date().toISOString();

  if (membership === "missing") {
    if (!wasMissing) {
      user.leaveDetections = (user.leaveDetections ?? 0) + 1;
      user.leftDetectedAt = new Date().toISOString();
    } else {
      user.leftDetectedAt = user.leftDetectedAt ?? new Date().toISOString();
    }
  }

  if (membership === "in_guild") {
    user.leftDetectedAt = null;
  }
}

function getSkipReason(user: RestoreUser, settings: RestoreSettings, membership?: RestoreResult["membership"]) {
  if (settings.blacklistUserIds.includes(user.id)) {
    return "Uzytkownik jest na blacklist.";
  }

  if (settings.minAccountAgeDays > 0 && !isOlderThanDays(getDiscordAccountCreatedAt(user.id), settings.minAccountAgeDays)) {
    return `Konto Discord jest mlodsze niz ${settings.minAccountAgeDays} dni.`;
  }

  if (settings.minStayDurationDays > 0 && !isOlderThanDays(user.firstConsentedAt ?? user.consentedAt, settings.minStayDurationDays)) {
    return `Zgoda restore jest mlodsza niz ${settings.minStayDurationDays} dni.`;
  }

  if (settings.maxLeaveDetections > 0 && (user.leaveDetections ?? 0) > settings.maxLeaveDetections) {
    return `Uzytkownik przekroczyl limit leave detections (${user.leaveDetections ?? 0}).`;
  }

  if (membership === "missing" && settings.leftServerMinDays > 0 && !isOlderThanDays(user.leftDetectedAt, settings.leftServerMinDays)) {
    return `Uzytkownik jest poza serwerem krocej niz ${settings.leftServerMinDays} dni.`;
  }

  return "";
}

function createBaseResult(user: RestoreUser): RestoreResult {
  return {
    id: user.id,
    username: user.username || user.id,
    displayName: user.globalName || user.username || user.id,
    consentedAt: user.consentedAt ?? null,
    tokenStatus: user.accessToken ? ((user.expiresAt ?? 0) > Date.now() + 60_000 ? "valid" : "expired") : "missing",
    membership: "unknown",
    action: "none",
    message: "",
  };
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const token = getDiscordBotToken();
  const guildId = process.env.RESTORE_GUILD_ID || getDiscordGuildId();

  if (!token) {
    return NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
  }

  if (!guildId) {
    return NextResponse.json({ error: "Missing DISCORD_GUILD_ID" }, { status: 500 });
  }

  try {
    const body = (await request.json().catch(() => ({}))) as {
      action?: RestoreAction;
      assignVerifyRole?: boolean;
      limit?: number;
      userIds?: string[];
    };
    const action: RestoreAction = body.action === "pull" ? "pull" : "scan";
    const settings = await getRestoreSettings();
    const runtime = await readJson<{ lastBulkPullAt?: string }>(restoreRuntimePath, {});
    const userIdFilter = Array.isArray(body.userIds) && body.userIds.length > 0 ? new Set(body.userIds) : null;
    const isBulkPull = action === "pull" && !userIdFilter;
    const requestedLimit = Number(body.limit) || settings.maxBatchSize;
    const limit = Math.min(Math.max(requestedLimit, 1), settings.maxBatchSize, 1000);

    if (isBulkPull && settings.pullCooldownMinutes > 0 && runtime.lastBulkPullAt) {
      const nextAllowedAt = Date.parse(runtime.lastBulkPullAt) + settings.pullCooldownMinutes * 60 * 1000;

      if (Date.now() < nextAllowedAt) {
        const waitMinutes = Math.ceil((nextAllowedAt - Date.now()) / 60_000);
        return NextResponse.json(
          { error: `Pull cooldown active. Sprobuj ponownie za ${waitMinutes} min.` },
          { status: 429 },
        );
      }
    }

    const data = await readJson<RestoreUsersFile>(usersPath, { users: {} });
    const users = Object.values(data.users)
      .filter((user) => user?.id && (!user.guildId || user.guildId === guildId) && (!userIdFilter || userIdFilter.has(user.id)))
      .slice(0, limit);
    const verifyRoleId = body.assignVerifyRole === false ? "" : await getVerifyRoleId();
    const results: RestoreResult[] = [];
    let changed = false;

    for (const [index, originalUser] of users.entries()) {
      let user = originalUser;
      const result = createBaseResult(user);
      const baseLog = {
        action,
        createdAt: new Date().toISOString(),
        userId: user.id,
        username: user.username || user.globalName || user.id,
      };

      if (!user.accessToken && !user.refreshToken) {
        result.tokenStatus = "missing";
        result.action = "skipped";
        result.message = "Brak access token i refresh token.";
        results.push(result);
        await appendRestoreLog({ ...baseLog, details: result.message, status: "skipped" }, settings);
        continue;
      }

      const preCheckSkipReason = getSkipReason(user, settings);
      if (preCheckSkipReason) {
        result.action = "skipped";
        result.message = preCheckSkipReason;
        results.push(result);
        await appendRestoreLog({ ...baseLog, details: result.message, status: "skipped" }, settings);
        continue;
      }

      try {
        result.membership = await checkGuildMember(token, guildId, user.id);
        updateMembershipMetadata(user, result.membership);
        data.users[user.id] = user;
        changed = true;

        if (result.membership === "in_guild") {
          result.message = "Uzytkownik jest juz na serwerze.";
          results.push(result);
          await appendRestoreLog({ ...baseLog, details: result.message, status: "info" }, settings);
          continue;
        }

        if (action === "scan") {
          result.action = "none";
          result.message = "Uzytkownik nie jest na serwerze i moze zostac spullowany.";
          results.push(result);
          await appendRestoreLog({ ...baseLog, details: result.message, status: "info" }, settings);
          continue;
        }

        const pullSkipReason = getSkipReason(user, settings, result.membership);
        if (pullSkipReason) {
          result.action = "skipped";
          result.message = pullSkipReason;
          results.push(result);
          await appendRestoreLog({ ...baseLog, details: result.message, status: "skipped" }, settings);
          continue;
        }

        if (index > 0) {
          const delay = getRandomDelay(settings);
          if (delay > 0) await sleep(delay);
        }

        if (!user.accessToken || (user.expiresAt ?? 0) <= Date.now() + 60_000) {
          try {
            user = await refreshAccessToken(user);
            data.users[user.id] = user;
            changed = true;
            result.tokenStatus = "refreshed";
          } catch (error) {
            result.tokenStatus = "refresh_failed";
            result.action = "failed";
            result.message = error instanceof Error ? error.message : "Token refresh failed.";
            results.push(result);
            await appendRestoreLog({ ...baseLog, details: result.message, status: "failed" }, settings);
            continue;
          }
        }

        await addGuildMember(token, guildId, user);
        await addVerifyRole(token, guildId, user.id, verifyRoleId);
        user.lastMembershipStatus = "in_guild";
        user.leftDetectedAt = null;
        user.updatedAt = new Date().toISOString();
        data.users[user.id] = user;
        changed = true;
        result.action = "pulled";
        result.message = verifyRoleId
          ? "Uzytkownik zostal dodany na serwer i zsynchronizowano role."
          : "Uzytkownik zostal dodany na serwer.";
        await appendRestoreLog({ ...baseLog, details: result.message, status: "success" }, settings);
      } catch (error) {
        result.action = action === "pull" ? "failed" : "none";
        result.message = error instanceof Error ? error.message : "Restore check failed.";
        await appendRestoreLog({ ...baseLog, details: result.message, status: action === "pull" ? "failed" : "info" }, settings);
      }

      results.push(result);
    }

    if (changed) {
      await mutateJsonFile<RestoreUsersFile, void>(usersPath, { users: {} }, (currentData) => ({
        next: {
          users: {
            ...(currentData.users ?? {}),
            ...data.users,
          },
        },
        result: undefined,
      }));
    }

    if (isBulkPull) {
      await mutateJsonFile<{ lastBulkPullAt?: string }, void>(restoreRuntimePath, {}, (currentRuntime) => ({
        next: { ...currentRuntime, lastBulkPullAt: new Date().toISOString() },
        result: undefined,
      }));
    }

    const summary = {
      checked: results.length,
      failed: results.filter((result) => result.action === "failed").length,
      inGuild: results.filter((result) => result.membership === "in_guild").length,
      missing: results.filter((result) => result.membership === "missing").length,
      pulled: results.filter((result) => result.action === "pulled").length,
      skipped: results.filter((result) => result.action === "skipped").length,
      refreshFailed: results.filter((result) => result.tokenStatus === "refresh_failed").length,
    };

    return NextResponse.json({ results, summary });
  } catch (error) {
    console.error("Restore pull route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to process restore pull" },
      { status: 500 },
    );
  }
}
