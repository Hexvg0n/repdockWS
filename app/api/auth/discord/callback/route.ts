import { NextRequest, NextResponse } from "next/server";

import {
  createSessionCookieValue,
  getDiscordAvatarUrl,
  oauthStateCookieName,
  parseSessionCookieValue,
  sessionCookieName,
  type DiscordSession,
} from "@/lib/auth";
import { getDiscordRedirectUri, getPublicUrl } from "@/lib/discord-oauth";

type DiscordTokenResponse = {
  access_token: string;
  token_type: string;
};

type DiscordUserResponse = {
  id: string;
  username: string;
  global_name?: string | null;
  avatar?: string | null;
};

type DiscordGuildResponse = {
  id: string;
  permissions: string;
};

const administratorPermission = BigInt(8);

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderPostBridge(request: NextRequest, code: string, state: string) {
  const action = escapeHtml(request.nextUrl.pathname);
  const escapedCode = escapeHtml(code);
  const escapedState = escapeHtml(state);

  return new NextResponse(
    `<!doctype html>
<html lang="pl">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>Logowanie Discord</title>
  </head>
  <body style="margin:0;min-height:100vh;display:grid;place-items:center;background:#0b0d13;color:#fff;font-family:Arial,sans-serif">
    <main style="max-width:420px;padding:32px;text-align:center">
      <h1 style="margin:0 0 12px;font-size:24px">Konczymy logowanie</h1>
      <p style="margin:0 0 20px;color:#a3a3ad;line-height:1.6">Przekazujemy autoryzacje bezpieczna metoda POST.</p>
      <form method="post" action="${action}">
        <input type="hidden" name="code" value="${escapedCode}" />
        <input type="hidden" name="state" value="${escapedState}" />
        <button type="submit" style="border:0;border-radius:14px;background:#fff;color:#000;padding:12px 18px;font-weight:700">Kontynuuj</button>
      </form>
      <script>document.forms[0]?.requestSubmit();</script>
    </main>
  </body>
</html>`,
    { headers: { "Content-Type": "text/html; charset=utf-8" } },
  );
}

async function handleDiscordCallback(request: NextRequest, code: string | null, state: string | null) {
  const savedState = request.cookies.get(oauthStateCookieName)?.value;
  const existingSession = parseSessionCookieValue(request.cookies.get(sessionCookieName)?.value);

  if (!code || !state || !savedState || state !== savedState) {
    if (existingSession) {
      return NextResponse.redirect(getPublicUrl(request, "/"));
    }

    return NextResponse.json({ error: "Invalid Discord OAuth state" }, { status: 400 });
  }

  const clientId = process.env.DISCORD_CLIENT_ID;
  const clientSecret = process.env.DISCORD_CLIENT_SECRET;

  if (!clientId || !clientSecret || !process.env.AUTH_SECRET) {
    return NextResponse.json(
      { error: "Discord OAuth is not configured" },
      { status: 500 },
    );
  }

  const redirectUri = getDiscordRedirectUri(request);
  const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
    method: "POST",
    cache: "no-store",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  });

  if (!tokenResponse.ok) {
    const errorBody = await tokenResponse.text();

    console.error("Discord token exchange failed", {
      status: tokenResponse.status,
      redirectUri,
      body: errorBody,
    });

    return NextResponse.json(
      {
        error: "Failed to exchange Discord authorization code",
        ...(process.env.NODE_ENV !== "production"
          ? {
              status: tokenResponse.status,
              discordError: errorBody,
              redirectUri,
            }
          : {}),
      },
      { status: 401 },
    );
  }

  const token = (await tokenResponse.json()) as DiscordTokenResponse;

  const authHeaders = {
    authorization: `${token.token_type} ${token.access_token}`,
  };
  const adminGuildId = process.env.DISCORD_ADMIN_GUILD_ID ?? process.env.DISCORD_GUILD_ID;
  const userRequest = fetch("https://discord.com/api/users/@me", {
    cache: "no-store",
    headers: {
      ...authHeaders,
    },
  });
  const guildsRequest = adminGuildId
    ? fetch("https://discord.com/api/users/@me/guilds", {
        cache: "no-store",
        headers: {
          ...authHeaders,
        },
      })
    : null;
  const [userResponse, guildsResponse] = await Promise.all([
    userRequest,
    guildsRequest,
  ]);

  if (!userResponse.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Discord user" },
      { status: 401 },
    );
  }

  const user = (await userResponse.json()) as DiscordUserResponse;
  const avatarUrl = getDiscordAvatarUrl(user.id, user.avatar);
  let isAdmin = false;

  if (guildsResponse?.ok) {
      const guilds = (await guildsResponse.json()) as DiscordGuildResponse[];
      const targetGuild = guilds.find((guild) => guild.id === adminGuildId);

      if (targetGuild) {
        isAdmin = (BigInt(targetGuild.permissions) & administratorPermission) === administratorPermission;
      }
  }

  const session: DiscordSession = {
    id: user.id,
    username: user.username,
    globalName: user.global_name ?? null,
    avatar: user.avatar ?? null,
    avatarUrl,
    isAdmin,
  };

  const response = NextResponse.redirect(getPublicUrl(request, "/"));

  response.cookies.delete(oauthStateCookieName);
  response.cookies.set(sessionCookieName, createSessionCookieValue(session), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
  });

  return response;
}

export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");

  if (!code || !state) {
    const existingSession = parseSessionCookieValue(request.cookies.get(sessionCookieName)?.value);

    if (existingSession) {
      return NextResponse.redirect(getPublicUrl(request, "/"));
    }

    return NextResponse.json({ error: "Invalid Discord OAuth state" }, { status: 400 });
  }

  return renderPostBridge(request, code, state);
}

export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const code = formData.get("code");
  const state = formData.get("state");

  return handleDiscordCallback(
    request,
    typeof code === "string" ? code : null,
    typeof state === "string" ? state : null,
  );
}
