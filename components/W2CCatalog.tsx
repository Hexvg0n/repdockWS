"use client";

import SmartImage from "@/components/SmartImage";
import {
  IconArrowDown,
  IconArrowUp,
  IconBuildingStore,
  IconCalendar,
  IconClock,
  IconCurrencyYuan,
  IconEye,
  IconFilter,
  IconFlame,
  IconHeart,
  IconHeartFilled,
  IconLoader2,
  IconSearch,
  IconSnowflake,
  IconSortDescending,
  IconShoppingBag,
  IconSparkles2Filled ,
  IconStarFilled,
  IconSun,
  IconX,
} from "@tabler/icons-react";
import type React from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { flushSync } from "react-dom";
import Link from "next/link";

import { LoginRequiredDialog } from "@/components/LoginRequiredDialog";
import { Button } from "@/components/ui/button";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import { currencies, fallbackCurrencyRates, formatPrice, readClientRate } from "@/lib/currency";
import {
  settingsStorageKey,
  useLanguageCopy,
  useRepdockLanguage,
} from "@/lib/use-repdock-language";
import { cn } from "@/lib/utils";
import type { W2CGender, W2CProduct, W2CProductsResponse } from "@/types/w2c";

const agents = ["BBDBUY", "KAKOBUY", "USFANS", "ACBUY"] as const;
const seasonOptions = ["All", "SS", "FW"];
const productSkeletonKeys = [
  "product-skeleton-1",
  "product-skeleton-2",
  "product-skeleton-3",
  "product-skeleton-4",
  "product-skeleton-5",
  "product-skeleton-6",
  "product-skeleton-7",
  "product-skeleton-8",
];

const agentLogos: Record<(typeof agents)[number], string> = {
  BBDBUY: "/agents/BBDBUY_icon.png",
  KAKOBUY: "/agents/kako_icon.png",
  USFANS: "/agents/usfans_icon.png",
  ACBUY: "/agents/acb_icon.png",
};

const priceSlider = {
  min: 0,
  max: 2000,
  step: 10,
};

type Filters = {
  search: string;
  gender: W2CGender;
  category: string;
  brand: string;
  season: string;
  minPrice: string;
  maxPrice: string;
  sort: string;
};

const defaultFilters: Filters = {
  search: "",
  gender: "men",
  category: "All",
  brand: "All",
  season: "All",
  minPrice: "",
  maxPrice: "",
  sort: "newest",
};

const w2cCopy = {
  PL: {
    filter: {
      apply: "Zastosuj",
      brandDescription: "Ogranicz wyniki do wybranej marki.",
      brandTitle: "Marka",
      clear: "Wyczyść",
      close: "Zamknij filtry",
      description: "Dopasuj katalog według metadanych produktów.",
      filters: "Filtry",
      optionLabels: {
        All: "Wszystkie",
      },
      priceActive: "Do",
      priceAny: "Dowolna cena",
      priceDescription: "Przeciągnij suwak, aby ustawić maksymalną cenę produktu.",
      priceTitle: "Cena",
      reset: "Resetuj",
      seasonDescription: "Użyj tagów sezonu dodanych w panelu admina.",
      seasonTitle: "Sezon",
      showLess: "Pokaz mniej",
      showMore: "Pokaz wiecej",
      sortDescription: "Zmień kolejność produktów.",
      sortLabels: {
        newest: "Najnowsze",
        popular: "Popularne",
        "price-high": "Cena wysoka",
        "price-low": "Cena niska",
        rating: "Najlepiej oceniane",
      },
      sortTitle: "Sortowanie",
    },
    gender: {
      men: "Męskie",
      neutral: "Unisex",
      women: "Damskie",
    },
    header: {
      description: "Najlepsze itemy wybrane przez nas dla Ciebie.",
      title: "Where To Cop",
    },
    labels: {
      all: "Wszystkie",
      finds: "znalezisk",
      favoriteError: "Nie udalo sie zapisac ulubionych.",
      favoriteLoginAction: "Zaloguj przez Discord",
      favoriteLoginClose: "Zamknij",
      favoriteLoginDescription: "Ulubione sa zapisywane na Twoim koncie, dlatego musisz byc zalogowany.",
      favoriteLoginTitle: "Zaloguj sie, zeby zapisac item",
      loading: "Ładowanie produktów",
      noMore: "Nie ma więcej produktów",
      settingsFollow: "Ceny i linki korzystają z Ustawień",
      searchPlaceholder: "Szukaj produktów...",
    },
    product: {
      buyNow: "Kup teraz",
      favorite: "Dodaj do ulubionych",
      new: "Nowe",
      open: "Otwórz produkt",
    },
  },
  EN: {
    filter: {
      apply: "Apply",
      brandDescription: "Limit results to a selected brand.",
      brandTitle: "Brand",
      clear: "Clear",
      close: "Close filters",
      description: "Fine tune the catalog with product metadata.",
      filters: "Filters",
      optionLabels: {
        All: "All",
      },
      priceActive: "Up to",
      priceAny: "Any price",
      priceDescription: "Drag the handle to set the maximum product price.",
      priceTitle: "Price",
      reset: "Reset",
      seasonDescription: "Use season tags added in the admin panel.",
      seasonTitle: "Season",
      showLess: "Show less",
      showMore: "Show more",
      sortDescription: "Change how products are ordered.",
      sortLabels: {
        newest: "Newest",
        popular: "Popular",
        "price-high": "Price high",
        "price-low": "Price low",
        rating: "Top rated",
      },
      sortTitle: "Sort",
    },
    gender: {
      men: "Men",
      neutral: "Unisex",
      women: "Women",
    },
    header: {
      description: "The best quality selected by us for you.",
      title: "Where To Cop",
    },
    labels: {
      all: "All",
      finds: "finds",
      favoriteError: "Could not save favorites.",
      favoriteLoginAction: "Login with Discord",
      favoriteLoginClose: "Close",
      favoriteLoginDescription: "Favorites are saved to your account, so you need to be logged in.",
      favoriteLoginTitle: "Login to save this item",
      loading: "Loading products",
      noMore: "No more products",
      settingsFollow: "Prices and links follow Settings",
      searchPlaceholder: "Search products...",
    },
    product: {
      buyNow: "Buy Now",
      favorite: "Add to favorites",
      new: "New",
      open: "Open product",
    },
  },
} as const;

