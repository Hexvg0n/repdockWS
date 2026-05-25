type PlatformName = "taobao" | "tmall" | "1688" | "weidian";

interface Platform {
  hosts: string[];
  urlPattern: string;
  itemIDPattern: RegExp[];
}

interface Middleman {
  name: string;
  template: string;
  platformMapping: Record<PlatformName, string>;
  requiresDecoding: boolean;
  aliases?: string[];
  reverseMapping?: Record<string, PlatformName>;
}

export interface ConvertedLink {
  key: string;
  name: string;
  url: string;
}

interface ExtractionResult {
  itemID: string;
  platformCode?: string;
}

const platforms: Readonly<Record<PlatformName, Platform>> = {
  taobao: {
    hosts: ["taobao.com"],
    urlPattern: "https://item.taobao.com/item.htm?id={{itemID}}",
    itemIDPattern: [/[?&]id=(\d+)/],
  },
  tmall: {
    hosts: ["tmall.com"],
    urlPattern: "https://detail.tmall.com/item.htm?id={{itemID}}",
    itemIDPattern: [/[?&]id=(\d+)/],
  },
  "1688": {
    hosts: ["1688.com"],
    urlPattern: "https://detail.1688.com/offer/{{itemID}}.html",
    itemIDPattern: [/\/offer\/(\d+)\.html/],
  },
  weidian: {
    hosts: ["weidian.com"],
    urlPattern: "https://weidian.com/item.html?itemID={{itemID}}",
    itemIDPattern: [/[?&]itemI[dD]=(\d+)/],
  },
};

const standardMapping: Record<PlatformName, string> = {
  taobao: "taobao",
  tmall: "tmall",
  "1688": "ali_1688",
  weidian: "weidian",
};

const domainMapping: Record<PlatformName, string> = {
  taobao: "item.taobao.com",
  tmall: "detail.tmall.com",
  "1688": "detail.1688.com",
  weidian: "weidian.com",
};

const hoobuyCodes: Record<PlatformName, string> = {
  "1688": "0",
  taobao: "1",
  weidian: "2",
  tmall: "3",
};

const usfansCodes: Record<PlatformName, string> = {
  "1688": "1",
  taobao: "2",
  weidian: "3",
  tmall: "2",
};

const bbdbuyCodes: Record<PlatformName, string> = {
  taobao: "TAOBAO",
  tmall: "TAOBAO",
  "1688": "1688",
  weidian: "WEIDIAN",
};

const litbuyCodes: Record<PlatformName, string> = {
  taobao: "1",
  tmall: "1",
  "1688": "0",
  weidian: "weidian",
};

