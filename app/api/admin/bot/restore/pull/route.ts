import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord-bot";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const usersPath = process.env.RESTORE_USERS_PATH ?? path.join(process.cwd(), "bot", "restore_users.json");
const configPath = path.join(process.cwd(), "bot", "ticket_config.json");

type RestoreUser = {
  id: string;
  username?: string;
  globalName?: string | null;
  guildId?: string;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  consentedAt?: string;
  updatedAt?: string;
};

type RestoreUsersFile = {
  users: Record<string, RestoreUser>;
};

type RestoreAction = "scan" | "pull";

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
    const limit = Math.min(Math.max(Number(body.limit) || 250, 1), 1000);
    const userIdFilter = Array.isArray(body.userIds) && body.userIds.length > 0 ? new Set(body.userIds) : null;
    const data = await readJson<RestoreUsersFile>(usersPath, { users: {} });
    const users = Object.values(data.users)
      .filter((user) => user?.id && (!user.guildId || user.guildId === guildId) && (!userIdFilter || userIdFilter.has(user.id)))
      .slice(0, limit);
    const verifyRoleId = body.assignVerifyRole === false ? "" : await getVerifyRoleId();
    const results: RestoreResult[] = [];
    let changed = false;

    for (const originalUser of users) {
      let user = originalUser;
      const result = createBaseResult(user);

      if (!user.accessToken && !user.refreshToken) {
        result.tokenStatus = "missing";
        result.action = "skipped";
        result.message = "Brak access token i refresh token.";
        results.push(result);
        continue;
      }

      try {
        result.membership = await checkGuildMember(token, guildId, user.id);

        if (result.membership === "in_guild") {
          result.message = "Uzytkownik jest juz na serwerze.";
          results.push(result);
          continue;
        }

        if (action === "scan") {
          result.action = "none";
          result.message = "Uzytkownik nie jest na serwerze i moze zostac spullowany.";
          results.push(result);
          continue;
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
            continue;
          }
        }

        await addGuildMember(token, guildId, user);
        await addVerifyRole(token, guildId, user.id, verifyRoleId);
        result.action = "pulled";
        result.message = verifyRoleId
          ? "Uzytkownik zostal dodany na serwer i zsynchronizowano role."
          : "Uzytkownik zostal dodany na serwer.";
      } catch (error) {
        result.action = action === "pull" ? "failed" : "none";
        result.message = error instanceof Error ? error.message : "Restore check failed.";
      }

      results.push(result);
    }

    if (changed) {
      await writeJson(usersPath, data);
    }

    const summary = {
      checked: results.length,
      failed: results.filter((result) => result.action === "failed").length,
      inGuild: results.filter((result) => result.membership === "in_guild").length,
      missing: results.filter((result) => result.membership === "missing").length,
      pulled: results.filter((result) => result.action === "pulled").length,
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
