import type { NextRequest } from "next/server";

export function getPublicOrigin(request: NextRequest) {
  const publicUrl =
    process.env.NEXT_PUBLIC_SITE_URL ??
    process.env.SITE_URL ??
    process.env.APP_URL ??
    "";

  if (publicUrl) {
    return publicUrl.replace(/\/+$/, "");
  }

  const host =
    request.headers.get("x-forwarded-host") ??
    request.headers.get("host");
  const forwardedProto = request.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();

  if (host && !isLocalHost(host)) {
    const protocol = forwardedProto || "https";
    return `${protocol}://${host}`;
  }

  const fallbackProtocol = forwardedProto || request.nextUrl.protocol.replace(":", "");
  return `${fallbackProtocol}://${host ?? request.nextUrl.host}`;
}

export function getPublicUrl(request: NextRequest, path = "/") {
  return new URL(path, `${getPublicOrigin(request)}/`);
}

export function getDiscordRedirectUri(request: NextRequest) {
  if (process.env.DISCORD_REDIRECT_URI) {
    return process.env.DISCORD_REDIRECT_URI.replace(/\/+$/, "");
  }

  return getPublicUrl(request, "/api/auth/discord/callback").toString();
}

function isLocalHost(host: string) {
  const normalizedHost = host.toLowerCase().split(":")[0];
  return normalizedHost === "localhost" || normalizedHost === "127.0.0.1" || normalizedHost === "::1";
}
