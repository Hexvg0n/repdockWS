import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import {
  buildDiscordEmbed,
  buildTicketPanelComponents,
  getDiscordBotToken,
} from "@/lib/discord-bot";
import { readJsonFile } from "@/lib/json-file-store";

export const runtime = "nodejs";

const configPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "ticket_config.json");

async function readTicketCategories() {
  const configData = await readJsonFile<{ ids?: { ticketCategories?: unknown } }>(configPath, {});
  const rawCategories = configData.ids?.ticketCategories;

  if (Array.isArray(rawCategories)) {
    return rawCategories;
  }

  if (typeof rawCategories === "string") {
    return rawCategories
      .split(",")
      .map((category: string) => category.trim())
      .filter(Boolean)
      .map((category: string) => ({
        label: category,
        value: category.toLowerCase().replace(/\s+/g, "-"),
        description: "Ticket",
      }));
  }

  return [];
}

export async function POST(request: Request) {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = getDiscordBotToken();

  if (!token) {
    return NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
  }

  try {
    const body = (await request.json()) as Record<string, any>;
    const { channelId, embedData } = body;

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const categories = await readTicketCategories();
    const payload = {
      embeds: [buildDiscordEmbed(embedData)],
      components: buildTicketPanelComponents(categories),
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
      console.error("Discord ticket panel send failed", errorText);
      return NextResponse.json(
        { error: errorText || `Discord API error: ${response.statusText}` },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ticket panel send route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not send ticket panel" },
      { status: 500 },
    );
  }
}
