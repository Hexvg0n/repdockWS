import { NextResponse } from "next/server";

import { convertLink, getConverterAgents } from "@/lib/converter";

export async function GET() {
  return NextResponse.json({ agents: getConverterAgents() });
}

export async function POST(request: Request) {
  try {
    const { url } = (await request.json()) as { url?: unknown };

    if (!url || typeof url !== "string") {
      return NextResponse.json({ error: "Missing or invalid URL parameter" }, { status: 400 });
    }

    return NextResponse.json(convertLink(url));
  } catch (error) {
    console.error("Converter error:", error);
    return NextResponse.json(
      {
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    );
  }
}
