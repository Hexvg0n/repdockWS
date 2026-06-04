"use client";

import {
  IconAlertCircle,
  IconArrowRight,
  IconCheck,
  IconClock,
  IconCopy,
  IconLoader2,
  IconMapPin,
  IconPackage,
  IconRefresh,
  IconRoute,
  IconSparkles2Filled,
  IconTruckDelivery,
  IconX,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguageCopy, useRepdockLanguage } from "@/lib/use-repdock-language";
import type { TrackingData, TrackingEvent } from "@/types/tracking";

type TrackingResponse = TrackingData & {
  error?: string;
};

const statusHighlights = [
  "delivered",
  "delivery",
  "arrived",
  "customs",
  "transit",
  "picked",
  "odebran",
  "dostarcz",
  "celn",
  "tranzyt",
];

const trackingCopy = {
  PL: {
    actions: {
      clear: "Wyczyść",
      copied: "Skopiowano",
      copyNumber: "Skopiuj numer",
      open: "Otwórz",
      track: "Śledź",
    },
    empty: [
      {
        title: "Szukaj w mirrorach",
        text: "API sprawdza kilka mirrorów logistycznych jednocześnie.",
      },
      {
        title: "Czytaj timeline",
        text: "Zobacz najnowszy status jako pierwszy, razem z lokalizacją i datą.",
      },
      {
        title: "Czyste numery",
        text: "Obsługiwane są alfanumeryczne numery paczek dla bezpieczniejszych zapytań.",
      },
    ],
    errors: {
      failed: "Wyszukiwanie trackingu nie powiodło się.",
      missing: "Najpierw wklej numer trackingowy.",
      notFound: "Nie udało się znaleźć danych trackingu.",
    },
    header: {
      badge: "Tracking paczek",
      description:
        "Wklej numer trackingowy, a RepDock sprawdzi dostępne chińskie mirrory logistyczne równolegle.",
      title: "Śledź paczki z magazynu",
    },
    inputPlaceholder: "Wklej numer trackingowy...",
    labels: {
      country: "Kraj",
      date: "Data",
      lastStatus: "Ostatni status",
      events: "zdarzeń trackingu",
      mirrorTitle: "Wyszukiwanie mirrorów",
      mirrorText: "Wyniki są tłumaczone zgodnie z językiem zapisanym w ustawieniach.",
      noEvents: "Brak szczegółowych wydarzeń dla tego numeru trackingowego.",
      noStatus: "Brak statusu",
      reference: "Referencja",
      timeline: "Timeline",
      trackingNumber: "Numer trackingowy",
      unknownLocation: "Nieznana lokalizacja",
    },
  },
  EN: {
    actions: {
      clear: "Clear",
      copied: "Copied",
      copyNumber: "Copy number",
      open: "Open",
      track: "Track",
    },
    empty: [
      {
        title: "Search mirrors",
        text: "The API checks multiple logistics mirrors at the same time.",
      },
      {
        title: "Read the timeline",
        text: "See the newest status first with location and date details.",
      },
      {
        title: "Keep numbers clean",
        text: "Alphanumeric parcel numbers are accepted for safer lookups.",
      },
    ],
    errors: {
      failed: "Tracking lookup failed.",
      missing: "Paste a tracking number first.",
      notFound: "Could not find tracking data.",
    },
    header: {
      badge: "Parcel tracking",
      description:
        "Paste a tracking number and RepDock checks available Chinese logistics mirrors in parallel.",
      title: "Track warehouse parcels",
    },
    inputPlaceholder: "Paste tracking number...",
    labels: {
      country: "Country",
      date: "Date",
      lastStatus: "Last status",
      events: "tracking events",
      mirrorTitle: "Mirror search",
      mirrorText: "Results are translated using your saved language preference.",
      noEvents: "No detailed events were returned for this tracking number.",
      noStatus: "No status",
      reference: "Reference",
      timeline: "Timeline",
      trackingNumber: "Tracking number",
      unknownLocation: "Unknown location",
    },
  },
} as const;