type W2CCopy = (typeof w2cCopy)[keyof typeof w2cCopy];

export function W2CCatalog() {
  const copy = useLanguageCopy(w2cCopy);
  const language = useRepdockLanguage();
  const numberLocale = language === "PL" ? "pl" : "en";
  const [filters, setFilters] = useState<Filters>(defaultFilters);
  const [products, setProducts] = useState<W2CProduct[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [brands, setBrands] = useState<string[]>([]);
  const [seasons, setSeasons] = useState<string[]>([]);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoginOpen, setFavoriteLoginOpen] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const [openingProductName, setOpeningProductName] = useState<string | null>(null);
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("CNY");
  const [currencyRates, setCurrencyRates] = useState(fallbackCurrencyRates);
  const [agent, setAgent] = useState<(typeof agents)[number]>("BBDBUY");
  const observerTarget = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(
          globalThis.localStorage.getItem(settingsStorageKey) ?? "{}",
        ) as { currency?: string; agent?: string };

        if (
          currencies.includes(
            savedSettings.currency as (typeof currencies)[number],
          )
        ) {
          setCurrency(savedSettings.currency as (typeof currencies)[number]);
        }

        if (agents.includes(savedSettings.agent as (typeof agents)[number])) {
          setAgent(savedSettings.agent as (typeof agents)[number]);
        }
      } catch {
        setCurrency("CNY");
        setAgent("BBDBUY");
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

  useEffect(() => {
    let cancelled = false;

    const loadFavorites = async () => {
      try {
        const response = await fetch("/api/w2c/favorites");

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          setFavorites(new Set());
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { productIds?: string[] };
        setFavorites(new Set(data.productIds ?? []));
      } catch {
        if (!cancelled) {
          setFavorites(new Set());
        }
      }
    };

    void loadFavorites();

    const onFavoritesUpdated = () => {
      void loadFavorites();
    };

    globalThis.addEventListener("repdock-favorites-updated", onFavoritesUpdated);

    return () => {
      cancelled = true;
      globalThis.removeEventListener("repdock-favorites-updated", onFavoritesUpdated);
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCurrencyRates = async () => {
      try {
        const response = await fetch("/api/currency-rates");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          rates?: Partial<Record<(typeof currencies)[number], number>>;
        };

        if (cancelled || !data.rates) {
          return;
        }

        setCurrencyRates({
          CNY: 1,
          PLN: readClientRate(data.rates.PLN, fallbackCurrencyRates.PLN),
          USD: readClientRate(data.rates.USD, fallbackCurrencyRates.USD),
          EUR: readClientRate(data.rates.EUR, fallbackCurrencyRates.EUR),
        });
      } catch {
        setCurrencyRates(fallbackCurrencyRates);
      }
    };

    void loadCurrencyRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchProducts = useCallback(
    async ({ cursor, replace }: { cursor: number; replace: boolean }) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      const params = new URLSearchParams({
        cursor: String(cursor),
        gender: filters.gender,
        category: filters.category,
        brand: filters.brand,
        season: filters.season,
        sort: filters.sort,
      });

      addOptionalParam(params, "search", filters.search);
      addOptionalParam(params, "minPrice", filters.minPrice);
      addOptionalParam(params, "maxPrice", filters.maxPrice);

      try {
        const response = await fetch(`/api/w2c?${params.toString()}`);
        const data = (await response.json()) as W2CProductsResponse;

        if (requestId !== requestIdRef.current) {
          return;
        }

        setProducts((current) =>
          replace ? data.products : [...current, ...data.products],
        );
        setNextCursor(data.nextCursor);
        setTotal(data.total);
        setCategories(["All", ...data.categories]);
        setBrands(["All", ...data.brands]);
        setSeasons(seasonOptions);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [filters],
  );

  useEffect(() => {
    setProducts([]);
    setNextCursor(0);
    void fetchProducts({ cursor: 0, replace: true });
  }, [fetchProducts]);

  useEffect(() => {
    const target = observerTarget.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && nextCursor !== null && !loading) {
          void fetchProducts({ cursor: nextCursor, replace: false });
        }
      },
      { rootMargin: "600px" },
    );

    observer.observe(target);
    return () => observer.disconnect();
  }, [fetchProducts, loading, nextCursor]);

  useEffect(() => {
    if (!openingProductName) {
      return;
    }

    const timeout = globalThis.setTimeout(() => {
      setOpeningProductName(null);
    }, 30000);

    return () => globalThis.clearTimeout(timeout);
  }, [openingProductName]);

  const activeFilterCount = useMemo(
    () =>
      [
        filters.search,
        filters.brand !== "All",
        filters.season !== "All",
        filters.minPrice,
        filters.maxPrice,
        filters.sort !== "newest",
      ].filter(Boolean).length,
    [filters],
  );

  const toggleFavorite = async (productId: string) => {
    const isFavorite = favorites.has(productId);
    setFavoriteStatus("");

    try {
      const response = await fetch("/api/w2c/favorites", {
        body: JSON.stringify({ productId }),
        headers: { "Content-Type": "application/json" },
        method: isFavorite ? "DELETE" : "POST",
      });

      if (response.status === 401) {
        setFavoriteLoginOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setFavorites((current) => {
        const next = new Set(current);

        if (isFavorite) {
          next.delete(productId);
        } else {
          next.add(productId);
        }

        return next;
      });
      globalThis.dispatchEvent(new Event("repdock-favorites-updated"));
    } catch {
      setFavoriteStatus(copy.labels.favoriteError);
    }
  };

  const recordInteraction = (productId: string, type: "view" | "buy") => {
    if (type === "view") {
      return;
    }

    void fetch(`/api/w2c/${encodeURIComponent(productId)}/interaction`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ type }),
      keepalive: true,
    })
      .then((response) => response.json() as Promise<{ counted?: boolean }>)
      .then((data) => {
        if (!data.counted) {
          return;
        }

        setProducts((current) =>
          current.map((product) => {
            if (product.id !== productId) {
              return product;
            }
            return {
              ...product,
              metadata: {
                ...product.metadata,
                purchases: (product.metadata.purchases ?? 0) + 1,
              },
            };
          }),
        );
      })
      .catch(() => undefined);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] overflow-hidden opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]">
        <SmartImage
          src="https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272"
          srcSet="
            https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?scale-down-to=512&width=513&height=272 512w,
            https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272 513w
          "
          sizes="100vw"
          width="513"
          height="272"
          alt=""
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_65%)]" />

      <section className="relative mx-auto w-full max-w-7xl">
        <div className="mb-8 flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div className="max-w-3xl">
            <h1 className="mt-3 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
              {copy.header.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              {copy.header.description}
            </p>
          </div>

          <div className="flex w-full max-w-md items-center gap-3 rounded-[22px] border border-white/10 bg-white/[0.04] p-3 shadow-2xl shadow-black/20 backdrop-blur-xl lg:w-auto">
            <AgentPill agent={agent} />
            <span className="h-8 w-px bg-white/10" />
            <span className="rounded-full bg-blue-500/15 px-3 py-2 text-sm font-semibold text-blue-100">
              {currency}
            </span>
          </div>
        </div>

        <div className="sticky top-20 z-30 mb-7 rounded-[28px] border border-white/10 bg-black/58 p-3 shadow-2xl shadow-black/30 backdrop-blur-xl">
          <div className="grid gap-4">
            <div className="grid gap-3 lg:grid-cols-[1fr_auto_auto] lg:items-center">
              <label className="relative block">
                <IconSearch
                  className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400"
                  stroke={1.8}
                />
                <input
                  value={filters.search}
                  onChange={(event) =>
                    setFilters((current) => ({
                      ...current,
                      search: event.target.value,
                    }))
                  }
                  placeholder={copy.labels.searchPlaceholder}
                  className="h-12 w-full rounded-2xl border border-white/10 bg-white/[0.045] pl-12 pr-4 text-sm font-medium text-white outline-none shadow-inner shadow-black/20 transition placeholder:text-slate-500 focus:border-blue-400/50 focus:bg-white/[0.07] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
                />
              </label>

              <div className="grid grid-cols-2 rounded-2xl border border-white/10 bg-white/[0.035] p-1 shadow-inner shadow-black/20">
                {(["men", "women"] as const).map((gender) => (
                  <button
                    key={gender}
                    type="button"
                    onClick={() =>
                      setFilters((current) => ({ ...current, gender }))
                    }
                    className={cn(
                      "relative min-w-20 overflow-hidden rounded-xl px-4 py-2.5 text-sm font-semibold capitalize transition",
                      filters.gender === gender
                        ? "border border-blue-400/50 bg-gradient-to-b from-blue-500/25 to-blue-700/15 text-white shadow-[0_8px_26px_rgba(41,52,255,0.3)]"
                        : "border border-transparent text-slate-400 hover:bg-white/[0.06] hover:text-white",
                    )}
                  >
                    {filters.gender === gender ? (
                      <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                    ) : null}
                    {copy.gender[gender]}
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                onClick={() => setFilterPanelOpen(true)}
                className="h-12 rounded-2xl border-white/10 bg-white/[0.04] px-5 text-white shadow-inner shadow-black/10 hover:border-white/20 hover:bg-white/[0.08]"
              >
                <IconFilter className="size-4" />
                {copy.filter.filters}
                {activeFilterCount ? (
                  <span className="ml-1 rounded-full bg-blue-600 px-2 py-0.5 text-xs text-white">
                    {activeFilterCount}
                  </span>
                ) : null}
              </Button>
            </div>

            <div className="flex flex-wrap justify-center gap-2 pb-1">
              {categories.map((category) => (
                <button
                  key={category}
                  type="button"
                  onClick={() =>
                    setFilters((current) => ({ ...current, category }))
                  }
                  className={cn(
                    "relative overflow-hidden rounded-full border px-4 py-2 text-sm font-semibold transition",
                    filters.category === category
                      ? "border-blue-400/50 bg-gradient-to-b from-blue-500/25 to-blue-700/15 text-white shadow-[0_8px_24px_rgba(41,52,255,0.22)]"
                      : "border-white/10 bg-white/[0.03] text-slate-300 hover:border-white/20 hover:bg-white/[0.07] hover:text-white",
                  )}
                >
                  {filters.category === category ? (
                    <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
                  ) : null}
                  {category === "All" ? copy.labels.all : category}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="mb-5 flex items-center justify-between text-sm text-slate-500">
          <span>{total} {copy.labels.finds}</span>
          <span>{copy.labels.settingsFollow}</span>
        </div>
        {favoriteStatus ? (
          <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
            {favoriteStatus}
          </div>
        ) : null}

        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {products.map((product) => (
            <ProductCard
              agent={agent}
              currency={currency}
              favorite={favorites.has(product.id)}
              key={product.id}
              product={product}
              copy={copy}
              numberLocale={numberLocale}
              rates={currencyRates}
              onOpenProduct={() => setOpeningProductName(product.name)}
              onRecordBuy={() => recordInteraction(product.id, "buy")}
              onToggleFavorite={() => toggleFavorite(product.id)}
            />
          ))}
          {loading && products.length === 0
            ? productSkeletonKeys.map((skeletonKey) => <ProductCardSkeleton key={skeletonKey} />)
            : null}
        </div>

        <div ref={observerTarget} className="grid min-h-24 place-items-center">
          {loading ? (
            <span className="inline-flex items-center gap-2 text-sm text-slate-400">
              <IconLoader2 className="size-4 animate-spin" />
              {copy.labels.loading}
            </span>
          ) : nextCursor === null ? (
            <span className="text-sm text-slate-500">{copy.labels.noMore}</span>
          ) : null}
        </div>
      </section>

      <FilterPanel
        brands={brands}
        copy={copy}
        filters={filters}
        open={filterPanelOpen}
        seasons={seasons}
        onClose={() => setFilterPanelOpen(false)}
        onChange={setFilters}
      />
      <LoginRequiredDialog
        open={favoriteLoginOpen}
        title={copy.labels.favoriteLoginTitle}
        description={copy.labels.favoriteLoginDescription}
        actionLabel={copy.labels.favoriteLoginAction}
        closeLabel={copy.labels.favoriteLoginClose}
        onClose={() => setFavoriteLoginOpen(false)}
      />
      {openingProductName ? (
        <ProductNavigationOverlay language={language} productName={openingProductName} />
      ) : null}
    </main>
  );
}

function ProductCard({
  agent,
  copy,
  currency,
  favorite,
  numberLocale,
  product,
  rates,
  onOpenProduct,
  onRecordBuy,
  onToggleFavorite,
}: Readonly<{
  agent: (typeof agents)[number];
  copy: W2CCopy;
  currency: (typeof currencies)[number];
  favorite: boolean;
  numberLocale: string;
  product: W2CProduct;
  rates: Record<(typeof currencies)[number], number>;
  onOpenProduct: () => void;
  onRecordBuy: () => void;
  onToggleFavorite: () => void;
}>) {
  const link = product.links[agent] ?? product.links.original;
  const productHref = `/w2c/${encodeURIComponent(product.id)}`;
  const imageUrl = getWebpImageUrl(product.image);
  const isFresh =
    Date.now() - Date.parse(product.metadata.addedAt) < 1000 * 60 * 60 * 24 * 7;

  const handleProductOpen = (event: React.MouseEvent<HTMLAnchorElement>) => {
    if (
      event.defaultPrevented ||
      event.button !== 0 ||
      event.metaKey ||
      event.ctrlKey ||
      event.shiftKey ||
      event.altKey
    ) {
      return;
    }

    flushSync(onOpenProduct);
  };

  return (
    <article
      className="group relative flex h-full w-full flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/20 transition duration-300 hover:-translate-y-1 hover:shadow-[0_28px_90px_rgba(41,52,255,0.18)]"
    >
      <Link
        href={productHref}
        aria-label={`${copy.product.open}: ${product.name}`}
        className="absolute inset-0 z-10"
        onClick={handleProductOpen}
      />
      {/* Image area — white rounded bg */}
      <div className="relative m-3 mb-0 overflow-hidden rounded-2xl bg-zinc-900">
        <SmartImage
          src={imageUrl}
          alt={product.name}
          className="h-52 w-full object-contain p-2 transition-transform duration-300 group-hover:scale-105"
        />

        {/* Top-right: rating pill + heart stacked */}
        <div className="absolute right-2.5 top-2.5 flex flex-col items-center gap-1.5">
          <span className="inline-flex items-center gap-1 rounded-xl bg-black/50 px-2.5 py-1.5 text-xs font-bold text-amber-300 backdrop-blur">
            <IconStarFilled className="size-3.5" />
            {product.rating.toFixed(1)}
          </span>
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-label={copy.product.favorite}
            className="relative z-20 grid size-9 place-items-center rounded-xl bg-black/50 text-white backdrop-blur transition hover:bg-black/70"
          >
            {favorite ? (
              <IconHeartFilled className="size-4 text-red-400" />
            ) : (
              <IconHeart className="size-4" stroke={1.8} />
            )}
          </button>
        </div>

        {/* Top-left: New badge */}
        {isFresh ? (
          <span className="absolute left-2.5 top-2.5 inline-flex items-center gap-1 rounded-full bg-yellow-500 px-2.5 py-1.5 text-xs font-bold text-white shadow-lg">
            <IconSparkles2Filled  className="size-3" />
            {copy.product.new}
          </span>
        ) : null}
      </div>

      {/* Content section */}
      <div className="flex min-h-[184px] flex-grow flex-col p-4">
        {/* Name */}
        <h2 className="line-clamp-2 text-sm font-semibold leading-snug text-white">
          {product.name}
        </h2>
        <div className="mt-auto grid gap-3 pt-4">
        {/* Price */}
        <span className="text-2xl font-black text-white">
          {formatPrice(product.priceCny, currency, rates)}
        </span>

        {/* Buy Now */}
        <a
          href={link}
          target="_blank"
          rel="noreferrer"
          onClick={onRecordBuy}
          className="relative z-20 inline-flex h-11 w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-blue-100"
        >
          <SmartImage src={agentLogos[agent]} alt="" className="size-5 rounded-md object-contain" />
          {copy.product.buyNow}
        </a>

        {/* Stats row — bottom */}
        <div className="flex items-center justify-center gap-4">
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <IconEye className="size-3.5" stroke={1.6} />
            {formatCompact(product.metadata.clicks.allTime, numberLocale)}
          </span>
          <span className="inline-flex items-center gap-1.5 text-xs text-slate-500">
            <IconShoppingBag className="size-3.5" stroke={1.6} />
            {formatCompact(product.metadata.purchases ?? 0, numberLocale)}
          </span>
        </div>
        </div>
      </div>
    </article>
  );
}

function ProductNavigationOverlay({
  language,
  productName,
}: Readonly<{
  language: string;
  productName: string;
}>) {
  const title = language === "PL" ? "Ladowanie produktu" : "Loading product";
  const hint =
    language === "PL"
      ? "Pobieramy galerie, warianty i dane agenta."
      : "Fetching gallery, variants and agent data.";

  return (
    <div className="fixed inset-0 z-[120] grid place-items-center bg-black/78 p-4 backdrop-blur-md">
      <div className="relative w-full max-w-md overflow-hidden rounded-[30px] border border-white/10 bg-[#080910] p-6 text-white shadow-[0_24px_90px_rgba(0,0,0,0.72)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-36 bg-[radial-gradient(70%_70%_at_50%_0%,rgba(41,52,255,0.28),transparent_72%)]" />
        <div className="relative grid gap-5">
          <div className="flex items-center gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
              <IconLoader2 className="size-5 animate-spin" />
            </span>
            <div className="min-w-0">
              <h2 className="font-['Poppins'] text-xl font-medium">{title}</h2>
              <p className="mt-1 truncate text-sm text-slate-400">{productName}</p>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-slate-400">{hint}</p>

          <div className="grid gap-2">
            <div className="h-2 overflow-hidden rounded-full bg-white/[0.06]">
              <div className="h-full w-1/2 animate-pulse rounded-full bg-blue-400/70" />
            </div>
            <div className="grid grid-cols-3 gap-2">
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.055]" />
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.045]" />
              <div className="h-16 animate-pulse rounded-2xl bg-white/[0.035]" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function AgentPill({
  agent,
  compact = false,
}: Readonly<{
  agent: (typeof agents)[number];
  compact?: boolean;
}>) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 rounded-2xl bg-white px-3 py-2 font-bold text-black",
        compact ? "min-w-0" : "min-w-36 justify-center",
      )}
    >
      <SmartImage
        src={agentLogos[agent]}
        alt=""
        className={cn("shrink-0 object-contain", compact ? "size-5" : "size-6")}
      />
      <span className={compact ? "hidden text-sm sm:inline" : "text-sm"}>
        {agent}
      </span>
    </span>
  );
}

function ProductCardSkeleton() {
  return (
    <article className="flex h-full w-full animate-pulse flex-col overflow-hidden rounded-[28px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/20">
      <div className="m-3 mb-0 h-52 rounded-2xl bg-white/[0.06]" />
      <div className="flex min-h-[184px] flex-grow flex-col p-4">
        <div className="h-4 w-4/5 rounded-full bg-white/[0.08]" />
        <div className="mt-2 h-4 w-2/3 rounded-full bg-white/[0.06]" />
        <div className="mt-auto grid gap-3 pt-4">
          <div className="h-8 w-1/2 rounded-full bg-white/[0.08]" />
          <div className="h-11 rounded-2xl bg-white/[0.09]" />
          <div className="mx-auto h-3 w-24 rounded-full bg-white/[0.06]" />
        </div>
      </div>
    </article>
  );
}

function FilterPanel({
  brands,
  copy,
  filters,
  open,
  seasons,
  onClose,
  onChange,
}: Readonly<{
  brands: string[];
  copy: W2CCopy;
  filters: Filters;
  open: boolean;
  seasons: string[];
  onClose: () => void;
  onChange: React.Dispatch<React.SetStateAction<Filters>>;
}>) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/75 p-4 backdrop-blur-sm">
      <button
        className="absolute inset-0 cursor-default"
        type="button"
        onClick={onClose}
      />
      <aside className="relative max-h-[min(760px,calc(100vh-32px))] w-full max-w-[720px] overflow-y-auto rounded-[32px] border border-white/10 bg-[#060710] p-5 pb-0 text-white shadow-[0_24px_90px_rgba(0,0,0,0.65)]">
        <div className="pointer-events-none absolute inset-x-0 top-0 h-64 rounded-t-[32px] bg-[radial-gradient(70%_55%_at_50%_0%,rgba(41,52,255,0.24),transparent_72%)]" />
        <div className="relative grid gap-5">
          <div className="flex items-start justify-between gap-4 border-b border-white/10 pb-5">
            <div className="flex gap-3">
              <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
                <IconFilter className="size-5" />
              </span>
              <div>
                <h2 className="text-xl font-semibold">{copy.filter.filters}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {copy.filter.description}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="grid size-10 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-slate-300 transition hover:bg-white/[0.08] hover:text-white"
              aria-label={copy.filter.close}
            >
              <IconX className="size-5" />
            </button>
          </div>

          <FilterSection
            description={copy.filter.brandDescription}
            icon={<IconBuildingStore className="size-5" />}
            title={copy.filter.brandTitle}
          >
            <FilterOptionGrid
              collapsedLimit={8}
              iconForOption={() => <IconBuildingStore className="size-4" />}
              labels={copy.filter.optionLabels}
              options={brands}
              showLessLabel={copy.filter.showLess}
              showMoreLabel={copy.filter.showMore}
              value={filters.brand}
              onChange={(brand) => onChange((current) => ({ ...current, brand }))}
            />
          </FilterSection>

          <FilterSection
            description={copy.filter.seasonDescription}
            icon={<IconCalendar className="size-5" />}
            title={copy.filter.seasonTitle}
          >
            <FilterOptionGrid
              iconForOption={getSeasonOptionIcon}
              labels={copy.filter.optionLabels}
              options={seasons}
              value={filters.season}
              onChange={(season) =>
                onChange((current) => ({ ...current, season }))
              }
            />
          </FilterSection>

          <FilterSection
            description={copy.filter.sortDescription}
            icon={<IconSortDescending className="size-5" />}
            title={copy.filter.sortTitle}
          >
            <FilterOptionGrid
              iconForOption={getSortOptionIcon}
              labels={copy.filter.sortLabels}
              options={["newest", "popular", "rating", "price-low", "price-high"]}
              value={filters.sort}
              onChange={(sort) => onChange((current) => ({ ...current, sort }))}
            />
          </FilterSection>

          <FilterSection
            description={copy.filter.priceDescription}
            icon={<IconCurrencyYuan className="size-5" />}
            title={copy.filter.priceTitle}
          >
            <PriceRangeFilter
              copy={copy}
              maxPrice={filters.maxPrice}
              minPrice={filters.minPrice}
              onChange={(priceRange) =>
                onChange((current) => ({ ...current, ...priceRange }))
              }
            />
          </FilterSection>

          <div className="sticky bottom-0 z-40 -mx-5 mt-1 flex gap-3 border-t border-white/10 bg-[#060710] px-5 pb-5 pt-4 shadow-[0_-24px_44px_rgba(6,7,16,0.96)] before:absolute before:inset-x-0 before:-top-8 before:h-8 before:bg-gradient-to-t before:from-[#060710] before:to-transparent">
            <Button
              variant="outline"
              className="h-11 flex-1 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
              onClick={() =>
                onChange((current) => ({
                  ...defaultFilters,
                  gender: current.gender,
                  category: current.category,
                }))
              }
            >
              {copy.filter.reset}
            </Button>
            <Button className="h-11 flex-1 rounded-2xl" onClick={onClose}>
              {copy.filter.apply}
            </Button>
          </div>
        </div>
      </aside>
    </div>
  );
}

