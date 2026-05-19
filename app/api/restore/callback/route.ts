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
};

type RestoreUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  guildId: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: number;
  scopes: string;
  consentedAt: string;
  updatedAt: string;
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
  path.normalize("C:/Users/hexag/OneDrive/Desktop/Projekt-RepDock/repdockbot/bot/restore_oauth_states.json");

const usersPath =
  process.env.RESTORE_USERS_PATH ??
  path.normalize("C:/Users/hexag/OneDrive/Desktop/Projekt-RepDock/repdockbot/bot/restore_users.json");

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

async function saveRestoreUser(user: RestoreUser) {
  const data = await readJson<RestoreUsersFile>(usersPath, { users: {} });
  data.users[user.id] = user;
  await writeJson(usersPath, data);

  const client = getMongoClient();
  if (!client) return;

  try {
    const db = (await client).db(process.env.MONGODB_DB ?? "repdock");
    await db.collection("restore_users").updateOne(
      { id: user.id },
      {
        $set: user,
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

  await saveRestoreUser({
    id: discordUser.id,
    username: discordUser.username,
    globalName: discordUser.global_name ?? null,
    avatar: discordUser.avatar ?? null,
    guildId: savedState.guildId,
    accessToken: token.access_token,
    refreshToken: token.refresh_token,
    expiresAt: Date.now() + token.expires_in * 1000,
    scopes: token.scope,
    consentedAt: now,
    updatedAt: now,
  });

  return renderHtml(
    "Restore zapisany",
    "Dziekujemy. Twoja zgoda restore zostala zapisana. Mozesz zamknac te strone.",
  );
}
