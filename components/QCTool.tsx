"use client";

import SmartImage from "@/components/SmartImage";
import {
  IconAlertCircle,
  IconArrowRight,
  IconCameraSearch,
  IconChevronLeft,
  IconChevronRight,
  IconCheck,
  IconExternalLink,
  IconFilter,
  IconLayoutGrid,
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
import { useLanguageCopy, useRepdockLanguage } from "@/lib/use-repdock-language";
import { cn } from "@/lib/utils";

type SourceName = "ACBuy" | "USFans" | "CNFans";

type QCImage = {
  photoUrl: string;
  createTime: string | number | null;
  skuId: string | null;
  source: SourceName;
};

type QCGroup = {
  dateLabel: string;
  id: string;
  images: QCImage[];
  source: SourceName;
  title: string;
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

const qcLoadingSkeletonKeys = [
  "qc-loading-1",
  "qc-loading-2",
  "qc-loading-3",
  "qc-loading-4",
  "qc-loading-5",
  "qc-loading-6",
  "qc-loading-7",
  "qc-loading-8",
];

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
  ACBuy: "from-emerald-600 to-teal-700",
  CNFans: "from-red-700 to-red-800 ",
  USFans: "from-orange-500 to-orange-600",
};

const qcCopy = {
  PL: {
    actions: {
      clear: "Wyczyść",
      openOriginal: "Otwórz oryginał",
      search: "Szukaj QC",
    },
    empty: {
      badgeFrom: "Link produktu",
      badgeTo: "Grupy QC",
      description: "Zdjęcia QC pojawią się tutaj jako pogrupowane zestawy z magazynu.",
      title: "Wklej link produktu, żeby zacząć",
    },
    errors: {
      failed: "Wyszukiwanie QC nie powiodło się.",
      load: "Nie udało się załadować zdjęć QC.",
      missing: "Najpierw wklej link produktu lub agenta.",
    },
    header: {
      badge: "Wyszukiwarka QC",
      description: "Wklej link z Taobao, 1688, Weidian albo agenta i sprawdź zdjęcia QC przed zakupem.",
      sourceText: "ACBuy, USFans i CNFans",
      sourceTitle: "Trzy źródła naraz",
      title: "Sprawdź QC",
    },
    inputPlaceholder: "Wklej link produktu lub agenta...",
    labels: {
      all: "Wszystkie",
      closePreview: "Zamknij podgląd",
      dateUnknown: "Nieznana data",
      group: "Grupa",
      nextPhoto: "Następne zdjęcie QC",
      noPhotos: "Brak zdjęć",
      of: "z",
      photos: "zdjęć",
      previousPhoto: "Poprzednie zdjęcie QC",
      qcPhotos: "zdjęć QC",
      resolvedProduct: "Info o produkcie",
      skipped: "Pominięto",
      source: "Źródło",
      unavailable: "Niedostępne",
      warehouseSet: "Zestaw zdjęć",
      zoomIn: "Powiększ",
      zoomOut: "Pomniejsz",
    },
  },
  EN: {
    actions: {
      clear: "Clear",
      openOriginal: "Open original",
      search: "Search QC",
    },
    empty: {
      badgeFrom: "Product link",
      badgeTo: "QC groups",
      description: "QC photos will appear here as grouped warehouse sets.",
      title: "Paste a product link to start",
    },
    errors: {
      failed: "QC lookup failed.",
      load: "Could not load QC photos.",
      missing: "Paste a product or agent link first.",
    },
    header: {
      badge: "Warehouse QC finder",
      description: "Paste a Taobao, 1688, Weidian or agent link and check warehouse photos before buying.",
      sourceText: "ACBuy, USFans and CNFans are checked in parallel.",
      sourceTitle: "Three source search",
      title: "Find real QC photos",
    },
    inputPlaceholder: "Paste product or agent link...",
    labels: {
      all: "All",
      closePreview: "Close preview",
      dateUnknown: "Date unknown",
      group: "Group",
      nextPhoto: "Next QC photo",
      noPhotos: "No photos",
      of: "of",
      photos: "photos",
      previousPhoto: "Previous QC photo",
      qcPhotos: "QC photos",
      resolvedProduct: "Resolved product",
      skipped: "Skipped",
      source: "Source",
      unavailable: "Unavailable",
      warehouseSet: "Warehouse set",
      zoomIn: "Zoom in",
      zoomOut: "Zoom out",
    },
  },
} as const;

type QCCopy = (typeof qcCopy)[keyof typeof qcCopy];

export function QCTool() {
  const copy = useLanguageCopy(qcCopy);
  const language = useRepdockLanguage();
  const dateLocale = language === "PL" ? "pl" : "en";
  const [url, setUrl] = useState("");
  const [images, setImages] = useState<QCImage[]>([]);
  const [meta, setMeta] = useState<QCResponseMeta | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [activeSource, setActiveSource] = useState<(typeof sourceOrder)[number]>("All");
  const [viewer, setViewer] = useState<{ groupId: string; imageIndex: number; zoomed: boolean } | null>(null);

  const groups = useMemo(
    () => groupQCImages(images, activeSource, dateLocale, copy.labels),
    [activeSource, copy.labels, dateLocale, images],
  );
  const activeGroup = useMemo(
    () => groups.find((group) => group.id === viewer?.groupId) ?? null,
    [groups, viewer?.groupId],
  );
  const activeImage = activeGroup?.images[viewer?.imageIndex ?? 0] ?? null;

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
      setError(copy.errors.missing);
      setImages([]);
      setMeta(null);
      return;
    }

    setLoading(true);
    setError("");
    setImages([]);
    setMeta(null);
    setActiveSource("All");
    setViewer(null);

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
        throw new Error(data.error || copy.errors.load);
      }

      setImages(data.data ?? []);
      setMeta(data.meta ?? null);
    } catch (searchError) {
      setError(searchError instanceof Error ? searchError.message : copy.errors.failed);
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
    setViewer(null);
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
              {copy.header.badge}
            </div>
            <h1 className="mt-5 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
              {copy.header.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              {copy.header.description}
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                <IconWorldSearch className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{copy.header.sourceTitle}</p>
                <p className="text-xs leading-relaxed text-slate-500">{copy.header.sourceText}</p>
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
                placeholder={copy.inputPlaceholder}
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
              />
            </label>
            <Button onClick={search} disabled={loading} className="h-14 rounded-2xl px-6">
              {loading ? <IconLoader2 className="size-4 animate-spin" /> : <IconRefresh className="size-4" />}
              {copy.actions.search}
            </Button>
            <Button
              onClick={clear}
              variant="outline"
              className="h-14 rounded-2xl border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08]"
            >
              <IconX className="size-4" />
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

        {meta ? <ProductMetaCard copy={copy} meta={meta} /> : null}

        {images.length > 0 ? (
          <div className="grid gap-5">
            <SourceFilters
              activeSource={activeSource}
              copy={copy}
              counts={sourceCounts}
              total={images.length}
              onChange={setActiveSource}
            />

            <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
              {groups.map((group, index) => (
                <QCGroupCard
                  group={group}
                  index={index}
                  copy={copy}
                  key={group.id}
                  onOpen={() => setViewer({ groupId: group.id, imageIndex: 0, zoomed: false })}
                />
              ))}
            </section>
          </div>
        ) : loading ? (
          <QCLoadingState />
        ) : (
          <QCEmptyState copy={copy} />
        )}
      </section>

      {activeGroup && activeImage && viewer ? (
        <QCGroupViewer
          group={activeGroup}
          image={activeImage}
          imageIndex={viewer.imageIndex}
          copy={copy}
          zoomed={viewer.zoomed}
          onClose={() => setViewer(null)}
          onSelect={(imageIndex) => setViewer({ groupId: activeGroup.id, imageIndex, zoomed: false })}
          onToggleZoom={() => setViewer({ ...viewer, zoomed: !viewer.zoomed })}
        />
      ) : null}
    </main>
  );
}

