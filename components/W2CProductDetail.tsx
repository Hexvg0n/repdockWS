"use client";

import {
  IconEye,
  IconHeart,
  IconHeartFilled,
  IconShoppingBag,
  IconStarFilled,
  IconTag,
} from "@tabler/icons-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useRef, useState } from "react";

import { getWebpImageUrl } from "@/lib/cloudinary-image";
import { currencies, fallbackCurrencyRates, formatPrice, readClientRate } from "@/lib/currency";
import type { W2CProduct } from "@/types/w2c";

const settingsStorageKey = "repdock-settings";
const favoritesStorageKey = "repdock-w2c-favorites";
const agents = ["RIZZITGO", "KAKOBUY", "USFANS", "ACBUY"] as const;

const agentLogos: Record<(typeof agents)[number], string> = {
  RIZZITGO: "/agents/rig_icon.png",
  KAKOBUY: "/agents/kako_icon.png",
  USFANS: "/agents/usfans_icon.png",
  ACBUY: "/agents/acb_icon.png",
};

export function W2CProductDetail({ product }: { product: W2CProduct }) {
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("CNY");
  const [rates, setRates] = useState(fallbackCurrencyRates);
  const [agent, setAgent] = useState<(typeof agents)[number]>("RIZZITGO");
  const [favorite, setFavorite] = useState(false);
  const [views, setViews] = useState(product.metadata.clicks.allTime);
  const [purchases, setPurchases] = useState(product.metadata.purchases ?? 0);
  const recordedViewRef = useRef(false);
  const imageUrl = getWebpImageUrl(product.image);
  const link = product.links[agent] ?? product.links.original;

  useEffect(() => {
    try {
      const savedSettings = JSON.parse(
        globalThis.localStorage.getItem(settingsStorageKey) ?? "{}",
      ) as { currency?: string; agent?: string };

      if (currencies.includes(savedSettings.currency as (typeof currencies)[number])) {
        setCurrency(savedSettings.currency as (typeof currencies)[number]);
      }

      if (agents.includes(savedSettings.agent as (typeof agents)[number])) {
        setAgent(savedSettings.agent as (typeof agents)[number]);
      }

      const favorites = JSON.parse(
        globalThis.localStorage.getItem(favoritesStorageKey) ?? "[]",
      ) as string[];
      setFavorite(favorites.includes(product.id));
    } catch {
      setCurrency("CNY");
      setAgent("RIZZITGO");
    }
  }, [product.id]);

  useEffect(() => {
    let cancelled = false;

    const loadRates = async () => {
      try {
        const response = await fetch("/api/currency-rates");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          rates?: Partial<Record<(typeof currencies)[number], number>>;
        };

        if (!cancelled && data.rates) {
          setRates({
            CNY: 1,
            PLN: readClientRate(data.rates.PLN, fallbackCurrencyRates.PLN),
            USD: readClientRate(data.rates.USD, fallbackCurrencyRates.USD),
            EUR: readClientRate(data.rates.EUR, fallbackCurrencyRates.EUR),
          });
        }
      } catch {
        setRates(fallbackCurrencyRates);
      }
    };

    void loadRates();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (recordedViewRef.current) {
      return;
    }

    recordedViewRef.current = true;
    void fetch(`/api/w2c/${encodeURIComponent(product.id)}/interaction`, {
      body: JSON.stringify({ type: "view" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      keepalive: true,
    })
      .then((response) => response.json() as Promise<{ counted?: boolean }>)
      .then((data) => {
        if (data.counted) {
          setViews((current) => current + 1);
        }
      })
      .catch(() => undefined);
  }, [product.id]);

  const toggleFavorite = () => {
    setFavorite((current) => {
      const next = !current;

      try {
        const favorites = new Set(
          JSON.parse(globalThis.localStorage.getItem(favoritesStorageKey) ?? "[]") as string[],
        );

        if (next) {
          favorites.add(product.id);
        } else {
          favorites.delete(product.id);
        }

        globalThis.localStorage.setItem(favoritesStorageKey, JSON.stringify([...favorites]));
      } catch {
        // Local favorites are progressive enhancement only.
      }

      return next;
    });
  };

  const recordBuy = () => {
    void fetch(`/api/w2c/${encodeURIComponent(product.id)}/interaction`, {
      body: JSON.stringify({ type: "buy" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      keepalive: true,
    })
      .then((response) => response.json() as Promise<{ counted?: boolean }>)
      .then((data) => {
        if (data.counted) {
          setPurchases((current) => current + 1);
        }
      })
      .catch(() => undefined);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_70%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8 lg:grid-cols-[minmax(0,1fr)_430px]">
        <div className="rounded-[34px] border border-white/10 bg-[#0d0e14] p-4 shadow-2xl shadow-black/30">
          <div className="grid min-h-[620px] place-items-center overflow-hidden rounded-[26px] bg-zinc-900">
            <img src={imageUrl} alt={product.name} className="max-h-[600px] w-full object-contain p-4" />
          </div>
        </div>

        <aside className="flex flex-col rounded-[34px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:sticky lg:top-28 lg:max-h-[calc(100vh-8rem)]">
          <Link href="/w2c" className="mb-5 text-sm font-semibold text-blue-200 hover:text-white">
            Back to W2C
          </Link>

          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-slate-300">
                <IconTag className="size-3.5" />
                {product.metadata.category}
              </span>
              <h1 className="mt-4 font-['Poppins'] text-3xl font-medium leading-tight text-white">
                {product.name}
              </h1>
            </div>
            <button
              type="button"
              onClick={toggleFavorite}
              className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
              aria-label="Toggle favorite"
            >
              {favorite ? <IconHeartFilled className="size-5 text-red-400" /> : <IconHeart className="size-5" />}
            </button>
          </div>

          <div className="mt-5 flex flex-wrap gap-2 text-sm text-slate-400">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/[0.04] px-3 py-1">
              <IconStarFilled className="size-3.5 text-amber-300" />
              {product.rating.toFixed(1)}
            </span>
            <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.gender}</span>
            <span className="rounded-full bg-white/[0.04] px-3 py-1">{product.metadata.season}</span>
          </div>

          <div className="mt-7 rounded-3xl border border-white/10 bg-black/25 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Price</p>
            <p className="mt-2 text-4xl font-black text-white">{formatPrice(product.priceCny, currency, rates)}</p>
            <p className="mt-1 text-sm text-slate-500">Original: {Math.round(product.priceCny)} CNY</p>
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <StatPill icon={<IconEye className="size-4" />} label="Views" value={formatCompact(views)} />
            <StatPill icon={<IconShoppingBag className="size-4" />} label="Buys" value={formatCompact(purchases)} />
          </div>

          <div className="mt-auto grid gap-3 pt-7">
            <a
              href={link}
              target="_blank"
              rel="noreferrer"
              onClick={recordBuy}
              className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-blue-100"
            >
              <img src={agentLogos[agent]} alt="" className="size-5 rounded-md object-contain" />
              Buy Now with {agent}
            </a>
            <p className="text-center text-xs text-slate-500">
              Agent and currency follow your Settings.
            </p>
          </div>
        </aside>
      </section>
    </main>
  );
}

function StatPill({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center gap-2 text-slate-500">
        {icon}
        <span className="text-xs font-semibold uppercase tracking-[0.14em]">{label}</span>
      </div>
      <p className="mt-2 text-2xl font-black text-white">{value}</p>
    </div>
  );
}

function formatCompact(value: number) {
  return new Intl.NumberFormat("en", {
    compactDisplay: "short",
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}
