export type LinkPlatform = "1688" | "taobao" | "tmall" | "weidian" | "unknown";

export type ResolvedLink = {
  id: string | null;
  platform: LinkPlatform;
};

export function resolveLink(url: string): ResolvedLink {
  try {
    const parsed = new URL(url);
    const hostname = parsed.hostname.toLowerCase();
    const fullUrl = parsed.toString();

    if (hostname.includes("weidian.com")) {
      return {
        id: parsed.searchParams.get("itemID") ?? parsed.searchParams.get("itemId"),
        platform: "weidian",
      };
    }

    if (hostname.includes("1688.com")) {
      return {
        id: fullUrl.match(/offer\/(\d+)\.html/)?.[1] ?? parsed.searchParams.get("id"),
        platform: "1688",
      };
    }

    if (hostname.includes("tmall.com")) {
      return {
        id: parsed.searchParams.get("id"),
        platform: "tmall",
      };
    }

    if (hostname.includes("taobao.com")) {
      return {
        id: parsed.searchParams.get("id"),
        platform: "taobao",
      };
    }

    return {
      id: null,
      platform: "unknown",
    };
  } catch {
    return {
      id: null,
      platform: "unknown",
    };
  }
}
