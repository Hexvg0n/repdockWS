"use client";

import {
  IconAlertCircle,
  IconArrowRight,
  IconCheck,
  IconClipboard,
  IconCopy,
  IconExternalLink,
  IconLink,
  IconLoader2,
  IconRefresh,
  IconSparkles2Filled,
  IconTrash,
  IconWorld,
} from "@tabler/icons-react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { settingsStorageKey, useLanguageCopy } from "@/lib/use-repdock-language";

type ConvertedLink = {
  key: string;
  name: string;
  url: string;
};

type ConversionResult = {
  convertedLinks: ConvertedLink[];
  originalUrl: string | null;
  platform: "1688" | "taobao" | "tmall" | "weidian" | null;
};

const agentIcons: Record<string, string> = {
  acbuy: "/agents/acb_icon.png",
  kakobuy: "/agents/kako_icon.png",
  litbuy: "/agents/litbuy_logo.jpg",
  rizzitgo: "/agents/rig_icon.png",
  usfans: "/agents/usfans_icon.png",
};

const visibleAgentKeys = new Set(["rizzitgo", "kakobuy", "usfans", "acbuy", "litbuy"]);

const preferredAgentMap: Record<string, string> = {
  ACBUY: "acbuy",
  KAKOBUY: "kakobuy",
  RIZZITGO: "rizzitgo",
  USFANS: "usfans",
};

const converterCopy = {
  PL: {
    actions: {
      clear: "Wyczyść",
      convert: "Konwertuj",
      copied: "Skopiowano",
      copy: "Kopiuj",
      copyOriginal: "Kopiuj oryginał",
      open: "Otwórz",
    },
    empty: {
      badgeFrom: "Link produktu",
      badgeTo: "Linki agentów",
      description:
        "Konwerter przyjmuje linki z marketplace oraz wspieranych agentów, a potem generuje dostępne URL-e agentów.",
      title: "Wklej link, żeby zacząć",
    },
    errors: {
      convert: "Nie udało się skonwertować tego linku.",
      failed: "Konwersja nie powiodła się.",
      missing: "Najpierw wklej link produktu lub agenta.",
      unsupported:
        "Nieobsługiwany link. Spróbuj Taobao, Tmall, 1688, Weidian albo wspieranego linku agenta.",
    },
    header: {
      badge: "Konwerter linków agentów",
      description:
        "Wklej jeden surowy link produktu albo link agenta i od razu wygeneruj czyste linki dla wspieranych agentów.",
      title: "Konwertuj linki produktów",
    },
    labels: {
      original: "Oryginał",
      preferred: "Twój preferowany agent",
      preferredBadge: "Preferowany",
      unknown: "Nieznany",
    },
    inputPlaceholder: "Wklej Taobao, Weidian, 1688, ACBuy, USFans, Kakobuy...",
  },
  EN: {
    actions: {
      clear: "Clear",
      convert: "Convert",
      copied: "Copied",
      copy: "Copy",
      copyOriginal: "Copy original",
      open: "Open",
    },
    empty: {
      badgeFrom: "Product link",
      badgeTo: "Agent links",
      description:
        "The converter accepts original marketplace links and supported agent links, then generates every available agent URL.",
      title: "Paste a link to begin",
    },
    errors: {
      convert: "Could not convert this link.",
      failed: "Conversion failed.",
      missing: "Paste a product or agent link first.",
      unsupported:
        "Unsupported link. Try Taobao, Tmall, 1688, Weidian or a supported agent link.",
    },
    header: {
      badge: "Agent link converter",
      description:
        "Paste one raw or agent product link and instantly generate clean links for supported agents.",
      title: "Convert product links",
    },
    labels: {
      original: "Original",
      preferred: "Your preferred agent",
      preferredBadge: "Preferred",
      unknown: "Unknown",
    },
    inputPlaceholder: "Paste Taobao, Weidian, 1688, ACBuy, USFans, Kakobuy...",
  },
} as const;

