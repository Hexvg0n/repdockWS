import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord-bot";

export const runtime = "nodejs";

const configPath = path.join(process.cwd(), "bot", "ticket_config.json");

type BotConfig = {
  ids?: Record<string, unknown>;
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

function buildAuthorizeUrl(mode: "restore" | "verify") {
  const publicBaseUrl = getPublicBaseUrl();

  if (!publicBaseUrl) {
    return "";
  }

  const url = new URL(mode === "verify" ? "/api/restore/verify" : "/api/restore/authorize", `${publicBaseUrl}/`);
  return url.toString();
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
    const body = (await request.json()) as {
      channelId?: unknown;
      panelType?: unknown;
    };
    const config = await readJson<BotConfig>(configPath, {});
    const ids = config.ids ?? {};
    const channelId = String(body.channelId || ids.restorePanelChannelId || "").trim();
    const panelType = body.panelType === "restore" ? "restore" : "verify";

    if (!channelId) {
      return NextResponse.json({ error: "Missing restore panel channel ID" }, { status: 400 });
    }

    const authorizeUrl = buildAuthorizeUrl(panelType);

    if (!authorizeUrl) {
      return NextResponse.json({ error: "Missing PUBLIC_BASE_URL" }, { status: 500 });
    }

    const payload =
      panelType === "verify"
        ? {
            embeds: [
              {
                title: "RepDock Verification",
                description:
                  "Kliknij przycisk ponizej, aby przejsc weryfikacje przez Discord OAuth. Po autoryzacji zapiszemy zgode restore, podstawowe dane techniczne sesji i nadamy role weryfikacji.",
                color: 0x5865f2,
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 2,
                    label: "Zweryfikuj sie",
                    custom_id: "verify_member",
                  },
                ],
              },
            ],
          }
        : {
            embeds: [
              {
                title: "RepDock Restore",
                description:
                  "Zapisz zgode restore i podstawowe dane techniczne sesji, aby administracja mogla przywrocic Cie na serwer, jesli kiedys utracisz dostep.",
                color: 0x22d3ee,
              },
            ],
            components: [
              {
                type: 1,
                components: [
                  {
                    type: 2,
                    style: 5,
                    label: "Zapisz restore",
                    url: authorizeUrl,
                  },
                ],
              },
            ],
          };

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers: {
        Authorization: `Bot ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Restore panel send failed", errorText);
      return NextResponse.json({ error: errorText || response.statusText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Restore panel route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send restore panel" },
      { status: 500 },
    );
  }
}
