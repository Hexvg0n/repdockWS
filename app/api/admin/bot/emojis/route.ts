import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken } from "@/lib/discord-bot";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = getDiscordBotToken();

  if (!token) {
    return NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
  }

  try {
    const meResponse = await fetch("https://discord.com/api/v10/users/@me", {
      headers: {
        Authorization: `Bot ${token}`,
      },
      cache: "no-store",
    });

    if (!meResponse.ok) {
      throw new Error("Failed to fetch bot user");
    }

    const botUser = (await meResponse.json()) as { id: string };
    const emojisResponse = await fetch(
      `https://discord.com/api/v10/applications/${botUser.id}/emojis`,
      {
        headers: {
          Authorization: `Bot ${token}`,
        },
        cache: "no-store",
      },
    );

    if (!emojisResponse.ok) {
      throw new Error("Failed to fetch application emojis");
    }

    const data = (await emojisResponse.json()) as { items?: unknown[] } | unknown[];
    const emojis = Array.isArray(data) ? data : data.items;

    return NextResponse.json({ emojis: emojis ?? [] });
  } catch (error) {
    console.error("Discord emojis route failed", error);
    return NextResponse.json({ emojis: [] });
  }
}