function ProductMetaCard({ copy, meta }: Readonly<{ copy: QCCopy; meta: QCResponseMeta }>) {
  return (
    <section className="grid gap-4 rounded-[32px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl lg:grid-cols-[minmax(0,1fr)_auto]">
      <div className="min-w-0">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.labels.resolvedProduct}</p>
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
        <SourceStatus copy={copy} label="ACBuy" meta={meta.sources.acbuy} />
        <SourceStatus copy={copy} label="USFans" meta={meta.sources.usfans} />
        <SourceStatus copy={copy} label="CNFans" meta={meta.sources.cnfans} />
      </div>
    </section>
  );
}

function SourceStatus({ copy, label, meta }: { copy: QCCopy; label: SourceName; meta: QCSourceMeta }) {
  const hasPhotos = meta.ok && meta.count > 0;
  const statusText = hasPhotos
    ? `${meta.count} ${copy.labels.photos}`
    : meta.ok
      ? copy.labels.noPhotos
      : meta.skipped
        ? copy.labels.skipped
        : meta.error ?? copy.labels.unavailable;

  return (
    <div className="rounded-2xl border border-white/10 bg-black/25 p-3">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm font-semibold text-white">{label}</span>
        <span
          className={cn(
            "grid size-6 place-items-center rounded-full",
            hasPhotos ? "bg-emerald-500/15 text-emerald-200" : "bg-zinc-500/15 text-zinc-300",
          )}
        >
          {hasPhotos ? <IconCheck className="size-3.5" /> : <IconAlertCircle className="size-3.5" />}
        </span>
      </div>
      <p className="mt-2 text-xs text-slate-500">{statusText}</p>
    </div>
  );
}

