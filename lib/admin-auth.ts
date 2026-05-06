import { cookies } from "next/headers";

import { parseSessionCookieValue, sessionCookieName } from "@/lib/auth";

export async function getAdminSession() {
  const cookieStore = await cookies();
  const session = parseSessionCookieValue(cookieStore.get(sessionCookieName)?.value);

  if (!session?.isAdmin) {
    return null;
  }

  return session;
}
