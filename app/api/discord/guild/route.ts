import { NextResponse } from "next/server";

type DiscordGuildResponse = {
  approximate_member_count?: number;
  member_count?: number;
};

export async function GET() {
  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return NextResponse.json(
      { error: "Discord guild stats are not configured" },
      { status: 500 },
    );
  }

  const response = await fetch(
    `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
    {
      headers: {
        Authorization: `Bot ${botToken}`,
      },
      next: {
        revalidate: 60,
      },
    },
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Failed to fetch Discord guild stats" },
      { status: response.status },
    );
  }

  const guild = (await response.json()) as DiscordGuildResponse;

  return NextResponse.json({
    memberCount: guild.approximate_member_count ?? guild.member_count ?? null,
  });
}