type ConverterCopy = (typeof converterCopy)[keyof typeof converterCopy];

export function ConverterTool() {
  const copy = useLanguageCopy(converterCopy);
  const [url, setUrl] = useState("");
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [preferredAgent, setPreferredAgent] = useState("kakobuy");

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(
          globalThis.localStorage.getItem(settingsStorageKey) ?? "{}",
        ) as { agent?: string };
        setPreferredAgent(preferredAgentMap[savedSettings.agent ?? ""] ?? "kakobuy");
      } catch {
        setPreferredAgent("kakobuy");
      }
    };

    loadSettings();
    globalThis.addEventListener("focus", loadSettings);
    globalThis.addEventListener("storage", loadSettings);
    globalThis.addEventListener("repdock-settings-updated", loadSettings);

    return () => {
      globalThis.removeEventListener("focus", loadSettings);
      globalThis.removeEventListener("storage", loadSettings);
      globalThis.removeEventListener("repdock-settings-updated", loadSettings);
    };
  }, []);

  const visibleLinks = useMemo(
    () =>
      result?.convertedLinks.filter((link) => visibleAgentKeys.has(link.key)) ?? [],
    [result],
  );
  const preferredLink = useMemo(
    () => visibleLinks.find((link) => link.key === preferredAgent) ?? null,
    [preferredAgent, visibleLinks],
  );

  const convert = async () => {
    if (!url.trim()) {
      setError(copy.errors.missing);
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setCopiedKey(null);

    try {
      const response = await fetch("/api/converter", {
        body: JSON.stringify({ url: url.trim() }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as ConversionResult & { error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.errors.convert);
      }

      if (!data.originalUrl || data.convertedLinks.length === 0) {
        throw new Error(copy.errors.unsupported);
      }

      setResult(data);
    } catch (conversionError) {
      setResult(null);
      setError(conversionError instanceof Error ? conversionError.message : copy.errors.failed);
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (key: string, value: string) => {
    await navigator.clipboard.writeText(value);
    setCopiedKey(key);
    globalThis.setTimeout(() => setCopiedKey(null), 1600);
  };

  const clear = () => {
    setUrl("");
    setResult(null);
    setError("");
    setCopiedKey(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[560px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_70%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8">
        <div>
          <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
            <IconSparkles2Filled className="size-4" />
            {copy.header.badge}
          </div>
          <h1 className="mt-5 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
            {copy.header.title}
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
            {copy.header.description}
          </p>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <IconLink className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void convert();
                  }
                }}
                placeholder={copy.inputPlaceholder}
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
              />
            </label>
            <Button onClick={convert} disabled={loading} className="h-14 rounded-2xl px-6">
              {loading ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
              {copy.actions.convert}
            </Button>
            <Button
              onClick={clear}
              variant="outline"
              className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]"
            >
              <IconTrash className="size-4" />
              {copy.actions.clear}
            </Button>
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <IconAlertCircle className="size-4" />
              {error}
            </div>
          ) : null}
        </div>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-[360px_minmax(0,1fr)]">
            <aside className="grid gap-4 rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
              <LinkSummaryCard
                copied={copiedKey === "original"}
                copy={copy}
                label={copy.labels.original}
                title={result.platform ?? copy.labels.unknown}
                url={result.originalUrl ?? url}
                onCopy={() => copyToClipboard("original", result.originalUrl ?? url)}
              />

              {preferredLink ? (
                <div className="rounded-3xl border border-blue-300/25 bg-blue-500/10 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">{copy.labels.preferred}</p>
                  <div className="mt-3 flex items-center gap-3">
                    <AgentIcon agentKey={preferredLink.key} />
                    <div className="min-w-0">
                      <p className="font-semibold text-white">{preferredLink.name}</p>
                      <p className="truncate text-sm text-slate-500">{getHostname(preferredLink.url)}</p>
                    </div>
                  </div>
                </div>
              ) : null}
            </aside>

            <section className="grid gap-3 md:grid-cols-2">
              {visibleLinks.map((link) => (
                <ConvertedLinkCard
                  copied={copiedKey === link.key}
                  copy={copy}
                  key={link.key}
                  link={link}
                  preferred={link.key === preferredAgent}
                  onCopy={() => copyToClipboard(link.key, link.url)}
                />
              ))}
            </section>
          </div>
        ) : (
          <EmptyConverterState copy={copy} />
        )}
      </section>
    </main>
  );
}