function FilterSection({
  children,
  description,
  icon,
  title,
}: Readonly<{
  children: React.ReactNode;
  description: string;
  icon: React.ReactNode;
  title: string;
}>) {
  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-white/[0.035] p-4 shadow-inner shadow-black/20">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-white/[0.045] text-blue-200 ring-1 ring-white/10">
          {icon}
        </span>
        <div>
          <h3 className="font-semibold text-white">{title}</h3>
          <p className="mt-0.5 text-sm leading-relaxed text-slate-500">{description}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

function FilterOptionGrid({
  collapsedLimit,
  iconForOption,
  labels = {},
  options,
  showLessLabel,
  showMoreLabel,
  value,
  onChange,
}: Readonly<{
  collapsedLimit?: number;
  iconForOption?: (option: string) => React.ReactNode;
  labels?: Record<string, string>;
  options: string[];
  showLessLabel?: string;
  showMoreLabel?: string;
  value: string;
  onChange: (value: string) => void;
}>) {
  const [expanded, setExpanded] = useState(false);
  const visibleOptions = options.length ? options : ["All"];
  const limit = collapsedLimit ?? visibleOptions.length;
  const canCollapse = visibleOptions.length > limit;
  const baseOptions = canCollapse && !expanded ? visibleOptions.slice(0, limit) : visibleOptions;
  const optionsToRender =
    canCollapse && !expanded && value !== "All" && !baseOptions.includes(value)
      ? [...baseOptions, value]
      : baseOptions;
  const hiddenCount = Math.max(visibleOptions.length - optionsToRender.length, 0);

  return (
    <div className="grid grid-cols-2 gap-2">
      {optionsToRender.map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          className={cn(
            "relative min-h-12 overflow-hidden rounded-2xl border px-3 py-2 text-left text-sm font-semibold transition",
            value === option
              ? "border-blue-400/55 bg-blue-500/15 text-white shadow-[0_0_28px_rgba(41,52,255,0.20)]"
              : "border-white/10 bg-black/25 text-slate-300 hover:border-white/20 hover:bg-white/[0.06] hover:text-white",
          )}
        >
          {value === option ? (
            <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
          ) : null}
          <span className="flex items-center gap-2.5">
            {iconForOption ? (
              <span
                className={cn(
                  "grid size-7 shrink-0 place-items-center rounded-xl border transition",
                  value === option
                    ? "border-blue-300/30 bg-blue-400/15 text-blue-100"
                    : "border-white/10 bg-white/[0.04] text-slate-400",
                )}
              >
                {iconForOption(option)}
              </span>
            ) : null}
            <span className="min-w-0 truncate">{labels[option] ?? option}</span>
          </span>
        </button>
      ))}
      {canCollapse ? (
        <button
          type="button"
          onClick={() => setExpanded((current) => !current)}
          className="relative min-h-12 overflow-hidden rounded-2xl border border-dashed border-white/15 bg-white/[0.025] px-3 py-2 text-left text-sm font-semibold text-slate-300 transition hover:border-blue-300/35 hover:bg-blue-500/10 hover:text-white"
        >
          <span className="flex items-center gap-2.5">
            <span className="grid size-7 shrink-0 place-items-center rounded-xl border border-white/10 bg-white/[0.04] text-slate-400">
              <IconFilter className="size-4" />
            </span>
            <span>
              {expanded
                ? showLessLabel ?? "Show less"
                : `${showMoreLabel ?? "Show more"}${hiddenCount > 0 ? ` (${hiddenCount})` : ""}`}
            </span>
          </span>
        </button>
      ) : null}
    </div>
  );
}