function SourceFilters({
  activeSource,
  copy,
  counts,
  onChange,
  total,
}: {
  activeSource: (typeof sourceOrder)[number];
  copy: QCCopy;
  counts: Record<SourceName, number>;
  onChange: (source: (typeof sourceOrder)[number]) => void;
  total: number;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2 rounded-[28px] border border-white/10 bg-white/[0.035] p-2 shadow-2xl shadow-black/20 backdrop-blur-xl">
      <span className="ml-2 mr-1 inline-flex items-center gap-2 text-sm font-semibold text-slate-400">
        <IconFilter className="size-4" />
        {copy.labels.source}
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
            {source === "All" ? copy.labels.all : source}
            <span className={cn("rounded-full px-2 py-0.5 text-xs", active ? "bg-black/10" : "bg-white/[0.06]")}>
              {count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function QCGroupCard({
  copy,
  group,
  index,
  onOpen,
}: {
  copy: QCCopy;
  group: QCGroup;
  index: number;
  onOpen: () => void;
}) {
  const cover = group.images[0];
  const second = group.images[1];
  const third = group.images[2];

  return (
    <article
      className="group relative overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(41,52,255,0.18)]"
      style={{ animation: `framer-hero-appear-up 0.75s cubic-bezier(0.22,1,0.36,1) ${Math.min(index * 0.035, 0.28)}s both` }}
    >
      <button type="button" onClick={onOpen} className="block w-full text-left">
        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-950">
          {cover ? (
            <SmartImage
              src={cover.photoUrl}
              alt={`${group.source} ${copy.labels.group}`}
              className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
              loading="lazy"
            />
          ) : null}
          {third ? (
            <SmartImage
              src={third.photoUrl}
              alt=""
              className="absolute bottom-8 right-12 h-20 w-16 -rotate-6 rounded-xl border border-white/15 object-cover opacity-80 shadow-2xl shadow-black/40"
              loading="lazy"
            />
          ) : null}
          {second ? (
            <SmartImage
              src={second.photoUrl}
              alt=""
              className="absolute bottom-4 right-4 h-24 w-20 rotate-3 rounded-2xl border border-white/15 object-cover shadow-2xl shadow-black/50"
              loading="lazy"
            />
          ) : null}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-black via-black/60 to-transparent" />
          <span
            className={cn(
              "absolute left-3 top-3 rounded-full bg-gradient-to-r px-3 py-1.5 text-xs font-black text-white shadow-lg",
              sourceAccent[group.source],
            )}
          >
            {sourceLabels[group.source]}
          </span>
          <span className="absolute right-3 top-3 inline-flex h-9 items-center gap-1.5 rounded-xl bg-black/55 px-3 text-xs font-bold text-white backdrop-blur">
            <IconLayoutGrid className="size-4" />
            {group.images.length}
          </span>
        </div>
        <div className="grid gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-white">{group.title}</p>
              <p className="mt-1 text-xs text-slate-500">
                {group.dateLabel} / {group.images.length} {copy.labels.photos}
              </p>
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

function QCEmptyState({ copy }: { copy: QCCopy }) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
          <IconPhoto className="size-6" />
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

function QCLoadingState() {
  return (
    <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
      {qcLoadingSkeletonKeys.map((skeletonKey) => (
        <div
          key={skeletonKey}
          className="h-[360px] animate-pulse rounded-[28px] border border-white/10 bg-white/[0.035]"
        />
      ))}
    </section>
  );
}

function QCGroupViewer({
  copy,
  group,
  image,
  imageIndex,
  onClose,
  onSelect,
  onToggleZoom,
  zoomed,
}: Readonly<{
  copy: QCCopy;
  group: QCGroup;
  image: QCImage;
  imageIndex: number;
  onClose: () => void;
  onSelect: (imageIndex: number) => void;
  onToggleZoom: () => void;
  zoomed: boolean;
}>) {
  const previousIndex = imageIndex === 0 ? group.images.length - 1 : imageIndex - 1;
  const nextIndex = imageIndex === group.images.length - 1 ? 0 : imageIndex + 1;

  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black lg:grid-cols-[minmax(0,1fr)_280px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
          aria-label={copy.labels.closePreview}
        >
          <IconX className="size-5" />
        </button>

        <div className="grid min-h-0 grid-rows-[1fr_auto]">
          <div className="relative grid max-h-[74vh] min-h-[420px] place-items-center overflow-auto bg-black">
            {group.images.length > 1 ? (
              <>
                <button
                  type="button"
                  onClick={() => onSelect(previousIndex)}
                  className="absolute left-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
                  aria-label={copy.labels.previousPhoto}
                >
                  <IconChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(nextIndex)}
                  className="absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
                  aria-label={copy.labels.nextPhoto}
                >
                  <IconChevronRight className="size-5" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onToggleZoom}
              className={cn(
                "grid h-full min-h-[420px] w-full place-items-center",
                zoomed ? "cursor-zoom-out" : "cursor-zoom-in",
              )}
              aria-label={zoomed ? copy.labels.zoomOut : copy.labels.zoomIn}
            >
              <SmartImage
                src={image.photoUrl}
                alt={`${image.source} QC preview`}
                className={cn(
                  "transition duration-300",
                  zoomed
                    ? "max-h-none max-w-none scale-150 object-none"
                    : "max-h-[74vh] max-w-full object-contain",
                )}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
            <div>
              <p className="font-semibold text-white">{group.title}</p>
              <p className="text-sm text-slate-500">
                {sourceLabels[group.source]} / {group.dateLabel} / {imageIndex + 1} {copy.labels.of} {group.images.length}
              </p>
            </div>
            <a
              href={image.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-blue-100"
            >
              <IconExternalLink className="size-4" />
              {copy.actions.openOriginal}
            </a>
          </div>
        </div>

        <aside className="min-h-0 border-t border-white/10 bg-white/[0.025] p-4 lg:border-l lg:border-t-0">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.labels.group}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{group.title}</h3>
            <p className="mt-1 text-sm text-slate-500">{group.images.length} {copy.labels.qcPhotos}</p>
          </div>
          <div className="grid max-h-[58vh] grid-cols-3 gap-2 overflow-y-auto pr-1 lg:grid-cols-2">
            {group.images.map((groupImage, index) => (
              <button
                key={groupImage.photoUrl}
                type="button"
                onClick={() => onSelect(index)}
                className={cn(
                  "relative aspect-square overflow-hidden rounded-2xl border transition",
                  index === imageIndex
                    ? "border-blue-300 shadow-[0_0_28px_rgba(41,52,255,0.3)]"
                    : "border-white/10 opacity-70 hover:opacity-100",
                )}
              >
                <SmartImage src={groupImage.photoUrl} alt="" className="h-full w-full object-cover" loading="lazy" />
              </button>
            ))}
          </div>
        </aside>
      </div>
    </div>
  );
}

function groupQCImages(
  images: QCImage[],
  activeSource: (typeof sourceOrder)[number],
  dateLocale: string,
  labels: QCCopy["labels"],
) {
  const filteredImages =
    activeSource === "All"
      ? images
      : images.filter((image) => image.source === activeSource);
  const groupMap = new Map<string, QCGroup>();

  for (const image of filteredImages) {
    const dateLabel = formatDate(image.createTime, dateLocale, labels.dateUnknown);
    const skuLabel = image.skuId?.trim() || labels.warehouseSet;
    const id = `${image.source}:${dateLabel}:${skuLabel}`;
    const existing = groupMap.get(id);

    if (existing) {
      existing.images.push(image);
      continue;
    }

    groupMap.set(id, {
      dateLabel,
      id,
      images: [image],
      source: image.source,
      title: skuLabel,
    });
  }

  return Array.from(groupMap.values()).sort((first, second) => {
    const firstTime = getComparableTime(first.images[0]?.createTime);
    const secondTime = getComparableTime(second.images[0]?.createTime);
    return secondTime - firstTime;
  });
}

function getComparableTime(value: string | number | null | undefined) {
  if (!value) {
    return 0;
  }

  const numericValue = typeof value === "number" ? value : Number(value);

  if (Number.isFinite(numericValue)) {
    return numericValue > 10_000_000_000 ? numericValue : numericValue * 1000;
  }

  const parsed = Date.parse(String(value));
  return Number.isNaN(parsed) ? 0 : parsed;
}

function formatDate(value: string | number | null, locale: string, fallback: string) {
  if (!value) {
    return fallback;
  }

  const numericValue = typeof value === "number" ? value : Number(value);
  const date = Number.isFinite(numericValue)
    ? new Date(numericValue > 10_000_000_000 ? numericValue : numericValue * 1000)
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return String(value);
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(date);
}