type TrackingCopy = (typeof trackingCopy)[keyof typeof trackingCopy];

export function TrackingTool() {
  const copy = useLanguageCopy(trackingCopy);
  const language = useRepdockLanguage();
  const apiLanguage = language === "EN" ? "en" : "pl";
  const [trackingNumber, setTrackingNumber] = useState("");
  const [result, setResult] = useState<TrackingData | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const latestEvent = result?.details[0] ?? null;
  const progressTone = useMemo(() => getStatusTone(result?.lastStatus ?? latestEvent?.status ?? ""), [latestEvent, result]);

  const search = async () => {
    if (!trackingNumber.trim()) {
      setError(copy.errors.missing);
      setResult(null);
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);
    setCopied(false);

    try {
      const response = await fetch("/api/tracking", {
        body: JSON.stringify({
          language: apiLanguage,
          trackingNumber: trackingNumber.trim(),
        }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      const data = (await response.json()) as TrackingResponse;

      if (!response.ok) {
        throw new Error(data.error || copy.errors.notFound);
      }

      setResult(data);
    } catch (trackingError) {
      setError(trackingError instanceof Error ? trackingError.message : copy.errors.failed);
    } finally {
      setLoading(false);
    }
  };

  const clear = () => {
    setTrackingNumber("");
    setResult(null);
    setError("");
    setCopied(false);
  };

  const copyNumber = async () => {
    if (!result?.trackingNumber) return;
    await navigator.clipboard.writeText(result.trackingNumber);
    setCopied(true);
    globalThis.setTimeout(() => setCopied(false), 1600);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute right-[-20%] top-24 h-[560px] w-[560px] rotate-[25deg] bg-[linear-gradient(90deg,transparent,rgba(41,52,255,0.24),transparent)] blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
              <IconSparkles2Filled className="size-4" />
              {copy.header.badge}
            </div>
            <h1 className="mt-5 font-poppins text-4xl font-medium tracking-normal md:text-6xl">
              {copy.header.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              {copy.header.description}
            </p>
          </div>

          <div className="rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <div className="flex items-center gap-3">
              <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                <IconRoute className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{copy.labels.mirrorTitle}</p>
                <p className="text-xs leading-relaxed text-slate-500">
                  {copy.labels.mirrorText}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto]">
            <label className="relative block">
              <IconTruckDelivery className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                value={trackingNumber}
                onChange={(event) => setTrackingNumber(event.target.value)}
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
              {copy.actions.track}
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
              <IconAlertCircle className="size-4 shrink-0" />
              {error}
            </div>
          ) : null}
        </div>

        {result ? (
          <div className="grid gap-6 lg:grid-cols-[380px_minmax(0,1fr)]">
            <aside>
              <article className="overflow-hidden rounded-[32px] border border-blue-300/25 bg-[#0d0e14] shadow-[0_24px_90px_rgba(41,52,255,0.18)]">
                <div className={cn("h-1.5 bg-gradient-to-r", progressTone.gradient)} />
                <div className="p-5">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
                        {copy.labels.trackingNumber}
                      </p>
                      <h2 className="mt-2 break-all font-poppins text-2xl font-medium text-white">
                        {result.trackingNumber}
                      </h2>
                    </div>
                    <button
                      onClick={copyNumber}
                      className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
                      type="button"
                    >
                      {copied ? <IconCheck className="size-5 text-emerald-300" /> : <IconCopy className="size-5" />}
                    </button>
                  </div>

                  <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.labels.lastStatus}</p>
                    <p className="mt-2 text-sm leading-relaxed text-slate-200">{result.lastStatus}</p>
                  </div>

                  <div className="mt-4 divide-y divide-white/10 overflow-hidden rounded-3xl border border-white/10 bg-black/20">
                    <MetaRow icon={<IconMapPin className="size-4" />} label={copy.labels.country} value={result.country} />
                    <MetaRow icon={<IconClock className="size-4" />} label={copy.labels.date} value={result.date} />
                    <MetaRow icon={<IconPackage className="size-4" />} label={copy.labels.reference} value={result.referenceNo} />
                  </div>
                </div>
              </article>
            </aside>

            <section className="rounded-[34px] border border-white/10 bg-white/[0.035] p-4 shadow-2xl shadow-black/25 backdrop-blur-xl md:p-6">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">{copy.labels.timeline}</p>
                  <h2 className="mt-2 font-poppins text-2xl font-medium text-white">
                    {result.details.length} {copy.labels.events}
                  </h2>
                </div>
                <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                  <IconTruckDelivery className="size-6" />
                </span>
              </div>

              <div className="mt-6 grid gap-3">
                {result.details.length > 0 ? (
                  result.details.map((event, index) => (
                    <TimelineEvent copy={copy} event={event} first={index === 0} key={`${event.date}-${event.status}-${event.location}-${event.icon}`} />
                  ))
                ) : (
                  <div className="rounded-3xl border border-white/10 bg-black/20 p-8 text-center text-sm text-slate-500">
                    {copy.labels.noEvents}
                  </div>
                )}
              </div>
            </section>
          </div>
        ) : (
          <EmptyTrackingState copy={copy} />
        )}
      </section>
    </main>
  );
}

