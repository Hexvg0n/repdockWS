import type { NextRequest } from "next/server";

import { startRestoreOAuth } from "@/lib/restore-oauth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  return startRestoreOAuth(request, "verify");
}