const middlemen: Readonly<Record<string, Middleman>> = {
  bbdbuy: {
    name: "BBDBuy",
    template: "www.bbdbuyeu.com/goods/{{platformCode}}/{{itemID}}?inviteCode=ZqhUMV",
    platformMapping: bbdbuyCodes,
    requiresDecoding: false,
    aliases: ["bbd"],
    reverseMapping: { "TAOBAO": "taobao", "1688": "1688", "WEIDIAN": "weidian" },
  },
  kakobuy: {
    name: "Kakobuy",
    template: "https://www.kakobuy.com/item/details?url={{encodedUrl}}&affcode=RepDock",
    platformMapping: domainMapping,
    requiresDecoding: true,
    aliases: ["kako"],
  },
  usfans: {
    name: "USFans",
    template: "https://www.usfans.com/product/{{platformCode}}/{{itemID}}",
    platformMapping: usfansCodes,
    requiresDecoding: false,
    reverseMapping: { "1": "1688", "2": "taobao", "3": "weidian" },
  },
  acbuy: {
    name: "ACBuy",
    template: "https://acbuy.com/product?id={{itemID}}&source={{platformCode}}",
    platformMapping: { taobao: "TB", tmall: "TB", weidian: "WD", "1688": "AL" },
    requiresDecoding: false,
    reverseMapping: { TB: "taobao", WD: "weidian", AL: "1688" },
  },
  litbuy: {
    name: "Litbuy",
    template: "https://litbuy.com/product/{{platformCode}}/{{itemID}}",
    platformMapping: litbuyCodes,
    requiresDecoding: false,
    reverseMapping: { "0": "1688", "1": "taobao", weidian: "weidian" },
  },
  cnfans: {
    name: "CNFans",
    template: "https://cnfans.com/product/?shop_type={{platformCode}}&id={{itemID}}",
    platformMapping: standardMapping,
    requiresDecoding: false,
    reverseMapping: { taobao: "taobao", ali_1688: "1688", weidian: "weidian", tmall: "tmall" },
  },
  superbuy: {
    name: "Superbuy",
    template: "https://www.superbuy.com/en/page/buy/?url={{encodedUrl}}",
    platformMapping: domainMapping,
    requiresDecoding: true,
  },
  cssbuy: {
    name: "CSSBuy",
    template: "https://cssbuy.com/item{{platformCode}}{{itemID}}.html",
    platformMapping: { taobao: "-taobao-", tmall: "-tmall-", "1688": "-1688-", weidian: "-micro-" },
    requiresDecoding: false,
    reverseMapping: { "-taobao-": "taobao", "-tmall-": "tmall", "-1688-": "1688", "-micro-": "weidian" },
  },
  allchinabuy: {
    name: "AllChinaBuy",
    template: "https://www.allchinabuy.com/en/page/buy/?url={{encodedUrl}}",
    platformMapping: domainMapping,
    requiresDecoding: true,
  },
  basetao: {
    name: "Basetao",
    template: "https://www.basetao.com/products/agent/{{platformCode}}/{{itemID}}.html",
    platformMapping: { taobao: "taobao", tmall: "tmall", "1688": "1688", weidian: "weidian" },
    requiresDecoding: false,
    reverseMapping: { taobao: "taobao", tmall: "tmall", "1688": "1688", weidian: "weidian" },
  },
  lovegobuy: {
    name: "LoveGoBuy",
    template: "https://www.lovegobuy.com/product?id={{itemID}}&shop_type={{platformCode}}",
    platformMapping: { taobao: "taobao", tmall: "tmall", "1688": "1688", weidian: "weidian" },
    requiresDecoding: false,
    reverseMapping: { taobao: "taobao", tmall: "tmall", "1688": "1688", weidian: "weidian" },
  },
  joyagoo: {
    name: "Joyagoo",
    template: "https://joyagoo.com/product/?shop_type={{platformCode}}&id={{itemID}}",
    platformMapping: standardMapping,
    requiresDecoding: false,
    reverseMapping: { taobao: "taobao", ali_1688: "1688", weidian: "weidian", tmall: "tmall" },
  },
  mulebuy: {
    name: "Mulebuy",
    template: "https://mulebuy.com/product/?shop_type={{platformCode}}&id={{itemID}}",
    platformMapping: standardMapping,
    requiresDecoding: false,
    reverseMapping: { taobao: "taobao", ali_1688: "1688", weidian: "weidian", tmall: "tmall" },
  },
  hoobuy: {
    name: "HooBuy",
    template: "https://hoobuy.com/product/{{platformCode}}/{{itemID}}",
    platformMapping: hoobuyCodes,
    requiresDecoding: false,
    reverseMapping: { "0": "1688", "1": "taobao", "2": "weidian", "3": "tmall" },
  },
};

const templateRegexCache = new Map<string, RegExp>();
const MAX_URL_LENGTH = 4096;

const safeDecodeURIComponent = (value: string): string => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

const normalizeUrlInput = (inputUrl: string): string | null => {
  const trimmed = inputUrl.trim();

  if (!trimmed || trimmed.length > MAX_URL_LENGTH) return null;

  return /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
};

const getHostname = (inputUrl: string): string | null => {
  const normalized = normalizeUrlInput(inputUrl);
  if (!normalized) return null;

  try {
    return new URL(normalized).hostname.toLowerCase();
  } catch {
    return null;
  }
};

const hostMatches = (hostname: string, allowedHost: string): boolean =>
  hostname === allowedHost || hostname.endsWith(`.${allowedHost}`);

export function getConverterAgents() {
  return Object.entries(middlemen).map(([key, { name }]) => ({ key, name }));
}

export function convertLink(url: string) {
  let originalUrl = convertMiddlemanToOriginal(url);

  if (!originalUrl && identifyPlatform(url)) {
    const platform = identifyPlatform(url)!;
    const extraction = extractItemID(url, platforms[platform].itemIDPattern);
    originalUrl = extraction?.itemID ? buildOriginalUrl(platform, extraction.itemID) : url;
  }

  const baseUrl = originalUrl || url;
  const platform = identifyPlatform(baseUrl);
  const convertedLinks: ConvertedLink[] = Object.entries(middlemen)
    .map(([key, { name }]) => {
      const convertedUrl = convertUrlToMiddleman(baseUrl, key);
      return convertedUrl ? { key, name, url: convertedUrl } : null;
    })
    .filter((link): link is ConvertedLink => link !== null);

  return {
    originalUrl: originalUrl || null,
    platform,
    convertedLinks,
  };
}

const templateToRegex = (template: string): RegExp => {
  if (templateRegexCache.has(template)) {
    return templateRegexCache.get(template)!;
  }

  let pattern = template
    .replaceAll(/[.+?^${}()|[\]\\]/g, String.raw`\$&`)
    .replaceAll(String.raw`\{\{platformCode\}\}`, "(?<platformCode>[^/&?]+)")
    .replaceAll(String.raw`\{\{itemID\}\}`, String.raw`(?<itemID>\d+)`)
    .replaceAll(String.raw`\{\{encodedUrl\}\}`, "(?<encodedUrl>[^&]+)");

  pattern = pattern.replace(/^https\\:/, "https?:").replace(/www\\\./, String.raw`(?:www\.)?`);

  const regex = new RegExp(pattern, "i");
  templateRegexCache.set(template, regex);
  return regex;
};

