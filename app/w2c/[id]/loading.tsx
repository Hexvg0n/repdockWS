import {
  IconCameraSearch,
  IconLoader2,
  IconPackage,
  IconTag,
  IconTruckDelivery,
} from "@tabler/icons-react";
import type React from "react";

import { NavbarDemo } from "@/components/NavbarDemo";

const thumbnailSkeletons = [
  "gallery-thumb-1",
  "gallery-thumb-2",
  "gallery-thumb-3",
  "gallery-thumb-4",
  "gallery-thumb-5",
];

const variantSkeletons = [
  "variant-skeleton-1",
  "variant-skeleton-2",
  "variant-skeleton-3",
  "variant-skeleton-4",
  "variant-skeleton-5",
  "variant-skeleton-6",
];

export default function W2CProductLoading() {
  return (
    <>
      <NavbarDemo />
      <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
        <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_65%)]" />

        <section className="relative mx-auto grid w-full max-w-7xl gap-7">
          <div className="inline-flex w-fit items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-4 py-2 text-sm font-semibold text-blue-100 shadow-2xl shadow-blue-950/20">
            <IconLoader2 className="size-4 animate-spin" />
            Ladowanie produktu
          </div>

          <div className="grid gap-7 lg:grid-cols-[minmax(0,1.05fr)_minmax(360px,0.95fr)] lg:items-start">
            <div className="grid gap-4">
              <div className="relative aspect-[1.08/1] overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/30">
                <div className="absolute inset-6 animate-pulse rounded-[24px] bg-white/[0.055]" />
                <div className="absolute inset-x-8 bottom-8 h-3 rounded-full bg-white/[0.08]" />
              </div>

              <div className="grid gap-3">
                <div className="flex items-center gap-2 text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                  Galeria
                </div>
                <div className="flex gap-3 overflow-hidden">
                  {thumbnailSkeletons.map((key) => (
                    <div
                      className="size-20 shrink-0 animate-pulse rounded-2xl border border-white/10 bg-white/[0.06]"
                      key={key}
                    />
                  ))}
                </div>
              </div>
            </div>

            <aside className="grid gap-5 rounded-[32px] border border-white/10 bg-[#080910]/92 p-5 shadow-2xl shadow-black/35 backdrop-blur-xl md:p-6">
              <div className="grid gap-3">
                <div className="h-4 w-32 animate-pulse rounded-full bg-blue-400/20" />
                <div className="h-9 w-4/5 animate-pulse rounded-full bg-white/[0.08]" />
                <div className="h-9 w-2/3 animate-pulse rounded-full bg-white/[0.065]" />
                <div className="h-4 w-full animate-pulse rounded-full bg-white/[0.045]" />
                <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.045]" />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <LoadingMetric icon={<IconTag className="size-4" />} />
                <LoadingMetric icon={<IconTruckDelivery className="size-4" />} />
                <LoadingMetric icon={<IconPackage className="size-4" />} />
                <LoadingMetric icon={<IconCameraSearch className="size-4" />} />
              </div>

              <div className="grid gap-3 rounded-[26px] border border-white/10 bg-white/[0.035] p-4">
                <div className="h-5 w-28 animate-pulse rounded-full bg-white/[0.08]" />
                <div className="grid grid-cols-2 gap-2">
                  {variantSkeletons.map((key) => (
                    <div
                      className="h-12 animate-pulse rounded-2xl border border-white/10 bg-black/25"
                      key={key}
                    />
                  ))}
                </div>
              </div>

              <div className="h-12 animate-pulse rounded-2xl bg-white" />
            </aside>
          </div>

          <div className="grid gap-4">
            <div className="h-8 w-52 animate-pulse rounded-full bg-white/[0.08]" />
            <div className="grid gap-3 rounded-[28px] border border-white/10 bg-white/[0.035] p-4">
              <div className="h-48 animate-pulse rounded-2xl bg-white/[0.055]" />
              <div className="h-48 animate-pulse rounded-2xl bg-white/[0.045]" />
            </div>
          </div>
        </section>
      </main>
    </>
  );
}

function LoadingMetric({ icon }: { icon: React.ReactNode }) {
  return (
    <div className="grid gap-2 rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <span className="grid size-8 place-items-center rounded-xl bg-blue-500/10 text-blue-100">
        {icon}
      </span>
      <div className="h-4 w-3/4 animate-pulse rounded-full bg-white/[0.08]" />
      <div className="h-3 w-1/2 animate-pulse rounded-full bg-white/[0.05]" />
    </div>
  );
}
