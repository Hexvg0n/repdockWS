import fs from "fs/promises";
import { NextResponse } from "next/server";
import path from "path";

import { getAdminSession } from "@/lib/admin-auth";

export const runtime = "nodejs";

const configPath = path.join(process.cwd(), "bot", "ticket_config.json");

async function requireAdmin() {
  const session = await getAdminSession();
  return session ? null : new NextResponse("Unauthorized", { status: 401 });
}

export async function GET() {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const data = await fs.readFile(configPath, "utf8");
    return NextResponse.json({ config: JSON.parse(data) });
  } catch (error) {
    const code = (error as NodeJS.ErrnoException).code;

    if (code === "ENOENT") {
      return NextResponse.json({ config: {} });
    }

    console.error("Ticket config read failed", error);
    return NextResponse.json({ error: "Failed to read configuration" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const unauthorized = await requireAdmin();
  if (unauthorized) return unauthorized;

  try {
    const body = await request.json();

    await fs.mkdir(path.dirname(configPath), { recursive: true });
    await fs.writeFile(configPath, JSON.stringify(body, null, 2), "utf8");

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Ticket config write failed", error);
    return NextResponse.json({ error: "Failed to save configuration" }, { status: 500 });
  }
}
