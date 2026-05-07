import { convertLink } from "@/lib/converter";
import { resolveLink, type ResolvedLink } from "@/lib/link-resolver";

type ValidatedProductLink = {
  conversion: ReturnType<typeof convertLink>;
  originalLink: string;
  resolved: ResolvedLink;
};

export function validateW2CProductLink(submittedLink: string): ValidatedProductLink | { error: string } {
  const trimmedLink = submittedLink.trim();

  if (!isHttpUrl(trimmedLink)) {
    return { error: "Product link must start with http or https" };
  }

  const conversion = convertLink(trimmedLink);
  const originalLink = conversion.originalUrl ?? trimmedLink;
  const resolved = resolveLink(originalLink);

  if (!resolved.id || resolved.platform === "unknown") {
    return { error: "Unsupported product link. Use Taobao, Tmall, 1688, Weidian or a supported agent link." };
  }

  if (!conversion.originalUrl && conversion.convertedLinks.length === 0) {
    return { error: "Unsupported product link. Could not convert this URL." };
  }

  return {
    conversion,
    originalLink,
    resolved,
  };
}

function isHttpUrl(value: string) {
  try {
    const url = new URL(value);
    return url.protocol === "http:" || url.protocol === "https:";
  } catch {
    return false;
  }
}
