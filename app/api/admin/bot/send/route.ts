import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import {
  buildButtonComponents,
  buildDiscordEmbed,
  getDiscordBotToken,
} from "@/lib/discord-bot";

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
    const { channelId, content, embedData } = body;

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    const payload: Record<string, unknown> = {
      content: content || undefined,
      embeds: [buildDiscordEmbed(embedData)],
    };
    const components = buildButtonComponents(embedData);

    if (components.length > 0) {
      payload.components = components;
    }

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
      console.error("Discord embed send failed", errorText);
      return NextResponse.json(
        { error: errorText || `Discord API error: ${response.statusText}` },
        { status: response.status },
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Discord embed send route failed", error);
    return NextResponse.json({ error: "Could not send embed" }, { status: 500 });
  }
}
