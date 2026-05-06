import { createHmac, timingSafeEqual } from "crypto";

export const sessionCookieName = "repdock_session";
export const oauthStateCookieName = "repdock_oauth_state";

export type DiscordSession = {
  id: string;
  username: string;
  globalName: string | null;
  avatar: string | null;
  avatarUrl: string;
  isAdmin: boolean;
};

export function getDiscordAvatarUrl(userId: string, avatar?: string | null) {
  if (avatar) {
    const extension = avatar.startsWith("a_") ? "gif" : "png";

    return `https://cdn.discordapp.com/avatars/${userId}/${avatar}.${extension}?size=128`;
  }

  const defaultAvatarIndex = Number((BigInt(userId) >> BigInt(22)) % BigInt(6));

  return `https://cdn.discordapp.com/embed/avatars/${defaultAvatarIndex}.png`;
}

function base64UrlEncode(value: string) {
  return Buffer.from(value).toString("base64url");
}

function base64UrlDecode(value: string) {
  return Buffer.from(value, "base64url").toString("utf8");
}

function sign(value: string) {
  const secret = process.env.AUTH_SECRET;

  if (!secret) {
    throw new Error("AUTH_SECRET is not configured");
  }

  return createHmac("sha256", secret).update(value).digest("base64url");
}

export function createSessionCookieValue(session: DiscordSession) {
  const payload = base64UrlEncode(JSON.stringify(session));
  const signature = sign(payload);

  return `${payload}.${signature}`;
}

export function parseSessionCookieValue(cookieValue?: string) {
  if (!cookieValue) {
    return null;
  }

  const [payload, signature] = cookieValue.split(".");

  if (!payload || !signature) {
    return null;
  }

  const expectedSignature = sign(payload);
  const received = Buffer.from(signature);
  const expected = Buffer.from(expectedSignature);

  if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
    return null;
  }

  const session = JSON.parse(base64UrlDecode(payload)) as Partial<DiscordSession> & {
    id: string;
    username: string;
  };

  return {
    id: session.id,
    username: session.username,
    globalName: session.globalName ?? null,
    avatar: session.avatar ?? null,
    avatarUrl: session.avatarUrl ?? getDiscordAvatarUrl(session.id, session.avatar),
    isAdmin: session.isAdmin ?? false,
  } satisfies DiscordSession;
}
