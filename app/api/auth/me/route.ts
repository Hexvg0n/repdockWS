import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { parseSessionCookieValue, sessionCookieName } from "@/lib/auth";

export async function GET() {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(sessionCookieName)?.value;
  const user = parseSessionCookieValue(sessionCookie);

  return NextResponse.json({ user });
}
