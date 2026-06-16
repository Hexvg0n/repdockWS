import SmartImage from "@/components/SmartImage";
import {
  IconBrandDiscordFilled,
  IconBrandTiktokFilled,
  IconCalculator,
  IconExternalLink,
  IconPackage,
  IconPhotoSearch,
  IconRefresh,
  IconShirt,
} from "@tabler/icons-react";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Links",
  description: "RepDock quick links, tools and community shortcuts.",
};

const links = [
  {
    href: "/w2c",
    icon: IconPackage,
    label: "W2C finds",
  },
  {
    href: "/outfits",
    icon: IconShirt,
    label: "Outfity",
  },
  {
    href: "/converter",
    icon: IconRefresh,
    label: "Konwerter linków",
  },
  {
    href: "/qc",
    icon: IconPhotoSearch,
    label: "QC gallery",
  },
  {
    href: "/calculator",
    icon: IconCalculator,
    label: "Kalkulator wysyłki",
  },
  {
    href: "/tiktok-items",
    icon: IconBrandTiktokFilled,
    label: "TikTok Items",
  },
];

export default function LinksPage() {
  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 py-10 text-white sm:px-6">
      <video
        aria-hidden="true"
        autoPlay
        className="absolute inset-0 size-full object-cover opacity-55"
        loop
        muted
        playsInline
        poster="/RepDock-25.png"
        preload="metadata"
      >
        <source src="/links_background.mp4" type="video/mp4" />
      </video>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(65%_45%_at_50%_20%,rgba(41,52,255,0.38),transparent_72%),linear-gradient(to_bottom,rgba(0,0,0,0.24),rgba(0,0,0,0.86))]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:96px_96px] opacity-25 [mask-image:linear-gradient(to_bottom,black,transparent_82%)]" />

      <section className="relative z-10 mx-auto flex min-h-[calc(100vh-5rem)] w-full max-w-xl items-center justify-center">
        <div className="w-full rounded-[34px] border border-white/15 bg-black/45 p-5 shadow-2xl shadow-black/40 backdrop-blur-2xl sm:p-6">
          <div className="flex flex-col items-center text-center">
            <span className="grid size-20 place-items-center rounded-[28px] border border-white/15 bg-white shadow-[0_18px_70px_rgba(41,52,255,0.26)]">
              <SmartImage
                alt="RepDock"
                className="size-14 object-contain"
                fetchPriority="high"
                height={56}
                loading="eager"
                src="/RepDock-25.png"
                unoptimized
                width={56}
              />
            </span>
            <p className="mt-5 text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">
              RepDock links
            </p>
            <h1 className="mt-2 font-poppins text-4xl font-medium tracking-normal text-white">
              Wszystko w jednym miejscu
            </h1>
            <p className="mt-3 max-w-md text-sm leading-relaxed text-slate-300">
              Szybki dostęp do narzędzi, itemów, QC i społeczności. Box jest tymczasowy, ale gotowy pod dalsze linki.
            </p>
          </div>

          <div className="mt-6 grid gap-3">
            {links.map((link) => {
              const Icon = link.icon;

              return (
                <a
                  className="group flex h-14 items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/[0.07] px-4 text-sm font-semibold text-white transition hover:-translate-y-0.5 hover:border-blue-300/35 hover:bg-blue-500/15"
                  href={link.href}
                  key={link.href}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/[0.08] text-blue-100 ring-1 ring-white/10">
                      <Icon className="size-5" />
                    </span>
                    <span className="truncate">{link.label}</span>
                  </span>
                  <IconExternalLink className="size-4 shrink-0 text-slate-500 transition group-hover:text-blue-100" />
                </a>
              );
            })}
          </div>

          <a
            className="mt-4 flex h-14 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-4 text-sm font-bold text-white shadow-[0_18px_60px_rgba(88,101,242,0.32)] transition hover:-translate-y-0.5 hover:bg-[#4752C4]"
            href="/api/auth/discord/login"
          >
            <IconBrandDiscordFilled className="size-5" />
            Dołącz przez Discord
          </a>
        </div>
      </section>
    </main>
  );
}
