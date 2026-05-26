import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";
import { readJsonFile, writeJsonFileAtomic } from "@/lib/json-file-store";

export const runtime = "nodejs";

const configPath = path.join(/*turbopackIgnore: true*/ process.cwd(), "bot", "ticket_config.json");

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? null : new NextResponse("Unauthorized", { status: 401 });
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  const config = await readJsonFile<Record<string, unknown>>(configPath, {});
  return NextResponse.json({ config });
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();

    await writeJsonFileAtomic(configPath, body);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ticket config write failed", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
