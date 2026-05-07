"use client";

import {
  IconAlertCircle,
  IconArrowRight,
  IconCameraSearch,
  IconCheck,
  IconExternalLink,
  IconFilter,
  IconLoader2,
  IconPhoto,
  IconRefresh,
  IconSparkles2Filled,
  IconTags,
  IconWorldSearch,
  IconX,
} from "@tabler/icons-react";
import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type SourceName = "ACBuy" | "USFans" | "CNFans";

type QCImage = {
  photoUrl: string;
  createTime: string | number | null;
  skuId: string | null;
  source: SourceName;
};

type QCSourceMeta = {
  ok: boolean;
  count: number;
  status?: number;
  skipped?: boolean;
  error?: string;
};

type QCResponseMeta = {
  product: {
    itemId: string;
    originalUrl: string;
    platform: "taobao" | "tmall" | "1688" | "weidian";
    platformCode: "TB" | "AL" | "WD";
  };
  sources: {
    acbuy: QCSourceMeta;
    cnfans: QCSourceMeta;
    usfans: QCSourceMeta;
  };
};

type QCResponse = {
  data?: QCImage[];
  error?: string;
  meta?: QCResponseMeta;
};

const sourceOrder = ["All", "ACBuy", "USFans", "CNFans"] as const;
const sourceLabels: Record<SourceName, string> = {
  ACBuy: "ACBuy",
  CNFans: "CNFans",
  USFans: "USFans",
};

const sourceAccent: Record<SourceName, string> = {
  ACBuy: "from-emerald-300 to-teal-500",
  CNFans: "from-violet-300 to-indigo-500",
  USFans: "from-sky-300 to-blue-500",
};

export function QCTool() {
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<QCImage[]>([]);
  const [meta, setMeta] = useState<QCResponseMeta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<(typeof sourceOrder)[number]>("All");
  const [preview, setPreview] = useState<QCImage | null>(null);

  const filteredImages = useMemo(() => {
    if (activeSource === "All") {
      return images;
    }

    return images.filter((image) => image.source === activeSource);
  }, [activeSource, images]);

  const sourceCounts = useMemo(() => {
    const counts: Record<SourceName, number> = {
      ACBuy: 0,
      CNFans: 0,
      USFans: 0,
    };

    for (const image of images) {
      counts[image.source] += 1;
    }

    return counts;
  }, [images]);

  const search = async () => {
    if (!url.trim()) {
      setError("Paste a product or agent link first.");
      setImages([]);
      setMeta(null);
      return;
    }

    setLoading(true);
    setError("");
    setImages([]);
    setMeta(null);
    setActiveSource("All");

    try {
      const response = await fetch("/api/qc", {
        body: JSON.stringify({ url: url.trim() }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as QCResponse;

      if (!response.ok) {
        setMeta(data.meta ?? null);
        throw new Error(data.error || "Could not load QC photos.");
      }

      setImages(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : "QC lookup failed.");
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setUrl("");
    setImages([]);
    setMeta(null);
    setError("");
    setActiveSource("All");
    setPreview(null);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute left-[-18%] top-28 h-[520px] w-[520px] rotate-[-28deg] bg-[linear-gradient(90deg,transparent,rgba(41,52,255,0.22),transparent)] blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
              <IconSparkles2Filled className="size-4" />
              Warehouse QC finder
            </div>
            <h1 className="mt-5 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
              Find real QC photos
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              Paste a Taobao, 1688, Weidian or agent link and check warehouse photos before buying.
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                <IconWorldSearch className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">Three source search</p>
                <p className="text-xs leading-relaxed text-slate-500">ACBuy, USFans and CNFans are checked in parallel.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <IconCameraSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                value={url}
                onChange={(event) => setUrl(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    void search();
                  }
                }}
                placeholder="Paste product or agent link..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
              />
            </label>
            <Button onClick={search} disabled={loading} className="h-14 rounded-2xl px-6">
              {loading ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
              Search QC
            </Button>
            <Button
              onClick={clear}
              variant="outline"
              className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]"
            >
              <IconX className="size-4" />
              Clear
            </Button>
          </div>

          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              <IconAlertCircle className="size-4" />
              {error}
            </div>
          ) : null}
        </div>

        {meta ? <ProductMetaCard meta={meta} /> : null}

        {images.length > 0 ? (
          <div className="grid gap-5">
            <SourceFilters
              activeSource={activeSource}
              counts={sourceCounts}
              total={images.length}
              onChange={setActiveSource}
            />

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {filteredImages.map((image, index) => (
                <QCImageCard
                  image={image}
                  index={index}
                  key={`${image.photoUrl}-${index}`}
                  onPreview={() => setPreview(image)}
                />
              ))}
            </section>
          </div>
        ) : loading ? (
          <QCLoadingState />
        ) : (
          <QCEmptyState />
        )}
      </section>

      {preview ? <ImagePreview image={preview} onClose={() => setPreview(null)} /> : null}
    </main>
  );
}

function ProductMetaCard({ meta }: { meta: QCResponseMeta }) {
  return (
    <section className="grid gap-4 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Resolved product</p>
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-blue-500/15 px-3 py-1.5 text-sm font-semibold uppercase text-blue-100">
            {meta.product.platform}
          </span>
          <span className="rounded-full bg-white/[0.05] px-3 py-1.5 text-sm text-slate-300">
            ID {meta.product.itemId}
          </span>
        </div>
        <p className="mt-3 truncate text-sm text-slate-500">{meta.product.originalUrl}</p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3 lg:min-w-[420px]">
        <SourceStatus label="ACBuy" meta={meta.sources.acbuy} />
        <SourceStatus label="USFans" meta={meta.sources.usfans} />
        <SourceStatus label="CNFans" meta={meta.sources.cnfans} />
      </div>
    </section>
  );
}

function SourceStatus({ label, meta }: { label: SourceName; meta: QCSourceMeta }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full",
            meta.ok ? "bg-emerald-500/15 text-emerald-200" : "bg-red-500/15 text-red-200",
          )}
        >
          {meta.ok ? <IconCheck className="size-3.5" /> : <IconAlertCircle className="size-3.5" />}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">
        {meta.ok ? `${meta.count} photos` : meta.skipped ? "Skipped" : meta.error ?? "Unavailable"}
      </p>
    </div>
  );
}

