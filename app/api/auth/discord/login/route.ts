import { randomUUID } from "crypto";
import { NextRequest, NextResponse } from "next/server";

import { oauthStateCookieName } from "@/lib/auth";
import { getDiscordRedirectUri } from "@/lib/discord-oauth";

export function GET(request: NextRequest) {
  const clientId = process.env.DISCORD_CLIENT_ID;

  if (!clientId) {
    return NextResponse.json(
      { error: "Discord OAuth is not configured" },
      { status: 500 },
    );
  }

  const state = randomUUID();
  const redirectUri = getDiscordRedirectUri(request);
  const authorizationUrl = new URL("https://discord.com/oauth2/authorize");

  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", redirectUri);
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "identify guilds");
  authorizationUrl.searchParams.set("state", state);

  const response = NextResponse.redirect(authorizationUrl);

  response.cookies.set(oauthStateCookieName, state, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 60 * 10,
    path: "/",
  });

  return response;
}
