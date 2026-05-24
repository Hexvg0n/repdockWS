import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken, getDiscordGuildId } from "@/lib/discord-bot";

export async function GET() {
  const session = await getAdminSession();

  if (!session) {
    return new NextResponse("Unauthorized", { status: 401 });
  }

  const token = getDiscordBotToken();
  const guildId = getDiscordGuildId();

  if (!token) {
    return NextResponse.json({ error: "Missing DISCORD_BOT_TOKEN" }, { status: 500 });
  }

  if (!guildId) {
    return NextResponse.json({ error: "Missing DISCORD_GUILD_ID" }, { status: 500 });
  }

  try {
    const response = await fetch(`https://discord.com/api/v10/guilds/${guildId}/channels`, {
      headers: {
        Authorization: `Bot ${token}`,
      },
      cache: "no-store",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord channels fetch failed", errorText);
      return NextResponse.json(
        { error: `Discord API error: ${response.status} ${response.statusText}` },
        { status: response.status },
      );
    }

    const channels = (await response.json()) as Array<{ id: string; name: string; type: number }>;
    const textChannels = channels
      .filter((channel) => channel.type === 0)
      .map((channel) => ({
        id: channel.id,
        name: channel.name,
      }));

    return NextResponse.json({ channels: textChannels });
  } catch (error) {
    console.error("Discord channels route failed", error);
    return NextResponse.json({ error: "Could not fetch Discord channels" }, { status: 500 });
  }
}
