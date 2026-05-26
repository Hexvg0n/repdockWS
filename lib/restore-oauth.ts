import crypto from "crypto";
import path from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicUrl } from "@/lib/discord-oauth";
import { mutateJsonFile } from "@/lib/json-file-store";

export type RestoreOAuthMode = "restore" | "verify";

type RestoreState = {
  guildId: string;
  createdAt: number;
  mode: RestoreOAuthMode;
};

const statePath =
  process.env.RESTORE_STATES_PATH ??
  path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "restore_oauth_states.json");

function getRestoreRedirectUri(request: NextRequest) {
  return process.env.RESTORE_REDIRECT_URI ?? getPublicUrl(request, "/api/restore/callback").toString();
}

function getRestoreGuildId() {
  return process.env.RESTORE_GUILD_ID ?? process.env.DISCORD_GUILD_ID ?? "";
}

export async function startRestoreOAuth(request: NextRequest, mode: RestoreOAuthMode) {
  const clientId = process.env.DISCORD_CLIENT_ID;
  const guildId = getRestoreGuildId();

  if (!clientId) {
    return NextResponse.json({ error: "DISCORD_CLIENT_ID is not configured" }, { status: 500 });
  }

  if (!guildId) {
    return NextResponse.json({ error: "Missing DISCORD_GUILD_ID" }, { status: 500 });
  }

  const now = Date.now();
  const state = crypto.randomBytes(24).toString("hex");

  await mutateJsonFile<Record<string, RestoreState>, void>(statePath, {}, (states) => {
    for (const [key, value] of Object.entries(states)) {
      if (!value.createdAt || value.createdAt < now - 10 * 60 * 1000) {
        delete states[key];
      }
    }

    states[state] = { guildId, createdAt: now, mode };
    return { next: states, result: undefined };
  });

  const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", getRestoreRedirectUri(request));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "identify guilds.join");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizationUrl);
}