function TimelineEvent({
  copy,
  event,
  first,
}: {
  copy: TrackingCopy;
  event: TrackingEvent;
  first: boolean;
}) {
  return (
    <article
      className={cn(
        "relative grid gap-3 rounded-3xl border p-4 transition md:grid-cols-[170px_minmax(0,1fr)]",
        first
          ? "border-blue-300/25 bg-blue-500/10 shadow-[0_18px_60px_rgba(41,52,255,0.12)]"
          : "border-white/10 bg-black/20",
      )}
    >
      <div className="flex items-center gap-3 text-sm text-slate-400">
        <span
          className={cn(
            "grid size-10 place-items-center rounded-2xl ring-1",
            first ? "bg-blue-500/20 text-blue-100 ring-blue-300/25" : "bg-white/[0.04] text-slate-300 ring-white/10",
          )}
        >
          {first ? <IconCheck className="size-5" /> : <IconArrowRight className="size-5" />}
        </span>
        <span>{event.date || "N/A"}</span>
      </div>
      <div className="min-w-0">
        <p className="text-sm leading-relaxed text-white">{event.status || copy.labels.noStatus}</p>
        <p className="mt-1 text-xs text-slate-500">{event.location || copy.labels.unknownLocation}</p>
      </div>
    </article>
  );
}

function MetaRow({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="flex items-center gap-3 px-4 py-3">
      <span className="grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.04] text-blue-100 ring-1 ring-white/10">
        {icon}
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">{label}</p>
        <p className="mt-0.5 truncate text-sm font-medium text-white">{value || "N/A"}</p>
      </div>
    </div>
  );
}

function EmptyTrackingState({ copy }: { copy: TrackingCopy }) {
  const icons = [
    <IconTruckDelivery className="size-6" key="truck" />,
    <IconRoute className="size-6" key="route" />,
    <IconPackage className="size-6" key="package" />,
  ];

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      {copy.empty.map((item, index) => (
        <article
          className="rounded-[30px] border border-white/10 bg-white/[0.035] p-5 shadow-2xl shadow-black/20"
          key={item.title}
        >
          <span className="grid size-12 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
            {icons[index]}
          </span>
          <h2 className="mt-5 text-lg font-semibold text-white">{item.title}</h2>
          <p className="mt-2 text-sm leading-relaxed text-slate-500">{item.text}</p>
        </article>
      ))}
    </div>
  );
}

function getStatusTone(status: string) {
  const normalized = status.toLowerCase();
  const matched = statusHighlights.some((fragment) => normalized.includes(fragment));

  return matched
    ? { gradient: "from-emerald-300 via-blue-400 to-[#2934ff]" }
    : { gradient: "from-blue-300 via-[#2934ff] to-violet-500" };
}
