import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth";
import { getDiscordBotToken } from "@/lib/discord-bot";

export const runtime = "nodejs";

const componentsV2Flag = 1 << 15;
const emptyStringOptionalKeys = new Set(["description", "placeholder", "url", "custom_id", "sku_id"]);

function normalizeCustomEmojiSyntax(value: string) {
  return value.replace(/<(?!a:|:)([A-Za-z0-9_]{2,32}):(\d{17,20})>/g, "<:$1:$2>");
}

function pruneDiscordPayload(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(pruneDiscordPayload);
  }

  if (typeof value === "string") {
    return normalizeCustomEmojiSyntax(value);
  }

  if (!value || typeof value !== "object") {
    return value;
  }

  const cleaned: Record<string, unknown> = {};

  for (const [key, rawValue] of Object.entries(value)) {
    const nextValue = pruneDiscordPayload(rawValue);

    if (
      typeof nextValue === "string" &&
      nextValue.trim().length === 0 &&
      emptyStringOptionalKeys.has(key)
    ) {
      continue;
    }

    if (key === "emoji" && nextValue && typeof nextValue === "object" && !Array.isArray(nextValue)) {
      const emoji = nextValue as Record<string, unknown>;
      const hasName = typeof emoji.name === "string" && emoji.name.trim().length > 0;
      const hasId = typeof emoji.id === "string" && emoji.id.trim().length > 0;
      if (!hasName && !hasId) continue;
    }

    cleaned[key] = nextValue;
  }

  return cleaned;
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
    const contentType = request.headers.get("content-type") || "";
    let channelId = "";
    let rawPayload: any = null;
    let components: any = null;
    let files: File[] = [];

    if (contentType.includes("multipart/form-data")) {
      const formData = await request.formData();
      channelId = String(formData.get("channelId") || "");

      const payloadJson = formData.get("payload");
      const componentsJson = formData.get("components");

      if (typeof payloadJson === "string" && payloadJson) {
        rawPayload = JSON.parse(payloadJson);
      }

      components =
        rawPayload?.components ??
        (typeof componentsJson === "string" && componentsJson ? JSON.parse(componentsJson) : null);
      files = formData.getAll("files").filter((item): item is File => item instanceof File);
    } else {
      const body = await request.json();
      channelId = body.channelId;
      rawPayload = body.payload && typeof body.payload === "object" ? body.payload : null;
      components = rawPayload?.components ?? body.components;
    }

    if (!channelId) {
      return NextResponse.json({ error: "Missing channelId" }, { status: 400 });
    }

    if (!Array.isArray(components) || components.length === 0) {
      return NextResponse.json(
        { error: "Components V2 payload must contain at least one component" },
        { status: 400 },
      );
    }

    const sanitizedPayload = pruneDiscordPayload(rawPayload || {}) as Record<string, unknown>;
    const sanitizedComponents = pruneDiscordPayload(components);
    const payload = {
      ...sanitizedPayload,
      flags: ((rawPayload?.flags || 0) | componentsV2Flag),
      components: sanitizedComponents,
      allowed_mentions: rawPayload?.allowed_mentions ?? { parse: [] },
      ...(files.length > 0
        ? { attachments: files.map((file, index) => ({ id: String(index), filename: file.name })) }
        : {}),
    };

    const headers: Record<string, string> = {
      Authorization: `Bot ${token}`,
    };
    let body: BodyInit;

    if (files.length > 0) {
      const discordForm = new FormData();
      discordForm.append("payload_json", JSON.stringify(payload));
      files.forEach((file, index) => {
        discordForm.append(`files[${index}]`, file, file.name);
      });
      body = discordForm;
    } else {
      headers["Content-Type"] = "application/json";
      body = JSON.stringify(payload);
    }

    const response = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
      method: "POST",
      headers,
      body,
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Discord Components V2 send failed", errorText);
      return NextResponse.json({ error: errorText || response.statusText }, { status: response.status });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Components V2 send route failed", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to send Components V2 message" },
      { status: 500 },
    );
  }
}
