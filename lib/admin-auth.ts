import { cookies } from "next/headers";

import { parseSessionCookieValue, sessionCookieName } from "@/lib/auth";

const administratorPermission = BigInt(8);
const adminCheckCache = new Map<string, { expiresAt: number; ok: boolean }>();
const adminCheckTtlMs = 60_000;

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(sessionCookieName)?.value);

  if (!session?.isAdmin) {
    return null;
  }

  const stillAdmin = await verifyLiveAdminAccess(session.id);

  if (!stillAdmin) {
    return null;
  }

  return session;
}

async function verifyLiveAdminAccess(userId: string) {
  const guildId = process.env.DISCORD_ADMIN_GUILD_ID ?? process.env.DISCORD_GUILD_ID;
  const token = process.env.DISCORD_BOT_TOKEN ?? process.env.DISCORD_TOKEN;

  if (!guildId || !token) {
    return true;
  }

  const cacheKey = `${guildId}:${userId}`;
  const cached = adminCheckCache.get(cacheKey);

  if (cached && cached.expiresAt > Date.now()) {
    return cached.ok;
  }

  try {
    const headers = { Authorization: `Bot ${token}` };
    const [guildResponse, memberResponse, rolesResponse] = await Promise.all([
      fetch(`https://discord.com/api/v10/guilds/${guildId}`, { cache: "no-store", headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/members/${userId}`, { cache: "no-store", headers }),
      fetch(`https://discord.com/api/v10/guilds/${guildId}/roles`, { cache: "no-store", headers }),
    ]);

    if (!guildResponse.ok || !memberResponse.ok || !rolesResponse.ok) {
      cacheAdminCheck(cacheKey, false);
      return false;
    }

    const guild = (await guildResponse.json()) as { owner_id?: string };
    const member = (await memberResponse.json()) as { roles?: string[] };
    const roles = (await rolesResponse.json()) as Array<{ id: string; permissions: string }>;

    if (guild.owner_id === userId) {
      cacheAdminCheck(cacheKey, true);
      return true;
    }

    const memberRoleIds = new Set([guildId, ...(member.roles ?? [])]);
    const ok = roles.some((role) => {
      if (!memberRoleIds.has(role.id)) return false;

      try {
        return (BigInt(role.permissions) & administratorPermission) === administratorPermission;
      } catch {
        return false;
      }
    });

    cacheAdminCheck(cacheKey, ok);
    return ok;
  } catch {
    cacheAdminCheck(cacheKey, false);
    return false;
  }
}

function cacheAdminCheck(cacheKey: string, ok: boolean) {
  adminCheckCache.set(cacheKey, {
    expiresAt: Date.now() + adminCheckTtlMs,
    ok,
  });
}
