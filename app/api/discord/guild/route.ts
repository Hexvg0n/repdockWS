import { NextResponse } from "next/server";

type DiscordGuildResponse = {
  approximate_member_count?: number;
  member_count?: number;
};

type GuildStatsResponse = {
  memberCount: number | null;
};

const guildStatsCacheTtlMs = 5 * 60 * 1000;
const responseHeaders = {
  "Cache-Control": "public, s-maxage=300, stale-while-revalidate=900",
};

let guildStatsCache:
  | {
      data: GuildStatsResponse;
      expiresAt: number;
    }
  | null = null;

export async function GET() {
  const now = Date.now();

  if (guildStatsCache && guildStatsCache.expiresAt > now) {
    return NextResponse.json(guildStatsCache.data, {
      headers: responseHeaders,
    });
  }

  const guildId = process.env.DISCORD_GUILD_ID;
  const botToken = process.env.DISCORD_BOT_TOKEN;

  if (!guildId || !botToken) {
    return NextResponse.json(
      { error: "Discord guild stats are not configured" },
      { status: 500 },
    );
  }

  try {
    const response = await fetch(
      `https://discord.com/api/v10/guilds/${guildId}?with_counts=true`,
      {
        headers: {
          Authorization: `Bot ${botToken}`,
        },
        next: {
          revalidate: 300,
        },
        signal: AbortSignal.timeout(4000),
      },
    );

    if (!response.ok) {
      if (guildStatsCache) {
        return NextResponse.json(guildStatsCache.data, {
          headers: responseHeaders,
        });
      }

      return NextResponse.json(
        { error: "Failed to fetch Discord guild stats" },
        { status: response.status },
      );
    }

    const guild = (await response.json()) as DiscordGuildResponse;
    const data = {
      memberCount: guild.approximate_member_count ?? guild.member_count ?? null,
    };

    guildStatsCache = {
      data,
      expiresAt: now + guildStatsCacheTtlMs,
    };

    return NextResponse.json(data, {
      headers: responseHeaders,
    });
  } catch {
    if (guildStatsCache) {
      return NextResponse.json(guildStatsCache.data, {
        headers: responseHeaders,
      });
    }

    return NextResponse.json(
      { error: "Failed to fetch Discord guild stats" },
      { status: 504 },
    );
  }
}
