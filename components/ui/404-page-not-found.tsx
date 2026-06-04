"use client";

import SmartImage from "@/components/SmartImage";
import {
  ArrowLeft,
  Compass,
  Home,
  PackageSearch,
  Search,
  Shirt,
  Sparkles,
  Truck,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useLanguageCopy } from "@/lib/use-repdock-language";

interface NotFound404Props {
  title?: string;
  description?: string;
  className?: string;
}

const quickLinks = [
  {
    href: "/w2c",
    icon: Search,
    key: "w2c",
  },
  {
    href: "/outfits",
    icon: Shirt,
    key: "outfits",
  },
  {
    href: "/converter",
    icon: Sparkles,
    key: "converter",
  },
  {
    href: "/tracking",
    icon: Truck,
    key: "tracking",
  },
] as const;

const notFoundCopy = {
  PL: {
    actions: {
      back: "Wróć",
      home: "Strona główna",
    },
    badge: "Nie znaleziono trasy",
    description:
      "Strona, którą otwierasz, jeszcze nie istnieje, została przeniesiona albo adres ma mały skręt po drodze.",
    panel: {
      code: "Kod błędu",
      dns: "DNS",
      missing: "Brak",
      missingRoute: "Brak trasy",
      ok: "OK",
      page: "Strona",
      routeCheck: "Sprawdzenie trasy",
      server: "Serwer",
      status: "Nie znaleziono pasującej strony",
      text: "Żądana ścieżka nie pasuje do aktywnej strony RepDock.",
    },
    quickLinks: {
      converter: { label: "Konwerter", text: "Narzędzia linków agentów" },
      outfits: { label: "Outfity", text: "Stylówki społeczności" },
      tracking: { label: "Tracking", text: "Sprawdzanie paczek" },
      w2c: { label: "W2C", text: "Findy i linki produktów" },
    },
    title: "Ta trasa nie jest w docku",
  },
  EN: {
    actions: {
      back: "Go back",
      home: "Go home",
    },
    badge: "Route not found",
    description:
      "The page you opened does not exist yet, moved somewhere else, or was typed with a small detour.",
    panel: {
      code: "Error code",
      dns: "DNS",
      missing: "Missing",
      missingRoute: "Missing route",
      ok: "OK",
      page: "Page",
      routeCheck: "Route check",
      server: "Server",
      status: "No matching page found",
      text: "Requested path could not be matched to an active RepDock page.",
    },
    quickLinks: {
      converter: { label: "Converter", text: "Agent link tools" },
      outfits: { label: "Outfits", text: "Community fits" },
      tracking: { label: "Tracking", text: "Parcel lookup" },
      w2c: { label: "W2C", text: "Finds and product links" },
    },
    title: "This route is not in the dock",
  },
} as const;