function getSortOptionIcon(option: string) {
  if (option === "newest") {
    return <IconClock className="size-4" />;
  }

  if (option === "rating") {
    return <IconStarFilled className="size-4" />;
  }

  if (option === "price-low") {
    return <IconArrowDown className="size-4" />;
  }

  if (option === "price-high") {
    return <IconArrowUp className="size-4" />;
  }

  return <IconFlame className="size-4" />;
}

function getSeasonOptionIcon(option: string) {
  const normalized = option.toLowerCase();

  if (normalized === "ss") {
    return <IconSun className="size-4" />;
  }

  if (normalized === "fw") {
    return <IconSnowflake className="size-4" />;
  }

  return <IconSparkles2Filled className="size-4" />;
}

function PriceRangeFilter({
  copy,
  maxPrice,
  minPrice,
  onChange,
}: Readonly<{
  copy: W2CCopy;
  maxPrice: string;
  minPrice: string;
  onChange: (value: Pick<Filters, "minPrice" | "maxPrice">) => void;
}>) {
  const priceActive = Boolean(minPrice || maxPrice);
  const maxValue = clampPrice(Number(maxPrice || priceSlider.max));
  const fillPercent =
    ((maxValue - priceSlider.min) / (priceSlider.max - priceSlider.min)) * 100;

  const updateMax = (value: string) => {
    const nextMax = clampPrice(Number(value));

    onChange({
      minPrice: "",
      maxPrice: nextMax >= priceSlider.max ? "" : String(nextMax),
    });
  };

  const clearRange = () => {
    onChange({ minPrice: "", maxPrice: "" });
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-white">
            {priceActive
              ? `${copy.filter.priceActive} ${maxValue >= priceSlider.max ? `${priceSlider.max}+` : maxValue} CNY`
              : copy.filter.priceAny}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {copy.filter.priceDescription}
          </p>
        </div>
        <button
          type="button"
          onClick={clearRange}
          className="shrink-0 rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-300 transition hover:border-white/20 hover:bg-white/[0.08] hover:text-white"
        >
          {copy.filter.clear}
        </button>
      </div>

      <div className="relative h-10">
        <div className="absolute left-0 right-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-white/[0.07]" />
        <div
          className="absolute left-0 top-1/2 h-2 -translate-y-1/2 rounded-full bg-gradient-to-r from-blue-500 to-cyan-300 shadow-[0_0_24px_rgba(41,52,255,0.35)]"
          style={{
            width: `${fillPercent}%`,
          }}
        />
        <input
          type="range"
          min={priceSlider.min}
          max={priceSlider.max}
          step={priceSlider.step}
          value={maxValue}
          onChange={(event) => updateMax(event.target.value)}
          aria-label={copy.filter.priceTitle}
          className="absolute inset-x-0 top-1/2 h-8 -translate-y-1/2 cursor-pointer bg-transparent accent-cyan-300"
        />
      </div>

      <div className="mt-3 flex items-center justify-between text-xs font-semibold text-slate-500">
        <span>{priceSlider.min} CNY</span>
        <span>{priceSlider.max}+ CNY</span>
      </div>
    </div>
  );
}

function clampPrice(value: number) {
  if (!Number.isFinite(value)) {
    return priceSlider.min;
  }

  return Math.min(priceSlider.max, Math.max(priceSlider.min, value));
}

function addOptionalParam(params: URLSearchParams, key: string, value: string) {
  if (value.trim()) {
    params.set(key, value.trim());
  }
}

function formatCompact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    compactDisplay: "short",
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}
