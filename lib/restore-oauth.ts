import crypto from "crypto";
import fs from "fs/promises";
import path from "path";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

import { getPublicUrl } from "@/lib/discord-oauth";

export type RestoreOAuthMode = "restore" | "verify";

type RestoreState = {
  guildId: string;
  createdAt: number;
  mode: RestoreOAuthMode;
};

const statePath =
  process.env.RESTORE_STATES_PATH ??
  path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "restore_oauth_states.json");

async function readStates(): Promise<Record<string, RestoreState>> {
  try {
    return JSON.parse(await fs.readFile(statePath, "utf8")) as Record<string, RestoreState>;
  } catch {
    return {};
  }
}

async function writeStates(states: Record<string, RestoreState>) {
  await fs.mkdir(path.dirname(statePath), { recursive: true });
  await fs.writeFile(statePath, JSON.stringify(states, null, 2), "utf8");
}

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
  const states = await readStates();

  for (const [key, value] of Object.entries(states)) {
    if (!value.createdAt || value.createdAt < now - 10 * 60 * 1000) {
      delete states[key];
    }
  }

  const state = crypto.randomBytes(24).toString("hex");
  states[state] = { guildId, createdAt: now, mode };
  await writeStates(states);

  const authorizationUrl = new URL("https://discord.com/oauth2/authorize");
  authorizationUrl.searchParams.set("client_id", clientId);
  authorizationUrl.searchParams.set("redirect_uri", getRestoreRedirectUri(request));
  authorizationUrl.searchParams.set("response_type", "code");
  authorizationUrl.searchParams.set("scope", "identify guilds.join");
  authorizationUrl.searchParams.set("state", state);
  authorizationUrl.searchParams.set("prompt", "consent");

  return NextResponse.redirect(authorizationUrl);
}