const extractQueryParams = (inputUrl: string): Record<string, string> => {
  try {
    const url = new RegExp(/^https?:\/\//).exec(inputUrl) ? inputUrl : `https://${inputUrl}`;
    const urlObj = new URL(url);
    const params: Record<string, string> = {};
    urlObj.searchParams.forEach((value, key) => {
      params[key] = value;
    });
    return params;
  } catch {
    return {};
  }
};

const parseMiddlemanUrl = (
  urlStr: string,
  middleman: Middleman,
): {
  itemID?: string;
  platformCode?: string;
  encodedUrl?: string;
} | null => {
  const regex = templateToRegex(middleman.template);
  const match = new RegExp(regex).exec(urlStr);

  if (match?.groups) {
    return {
      itemID: match.groups.itemID,
      platformCode: match.groups.platformCode,
      encodedUrl: match.groups.encodedUrl,
    };
  }

  const params = extractQueryParams(urlStr);
  const itemID = params.id || params.itemID || params.item_id;
  let platformCode = params.shop_type || params.platform || params.source;

  if (platformCode) {
    if (platformCode.toUpperCase() === "WEIDIAN") platformCode = "weidian";
    if (platformCode.toUpperCase() === "TAOBAO") platformCode = "taobao";
    if (platformCode.toUpperCase() === "1688") platformCode = "1688";
    if (platformCode.toUpperCase() === "TMALL") platformCode = "tmall";
  }

  const encodedUrl = params.url;
  return itemID || encodedUrl ? { itemID, platformCode, encodedUrl } : null;
};

const extractItemID = (url: string, patterns: RegExp[]): ExtractionResult | null => {
  const decoded = safeDecodeURIComponent(url);

  for (const pattern of patterns) {
    const match = decoded.match(pattern);

    if (match) {
      return match.length > 2
        ? { platformCode: match[1], itemID: match[2] }
        : { itemID: match[1] };
    }
  }

  return null;
};

const decodeMiddlemanUrl = (url: string, middleman: Middleman): string => {
  if (!middleman.requiresDecoding) return url;

  const normalized = normalizeUrlInput(url);
  if (!normalized) return url;

  try {
    const urlParam = new URL(normalized).searchParams.get("url");
    return urlParam ? safeDecodeURIComponent(urlParam) : url;
  } catch {
    return url;
  }
};

const identifyPlatform = (url: string): PlatformName | null => {
  const hostname = getHostname(url);
  if (!hostname) return null;

  for (const [name, platform] of Object.entries(platforms)) {
    if (platform.hosts.some((host) => hostMatches(hostname, host))) {
      return name as PlatformName;
    }
  }

  return null;
};

const buildOriginalUrl = (platform: PlatformName, itemID: string): string =>
  platforms[platform].urlPattern.replace("{{itemID}}", itemID);

const matchesMiddleman = (url: string, key: string, middleman: Middleman): boolean => {
  const hostname = getHostname(url);
  if (!hostname) return false;

  const names = [key, ...(middleman.aliases || [])];
  return names.some((name) => hostname.includes(name.toLowerCase()));
};

const convertMiddlemanToOriginal = (url: string): string | null => {
  for (const [key, middleman] of Object.entries(middlemen)) {
    if (!matchesMiddleman(url, key, middleman)) continue;

    if (middleman.requiresDecoding) {
      const decodedUrl = decodeMiddlemanUrl(url, middleman);
      const platform = identifyPlatform(decodedUrl);

      if (platform) {
        const extraction = extractItemID(decodedUrl, platforms[platform].itemIDPattern);
        if (extraction?.itemID) return buildOriginalUrl(platform, extraction.itemID);
      }

      continue;
    }

    const parsed = parseMiddlemanUrl(url, middleman);
    if (!parsed?.itemID) continue;

    if (parsed.platformCode && middleman.reverseMapping) {
      const platform = middleman.reverseMapping[parsed.platformCode];
      if (platform) return buildOriginalUrl(platform, parsed.itemID);
    }
  }

  return null;
};

const convertUrlToMiddleman = (originalUrl: string, middlemanKey: string): string | null => {
  const middleman = middlemen[middlemanKey];
  if (!middleman) return null;

  const platform = identifyPlatform(originalUrl);
  if (!platform) return null;

  const extraction = extractItemID(originalUrl, platforms[platform].itemIDPattern);
  if (!extraction?.itemID) return null;

  const { itemID } = extraction;
  const platformCode = middleman.platformMapping[platform];

  if (!platformCode && middleman.template.includes("{{platformCode}}")) {
    return null;
  }

  return middleman.template
    .replaceAll('{{itemID}}', itemID)
    .replaceAll('{{platformCode}}', platformCode || "")
    .replaceAll('{{encodedUrl}}', encodeURIComponent(originalUrl));
};