export default function NotFound404({
  title,
  description,
  className,
}: Readonly<NotFound404Props>) {
  const copy = useLanguageCopy(notFoundCopy);
  const pageTitle = title ?? copy.title;
  const pageDescription = description ?? copy.description;

  const handleBackClick = () => {
    globalThis.history.back();
  };

  return (
    <main
      className={cn(
        "relative min-h-screen overflow-hidden bg-black text-white",
        className,
      )}
    >
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[440px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.30),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.032)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.032)_1px,transparent_1px)] bg-[size:108px_108px] opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_78%)]" />
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-44 bg-gradient-to-t from-blue-950/24 to-transparent" />

      <section className="relative mx-auto flex min-h-screen w-full max-w-7xl flex-col px-5 py-5 sm:px-6 lg:px-8">
        <header className="flex items-center justify-between gap-4">
          <a
            href="/"
            className="flex items-center gap-3 rounded-lg border border-white/10 bg-white/[0.035] px-3 py-2 text-sm font-semibold text-white backdrop-blur-md transition hover:bg-white/[0.07]"
          >
            <SmartImage src="/RepDock-25.png" alt="" className="size-8 object-contain" />
            <span>RepDock</span>
          </a>
          <span className="hidden rounded-lg border border-blue-300/20 bg-blue-500/10 px-3 py-2 text-xs font-semibold uppercase tracking-[0.16em] text-blue-100 sm:inline-flex">
            404
          </span>
        </header>

        <div className="grid flex-1 items-center gap-10 py-10 lg:grid-cols-[minmax(0,1fr)_460px] lg:py-14">
          <div className="max-w-3xl">
            <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/[0.045] px-3 py-2 text-sm text-blue-100 backdrop-blur-md">
              <Compass className="size-4" />
              <span>{copy.badge}</span>
            </div>

            <h1 className="mt-7 max-w-[21rem] text-balance font-poppins text-4xl font-medium leading-[1.05] tracking-normal text-white sm:max-w-4xl sm:text-6xl lg:text-7xl">
              {pageTitle}
            </h1>
            <p className="mt-5 max-w-[21rem] text-base leading-8 text-slate-300 sm:max-w-2xl sm:text-lg">
              {pageDescription}
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Button asChild className="h-12 rounded-lg px-5">
                <a href="/">
                  <Home className="size-4" />
                  {copy.actions.home}
                </a>
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleBackClick}
                className="h-12 rounded-lg border-white/10 bg-white/[0.04] px-5 text-white hover:bg-white/[0.08] hover:text-white"
              >
                <ArrowLeft className="size-4" />
                {copy.actions.back}
              </Button>
            </div>

            <nav className="mt-10 grid gap-3 sm:grid-cols-2">
              {quickLinks.map((item) => {
                const Icon = item.icon;
                const linkCopy = copy.quickLinks[item.key];

                return (
                  <a
                    key={item.href}
                    href={item.href}
                    className="group flex items-center gap-4 rounded-lg border border-white/10 bg-white/[0.035] p-4 text-left transition hover:border-blue-300/35 hover:bg-blue-500/10"
                  >
                    <span className="grid size-11 shrink-0 place-items-center rounded-lg bg-blue-500/12 text-blue-200 ring-1 ring-blue-300/20 transition group-hover:bg-blue-500/20 group-hover:text-white">
                      <Icon className="size-5" />
                    </span>
                    <span className="min-w-0">
                      <span className="block font-semibold text-white">{linkCopy.label}</span>
                      <span className="mt-0.5 block text-sm text-slate-500">{linkCopy.text}</span>
                    </span>
                  </a>
                );
              })}
            </nav>
          </div>

          <aside className="relative mx-auto w-full max-w-[460px]">
            <div className="absolute inset-x-8 -top-6 h-px bg-gradient-to-r from-transparent via-blue-300/70 to-transparent" />
            <div className="overflow-hidden rounded-lg border border-white/10 bg-[#070913]/92 shadow-2xl shadow-blue-950/30 backdrop-blur-xl">
              <div className="flex items-center justify-between border-b border-white/10 bg-white/[0.035] px-4 py-3">
                <div className="flex items-center gap-2">
                  <span className="size-2.5 rounded-full bg-red-400" />
                  <span className="size-2.5 rounded-full bg-amber-300" />
                  <span className="size-2.5 rounded-full bg-emerald-400" />
                </div>
                <span className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
                  {copy.panel.missingRoute}
                </span>
              </div>

              <div className="grid gap-5 p-5 sm:p-6">
                <div className="relative overflow-hidden rounded-lg border border-blue-300/20 bg-blue-500/10 p-5">
                  <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/65 to-transparent" />
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-blue-200">
                    {copy.panel.code}
                  </p>
                  <div className="mt-2 font-poppins text-[88px] font-medium leading-none text-white sm:text-[112px]">
                    404
                  </div>
                  <p className="mt-2 text-sm leading-6 text-slate-400">
                    {copy.panel.text}
                  </p>
                </div>

                <div className="rounded-lg border border-white/10 bg-black/35 p-4">
                  <div className="flex items-center gap-3">
                    <span className="grid size-10 place-items-center rounded-lg bg-white/[0.05] text-blue-200 ring-1 ring-white/10">
                      <PackageSearch className="size-5" />
                    </span>
                    <div>
                      <p className="text-sm font-semibold text-white">{copy.panel.routeCheck}</p>
                      <p className="text-xs text-slate-500">{copy.panel.status}</p>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2 text-sm">
                    <StatusRow label={copy.panel.dns} value={copy.panel.ok} />
                    <StatusRow label={copy.panel.server} value={copy.panel.ok} />
                    <StatusRow label={copy.panel.page} value={copy.panel.missing} warning />
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function StatusRow({
  label,
  value,
  warning,
}: {
  label: string;
  value: string;
  warning?: boolean;
}) {
  return (
    <div className="flex items-center justify-between rounded-lg border border-white/10 bg-white/[0.03] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className={warning ? "font-semibold text-amber-200" : "font-semibold text-emerald-200"}>
        {value}
      </span>
    </div>
  );
}

export const Component = NotFound404;