function ConvertedLinkCard({
  copied,
  copy,
  link,
  preferred,
  onCopy,
}: {
  copied: boolean;
  copy: ConverterCopy;
  link: ConvertedLink;
  preferred: boolean;
  onCopy: () => void;
}) {
  return (
    <article
      className={cn(
        "grid gap-4 rounded-[28px] border bg-[#0d0e14] p-4 shadow-2xl shadow-black/20 transition hover:-translate-y-0.5",
        preferred
          ? "border-blue-300/35 shadow-[0_20px_70px_rgba(41,52,255,0.18)]"
          : "border-white/10",
      )}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-3">
          <AgentIcon agentKey={link.key} />
          <div className="min-w-0">
            <h2 className="truncate font-semibold text-white">{link.name}</h2>
            <p className="truncate text-sm text-slate-500">{getHostname(link.url)}</p>
          </div>
        </div>
        {preferred ? (
          <span className="shrink-0 rounded-full bg-blue-500/15 px-2.5 py-1 text-xs font-semibold text-blue-100">
            {copy.labels.preferredBadge}
          </span>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onCopy}
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white transition hover:bg-white/[0.08]"
        >
          {copied ? <IconCheck className="size-4 text-emerald-300" /> : <IconCopy className="size-4" />}
          {copied ? copy.actions.copied : copy.actions.copy}
        </button>
        <a
          href={link.url}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white text-sm font-bold text-black transition hover:bg-blue-100"
        >
          <IconExternalLink className="size-4" />
          {copy.actions.open}
        </a>
      </div>
    </article>
  );
}

function LinkSummaryCard({
  copied,
  copy,
  label,
  title,
  url,
  onCopy,
}: {
  copied: boolean;
  copy: ConverterCopy;
  label: string;
  title: string;
  url: string;
  onCopy: () => void;
}) {
  return (
    <article className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-3">
        <span className="grid size-11 place-items-center rounded-2xl bg-white/[0.05] text-blue-200 ring-1 ring-white/10">
          <IconWorld className="size-5" />
        </span>
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
          <h2 className="font-semibold capitalize text-white">{title}</h2>
        </div>
      </div>
      <p className="mt-4 line-clamp-3 break-all text-xs leading-relaxed text-slate-400">{url}</p>
      <button
        type="button"
        onClick={onCopy}
        className="mt-4 inline-flex h-10 w-full items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] text-sm font-semibold text-white transition hover:bg-white/[0.08]"
      >
        {copied ? <IconCheck className="size-4 text-emerald-300" /> : <IconCopy className="size-4" />}
        {copied ? copy.actions.copied : copy.actions.copyOriginal}
      </button>
    </article>
  );
}

function AgentIcon({ agentKey }: { agentKey: string }) {
  const icon = agentIcons[agentKey];

  return (
    <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-black">
      {icon ? (
        <img src={icon} alt="" className="max-h-8 max-w-8 object-contain" />
      ) : (
        <span className="text-xs font-black uppercase">{agentKey.slice(0, 2)}</span>
      )}
    </span>
  );
}

function EmptyConverterState({ copy }: { copy: ConverterCopy }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
          <IconClipboard className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">{copy.empty.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          {copy.empty.description}
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-slate-400">
          {copy.empty.badgeFrom}
          <IconArrowRight className="size-3.5" />
          {copy.empty.badgeTo}
        </div>
      </div>
    </div>
  );
}

function getHostname(url: string) {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "converted link";
  }
}
