import { NextResponse } from "next/server";

import { convertLink, getConverterAgents } from "@/lib/converter";

const MAX_URL_LENGTH = 4096;

export async function GET() {
  return NextResponse.json({ agents: getConverterAgents() });
}

export async function POST(request: Request) {
  let body: unknown;

  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  const { url } = body as { url?: unknown };

  if (typeof url !== "string") {
    return NextResponse.json({ error: "Missing or invalid URL parameter" }, { status: 400 });
  }

  const trimmedUrl = url.trim();

  if (!trimmedUrl) {
    return NextResponse.json({ error: "Missing or invalid URL parameter" }, { status: 400 });
  }

  if (trimmedUrl.length > MAX_URL_LENGTH) {
    return NextResponse.json({ error: "URL is too long" }, { status: 413 });
  }

  try {
    return NextResponse.json(convertLink(trimmedUrl));
  } catch (error) {
    console.error("Converter error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
      },
      { status: 500 },
    );
  }
}