function SourceFilters({
  activeSource,
  counts,
  onChange,
  total,
}: {
  activeSource: (typeof sourceOrder)[number];
  counts: Record<SourceName, number>;
  onChange: (source: (typeof sourceOrder)[number]) => void;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <span className="ml-2 mr-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
        <IconFilter className="size-4" />
        Source
      </span>
      {sourceOrder.map((source) => {
        const count = source === "All" ? total : counts[source];
        const active = activeSource === source;

        return (
          <button
            key={source}
            type="button"
            onClick={() => onChange(source)}
            className={cn(
              "inline-flex h-10 items-center gap-2 rounded-2xl px-4 text-sm font-semibold transition",
              active
                ? "bg-white text-black shadow-[0_0_30px_rgba(41,52,255,0.16)]"
                : "bg-black/25 text-slate-400 hover:bg-white/[0.07] hover:text-white",
            )}
          >
            {source}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-black/10" : "bg-white/[0.06]")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function QCImageCard({
  image,
  index,
  onPreview,
}: {
  image: QCImage;
  index: number;
  onPreview: () => void;
}) {
  return (
    <article
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(41,52,255,0.18)]"
      style={{ animation: `framer-hero-appear-up 0.75s cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 0.035, 0.28)}s both` }}
    >
      <button type="button" onClick={onPreview} className="block w-full text-left">
        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
          <img
            src={image.photoUrl}
            alt={`${image.source} QC photo`}
            className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
            loading="lazy"
          />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full bg-gradient-to-r px-3 py-1.5 text-xs font-black text-white shadow-lg",
              sourceAccent[image.source],
            )}
          >
            {sourceLabels[image.source]}
          </span>
          <span className="absolute right-3 top-3 grid size-9 place-items-center rounded-xl bg-black/50 text-white backdrop-blur">
            <IconExternalLink className="size-4" />
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">
                {image.skuId || "Warehouse photo"}
              </p>
              <p className="mt-1 text-xs text-slate-500">{formatDate(image.createTime)}</p>
            </div>
            <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-500/10 text-blue-100 ring-1 ring-blue-300/20">
              <IconTags className="size-5" />
            </span>
          </div>
        </div>
      </button>
    </article>
  );
}

function QCEmptyState() {
  return (
    <div className="grid min-h-72 place-items-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
          <IconPhoto className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">Paste a product link to start</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          QC photos will appear here as a clean gallery, grouped by source.
        </p>
        <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1.5 text-xs text-slate-400">
          Product link
          <IconArrowRight className="size-3.5" />
          QC gallery
        </div>
      </div>
    </div>
  );
}

function QCLoadingState() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {Array.from({ length: 8 }).map((_, index) => (
        <div
          key={index}
          className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.035]"
        />
      ))}
    </section>
  );
}

function ImagePreview({ image, onClose }: { image: QCImage; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-10 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
          aria-label="Close preview"
        >
          <IconX className="size-5" />
        </button>
        <img src={image.photoUrl} alt={`${image.source} QC preview`} className="max-h-[82vh] w-full object-contain" />
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
          <div>
            <p className="font-semibold text-white">{sourceLabels[image.source]}</p>
            <p className="text-sm text-slate-500">{image.skuId || "Warehouse photo"} · {formatDate(image.createTime)}</p>
          </div>
          <a
            href={image.photoUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-blue-100"
          >
            <IconExternalLink className="size-4" />
            Open original
          </a>
        </div>
      </div>
    </div>
  );
}

function formatDate(value: string | number | null) {
  if (!value) {
    return "Date unknown";
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue > 10_000_000_000 ? numericValue : numericValue * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
