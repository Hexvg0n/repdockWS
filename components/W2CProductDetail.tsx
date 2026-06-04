"use client";

import SmartImage from "@/components/SmartImage";
import {
  IconCameraSearch,
  IconCheck,
  IconChevronLeft,
  IconChevronRight,
  IconExternalLink,
  IconHeart,
  IconHeartFilled,
  IconLoader2,
  IconPackage,
  IconPhoto,
  IconTag,
  IconTruckDelivery,
  IconX,
} from "@tabler/icons-react";
import Link from "next/link";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";

import { LoginRequiredDialog } from "@/components/LoginRequiredDialog";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import { currencies, fallbackCurrencyRates, formatPrice, readClientRate } from "@/lib/currency";
import {
  settingsStorageKey,
  useLanguageCopy,
  useRepdockLanguage,
} from "@/lib/use-repdock-language";
import { cn } from "@/lib/utils";
import type { W2CBBDBuyProductDetails, W2CBBDBuySkuProp, W2CProduct } from "@/types/w2c";

const agents = ["BBDBUY", "KAKOBUY", "USFANS", "ACBUY"] as const;
const collapsedVariantLimit = 12;

const agentLogos: Record<(typeof agents)[number], string> = {
  BBDBUY: "/agents/BBDBUY_icon.png",
  KAKOBUY: "/agents/kako_icon.png",
  USFANS: "/agents/usfans_icon.png",
  ACBUY: "/agents/acb_icon.png",
};

const productDetailCopy = {
  PL: {
    back: "Wroc do W2C",
    buyNowWith: "Kup teraz przez",
    delivery: "Dostawa",
    detailImages: "Opis produktu",
    favorite: "Przelacz ulubione",
    favoriteError: "Nie udalo sie zapisac ulubionych.",
    favoriteLoginAction: "Zaloguj przez Discord",
    favoriteLoginClose: "Zamknij",
    favoriteLoginDescription: "Ulubione sa zapisywane na Twoim koncie, dlatego musisz byc zalogowany.",
    favoriteLoginTitle: "Zaloguj sie, zeby zapisac item",
    gender: {
      men: "Meskie",
      neutral: "Unisex",
      women: "Damskie",
    },
    gallery: "Galeria",
    liveUnavailable: "Live warianty z BBDBuy sa chwilowo niedostepne. Mozesz nadal przejsc do agenta.",
    originalProduct: "Oryginalny produkt",
    price: "Cena",
    quickQc: {
      close: "Zamknij podglad",
      description: "Sprawdz zdjecia magazynowe dla tego produktu bez wychodzenia z karty.",
      error: "Nie udalo sie pobrac QC.",
      found: "zdjec QC",
      group: "Grupa QC",
      loading: "Szukam QC",
      next: "Nastepne zdjecie",
      noPhotos: "Brak QC dla tego produktu.",
      of: "z",
      previous: "Poprzednie zdjecie",
      refresh: "Odswiez QC",
      search: "Szybkie QC",
      title: "Quick QC",
    },
    seller: "Sprzedawca",
    settingsFollow: "Agent i waluta korzystaja z Twoich Ustawien.",
    showAllVariants: "Pokaz wszystkie",
    showLessVariants: "Zwin",
    stock: {
      available: "Dostepne",
      label: "Stock",
      out: "Brak stocku",
      total: "Laczny stock",
    },
    variants: "Warianty",
    weight: "Waga",
  },
  EN: {
    back: "Back to W2C",
    buyNowWith: "Buy Now with",
    delivery: "Delivery",
    detailImages: "Product details",
    favorite: "Toggle favorite",
    favoriteError: "Could not save favorites.",
    favoriteLoginAction: "Login with Discord",
    favoriteLoginClose: "Close",
    favoriteLoginDescription: "Favorites are saved to your account, so you need to be logged in.",
    favoriteLoginTitle: "Login to save this item",
    gender: {
      men: "Men",
      neutral: "Unisex",
      women: "Women",
    },
    gallery: "Gallery",
    liveUnavailable: "Live BBDBuy variants are temporarily unavailable. You can still open the agent link.",
    originalProduct: "Original product",
    price: "Price",
    quickQc: {
      close: "Close preview",
      description: "Check warehouse QC photos for this product without leaving the page.",
      error: "Could not load QC photos.",
      found: "QC photos",
      group: "QC group",
      loading: "Searching QC",
      next: "Next photo",
      noPhotos: "No QC photos found.",
      of: "of",
      previous: "Previous photo",
      refresh: "Refresh QC",
      search: "Quick QC",
      title: "Quick QC",
    },
    seller: "Seller",
    settingsFollow: "Agent and currency follow your Settings.",
    showAllVariants: "Show all",
    showLessVariants: "Collapse",
    stock: {
      available: "Available",
      label: "Stock",
      out: "Out of stock",
      total: "Total stock",
    },
    variants: "Variants",
    weight: "Weight",
  },
} as const;

type ProductDetailCopy = (typeof productDetailCopy)[keyof typeof productDetailCopy];

export function W2CProductDetail({
  bbdbuyDetails,
  product,
}: {
  bbdbuyDetails?: W2CBBDBuyProductDetails | null;
  product: W2CProduct;
}) {
  const copy = useLanguageCopy(productDetailCopy);
  const language = useRepdockLanguage();
  const numberLocale = language === "PL" ? "pl" : "en";
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("CNY");
  const [rates, setRates] = useState(fallbackCurrencyRates);
  const [agent, setAgent] = useState<(typeof agents)[number]>("BBDBUY");
  const [favorite, setFavorite] = useState(false);
  const [favoriteLoginOpen, setFavoriteLoginOpen] = useState(false);
  const [favoriteStatus, setFavoriteStatus] = useState("");
  const recordedViewRef = useRef(false);

  const galleryImages = useMemo(
    () =>
      uniqueImages([
        product.image,
        ...(bbdbuyDetails?.imgList ?? []),
        ...(bbdbuyDetails?.skuList
          .map((sku) => sku.image)
          .filter((image): image is string => Boolean(image)) ?? []),
      ]),
    [bbdbuyDetails, product.image],
  );
  const initialSelection = useMemo(() => buildInitialSelection(bbdbuyDetails), [bbdbuyDetails]);
  const [selectedValues, setSelectedValues] = useState<Record<string, string>>(initialSelection);
  const [selectedImage, setSelectedImage] = useState(galleryImages[0] ?? product.image);
  const selectedSku = useMemo(
    () => findMatchingSku(bbdbuyDetails, selectedValues),
    [bbdbuyDetails, selectedValues],
  );
  const detailImages = bbdbuyDetails?.detailImages ?? [];
  const productName = bbdbuyDetails?.titleTrans || bbdbuyDetails?.title || product.name;
  const selectedPrice = selectedSku?.priceCny ?? bbdbuyDetails?.priceCny ?? product.priceCny;
  const selectedStock = selectedSku?.stock ?? bbdbuyDetails?.totalStock ?? 0;
  const link = product.links[agent] ?? product.links.original;

  useEffect(() => {
    setSelectedValues(initialSelection);
  }, [initialSelection]);

  useEffect(() => {
    setSelectedImage(galleryImages[0] ?? product.image);
  }, [galleryImages, product.image]);

  useEffect(() => {
    if (selectedSku?.image) {
      setSelectedImage(selectedSku.image);
    }
  }, [selectedSku?.image]);

  useEffect(() => {
    const loadSettings = () => {
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

    const loadFavorite = async () => {
      try {
        const response = await fetch("/api/w2c/favorites");

        if (cancelled) {
          return;
        }

        if (response.status === 401) {
          setFavorite(false);
          return;
        }

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as { productIds?: string[] };
        setFavorite(Boolean(data.productIds?.includes(product.id)));
      } catch {
        if (!cancelled) {
          setFavorite(false);
        }
      }
    };

    void loadFavorite();

    const onFavoritesUpdated = () => {
      void loadFavorite();
    };

    globalThis.addEventListener("repdock-favorites-updated", onFavoritesUpdated);

    return () => {
      cancelled = true;
      globalThis.removeEventListener("repdock-favorites-updated", onFavoritesUpdated);
    };
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
      .catch(() => undefined);
  }, [product.id]);

  const toggleFavorite = async () => {
    setFavoriteStatus("");

    try {
      const response = await fetch("/api/w2c/favorites", {
        body: JSON.stringify({ productId: product.id }),
        headers: { "Content-Type": "application/json" },
        method: favorite ? "DELETE" : "POST",
      });

      if (response.status === 401) {
        setFavoriteLoginOpen(true);
        return;
      }

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setFavorite((current) => !current);
      globalThis.dispatchEvent(new Event("repdock-favorites-updated"));
    } catch {
      setFavoriteStatus(copy.favoriteError);
    }
  };

  const recordBuy = () => {
    void fetch(`/api/w2c/${encodeURIComponent(product.id)}/interaction`, {
      body: JSON.stringify({ type: "buy" }),
      headers: { "Content-Type": "application/json" },
      method: "POST",
      keepalive: true,
    })
      .catch(() => undefined);
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_70%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[430px] overflow-hidden opacity-45 [mask-image:linear-gradient(to_bottom,black,transparent_88%)]">
        <SmartImage
          src="https://framerusercontent.com/images/eVPQSYBoVqwchmpN78sjyYtovY.svg?width=513&height=272"
          width="513"
          height="272"
          alt=""
          decoding="async"
          className="h-full w-full object-cover object-center"
        />
      </div>
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.025)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.025)_1px,transparent_1px)] bg-[size:120px_120px] opacity-25 [mask-image:linear-gradient(to_bottom,transparent,black_20%,transparent_70%)]" />

      <section className="relative mx-auto w-full max-w-7xl">
        <Link
          href="/w2c"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 backdrop-blur-xl transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconChevronLeft className="size-4" />
          {copy.back}
        </Link>

        <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_440px] lg:items-start">
          <div className="order-2 grid min-w-0 gap-5 lg:order-1">
            <section className="rounded-[32px] border border-white/10 bg-[#0d0e14] p-3 shadow-2xl shadow-black/30">
              <div className="grid min-h-[560px] place-items-center overflow-hidden rounded-[24px] bg-zinc-900">
                <SmartImage
                  src={getWebpImageUrl(selectedImage)}
                  alt={productName}
                  className="max-h-[620px] w-full object-contain p-4"
                />
              </div>
            </section>

            <section className="grid gap-3">
              <h2 className="text-sm font-semibold uppercase tracking-[0.16em] text-slate-500">
                {copy.gallery}
              </h2>
              <div className="flex gap-3 overflow-x-auto pb-2">
                {galleryImages.map((image) => (
                  <button
                    key={image}
                    type="button"
                    onClick={() => setSelectedImage(image)}
                    className={cn(
                      "grid size-20 shrink-0 place-items-center overflow-hidden rounded-2xl border bg-white/[0.04] transition",
                      selectedImage === image
                        ? "border-blue-300/70 shadow-[0_0_28px_rgba(41,52,255,0.25)]"
                        : "border-white/10 hover:border-white/25",
                    )}
                  >
                    <SmartImage src={getWebpImageUrl(image)} alt="" className="h-full w-full object-cover" />
                  </button>
                ))}
              </div>
            </section>

            {detailImages.length > 0 ? (
              <ProductDetailImages copy={copy} images={detailImages} />
            ) : null}
          </div>

          <aside className="order-1 grid gap-4 rounded-[32px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/30 backdrop-blur-xl lg:order-2 lg:sticky lg:top-28">
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <div className="flex flex-wrap gap-2">
                  <MetaBadge icon={<IconTag className="size-3.5" />} value={product.metadata.category} />
                  <MetaBadge value={formatGender(product.metadata.gender, copy.gender)} />
                  <MetaBadge value={product.metadata.season} />
                </div>
                <h1 className="mt-4 font-['Poppins'] text-3xl font-medium leading-tight text-white">
                  {productName}
                </h1>
              </div>
              <button
                type="button"
                onClick={toggleFavorite}
                className="grid size-11 shrink-0 place-items-center rounded-2xl border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
                aria-label={copy.favorite}
              >
                {favorite ? <IconHeartFilled className="size-5 text-red-400" /> : <IconHeart className="size-5" />}
              </button>
            </div>

            {favoriteStatus ? (
              <div className="rounded-2xl border border-red-400/20 bg-red-500/10 px-4 py-3 text-sm text-red-100">
                {favoriteStatus}
              </div>
            ) : null}

            <div className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.price}</p>
              <p className="text-4xl font-black text-white">{formatPrice(selectedPrice, currency, rates)}</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <SmallInfo
                icon={<IconPackage className="size-4" />}
                label={copy.stock.label}
                value={selectedStock > 0 ? `${formatCompact(selectedStock, numberLocale)} ${copy.stock.available}` : copy.stock.out}
              />
              <SmallInfo
                icon={<IconTruckDelivery className="size-4" />}
                label={bbdbuyDetails?.daysToArrival ? copy.delivery : copy.weight}
                value={bbdbuyDetails?.daysToArrival ? `${bbdbuyDetails.daysToArrival}d` : `${product.metadata.weight}g`}
              />
            </div>

            <QuickQCPanel copy={copy} productUrl={product.links.original} />

            {bbdbuyDetails ? (
              <VariantPicker
                copy={copy}
                details={bbdbuyDetails}
                selectedValues={selectedValues}
                onSelect={(propId, valueId) =>
                  setSelectedValues((current) => ({
                    ...current,
                    [propId]: valueId,
                  }))
                }
              />
            ) : (
              <div className="rounded-3xl border border-dashed border-white/10 bg-black/25 p-4 text-sm leading-relaxed text-slate-400">
                {copy.liveUnavailable}
              </div>
            )}

            <div className="grid gap-3 pt-2">
              <a
                href={link}
                target="_blank"
                rel="noreferrer"
                onClick={recordBuy}
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-blue-100"
              >
                <SmartImage src={agentLogos[agent]} alt="" className="size-5 rounded-md object-contain" />
                {copy.buyNowWith} {agent}
              </a>
              <div className="grid grid-cols-2 gap-3">
                <a
                  href={bbdbuyDetails?.productUrl || product.links.original}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-slate-200 transition hover:bg-white/[0.08] hover:text-white"
                >
                  <IconExternalLink className="size-4" />
                  {copy.originalProduct}
                </a>
                <span className="inline-flex h-11 items-center justify-center rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-center text-xs font-semibold text-slate-500">
                  {copy.settingsFollow}
                </span>
              </div>
            </div>

            {bbdbuyDetails?.seller ? (
              <div className="rounded-3xl border border-white/10 bg-black/25 p-4 text-sm">
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{copy.seller}</p>
                <a
                  href={bbdbuyDetails.seller.shopUrl || undefined}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-2 inline-flex items-center gap-2 font-semibold text-white hover:text-blue-100"
                >
                  {bbdbuyDetails.seller.shopName}
                  <IconExternalLink className="size-4 text-slate-500" />
                </a>
              </div>
            ) : null}
          </aside>
        </div>
      </section>
      <LoginRequiredDialog
        open={favoriteLoginOpen}
        title={copy.favoriteLoginTitle}
        description={copy.favoriteLoginDescription}
        actionLabel={copy.favoriteLoginAction}
        closeLabel={copy.favoriteLoginClose}
        onClose={() => setFavoriteLoginOpen(false)}
      />
    </main>
  );
}

type QuickQCImage = {
  createTime: string | number | null;
  photoUrl: string;
  skuId: string | null;
  source: string;
};

type QuickQCGroup = {
  dateLabel: string;
  id: string;
  images: QuickQCImage[];
  source: string;
  title: string;
};

function QuickQCPanel({
  copy,
  productUrl,
}: {
  copy: ProductDetailCopy;
  productUrl: string;
}) {
  const [loading, setLoading] = useState(false);
  const [images, setImages] = useState<QuickQCImage[]>([]);
  const [error, setError] = useState("");
  const [searched, setSearched] = useState(false);
  const [viewer, setViewer] = useState<{ groupId: string; imageIndex: number; zoomed: boolean } | null>(null);
  const requestedUrlRef = useRef<string | null>(null);
  const quickQcLanguage = useRepdockLanguage();
  const dateLocale = quickQcLanguage === "PL" ? "pl" : "en";
  const groups = useMemo(() => groupQuickQCImages(images, dateLocale), [dateLocale, images]);
  const activeGroup = groups.find((group) => group.id === viewer?.groupId) ?? null;
  const activeImage = activeGroup?.images[viewer?.imageIndex ?? 0] ?? null;

  const searchQuickQc = async () => {
    setLoading(true);
    setError("");
    setSearched(true);

    try {
      const response = await fetch("/api/qc", {
        body: JSON.stringify({ url: productUrl }),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });
      const data = (await response.json()) as { data?: QuickQCImage[]; error?: string };

      if (!response.ok) {
        throw new Error(data.error || copy.quickQc.error);
      }

      setImages(data.data ?? []);
    } catch (quickQcError) {
      setImages([]);
      setError(quickQcError instanceof Error ? quickQcError.message : copy.quickQc.error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (requestedUrlRef.current === productUrl) {
      return;
    }

    requestedUrlRef.current = productUrl;
    void searchQuickQc();
  }, [productUrl]);

  return (
    <>
      <section className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="font-semibold text-white">{copy.quickQc.title}</h2>
            <p className="mt-1 text-sm leading-relaxed text-slate-500">{copy.quickQc.description}</p>
          </div>
          <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
            <IconCameraSearch className="size-5" />
          </span>
        </div>

        <div className="flex items-center justify-between gap-3">
          <p className="text-xs font-semibold text-slate-500">
            {loading
              ? copy.quickQc.loading
              : images.length > 0
                ? `${images.length} ${copy.quickQc.found}`
                : searched
                  ? copy.quickQc.noPhotos
                  : copy.quickQc.search}
          </p>
          <button
            type="button"
            onClick={searchQuickQc}
            disabled={loading}
            className="inline-flex h-9 items-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-xs font-bold text-blue-100 transition hover:bg-white/[0.08] disabled:cursor-not-allowed disabled:opacity-70"
          >
            {loading ? <IconLoader2 className="size-3.5 animate-spin" /> : <IconCameraSearch className="size-3.5" />}
            {copy.quickQc.refresh}
          </button>
        </div>

        {images.length > 0 ? (
          <div className="grid gap-2">
            <div className="grid grid-cols-4 gap-2">
              {images.slice(0, 4).map((image, index) => {
                const target = getQuickQCViewerTarget(groups, image.photoUrl);

                return (
                  <button
                    key={image.photoUrl}
                    type="button"
                    onClick={() => {
                      if (target) {
                        setViewer({ ...target, zoomed: false });
                      }
                    }}
                    className="group relative aspect-square overflow-hidden rounded-2xl border border-white/10 bg-white/[0.035] transition hover:border-blue-300/40 hover:shadow-[0_0_26px_rgba(41,52,255,0.18)]"
                  >
                    <SmartImage
                      src={image.photoUrl}
                      alt={`${image.source} QC`}
                      loading="lazy"
                      className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                    />
                    <span className="absolute inset-x-1 bottom-1 truncate rounded-xl bg-black/55 px-1.5 py-1 text-[10px] font-bold text-white/85 backdrop-blur">
                      {image.source}
                    </span>
                    {index === 3 && images.length > 4 ? (
                      <span className="absolute inset-0 grid place-items-center bg-black/55 text-sm font-black text-white backdrop-blur-[2px]">
                        +{images.length - 4}
                      </span>
                    ) : null}
                  </button>
                );
              })}
            </div>
          </div>
        ) : searched && !loading ? (
          <p className={cn("text-sm", error ? "text-red-200" : "text-slate-500")}>
            {error || copy.quickQc.noPhotos}
          </p>
        ) : null}
      </section>

      {activeGroup && activeImage && viewer ? (
        <QuickQCViewer
          copy={copy}
          group={activeGroup}
          image={activeImage}
          imageIndex={viewer.imageIndex}
          zoomed={viewer.zoomed}
          onClose={() => setViewer(null)}
          onSelect={(imageIndex) => setViewer({ groupId: activeGroup.id, imageIndex, zoomed: false })}
          onToggleZoom={() => setViewer({ ...viewer, zoomed: !viewer.zoomed })}
        />
      ) : null}
    </>
  );
}

function QuickQCViewer({
  copy,
  group,
  image,
  imageIndex,
  onClose,
  onSelect,
  onToggleZoom,
  zoomed,
}: {
  copy: ProductDetailCopy;
  group: QuickQCGroup;
  image: QuickQCImage;
  imageIndex: number;
  onClose: () => void;
  onSelect: (imageIndex: number) => void;
  onToggleZoom: () => void;
  zoomed: boolean;
}) {
  const [portalRoot, setPortalRoot] = useState<HTMLElement | null>(null);
  const previousIndex = imageIndex === 0 ? group.images.length - 1 : imageIndex - 1;
  const nextIndex = imageIndex === group.images.length - 1 ? 0 : imageIndex + 1;

  useEffect(() => {
    setPortalRoot(document.body);

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, []);

  const viewer = (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-black/80 p-4 backdrop-blur-md" onClick={onClose}>
      <div
        className="relative grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black lg:grid-cols-[minmax(0,1fr)_260px]"
        onClick={(event) => event.stopPropagation()}
      >
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-20 grid size-10 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
          aria-label={copy.quickQc.close}
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
                  aria-label={copy.quickQc.previous}
                >
                  <IconChevronLeft className="size-5" />
                </button>
                <button
                  type="button"
                  onClick={() => onSelect(nextIndex)}
                  className="absolute right-4 top-1/2 z-10 grid size-11 -translate-y-1/2 place-items-center rounded-2xl bg-black/60 text-white backdrop-blur transition hover:bg-black"
                  aria-label={copy.quickQc.next}
                >
                  <IconChevronRight className="size-5" />
                </button>
              </>
            ) : null}
            <button
              type="button"
              onClick={onToggleZoom}
              className={cn("grid h-full min-h-[420px] w-full place-items-center", zoomed ? "cursor-zoom-out" : "cursor-zoom-in")}
            >
              <SmartImage
                src={image.photoUrl}
                alt={`${image.source} QC`}
                className={cn(
                  "transition duration-300",
                  zoomed ? "max-h-none max-w-none scale-150 object-none" : "max-h-[74vh] max-w-full object-contain",
                )}
              />
            </button>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/10 p-4">
            <div>
              <p className="font-semibold text-white">{group.title}</p>
              <p className="text-sm text-slate-500">
                {group.source} / {group.dateLabel} / {imageIndex + 1} {copy.quickQc.of} {group.images.length}
              </p>
            </div>
            <a
              href={image.photoUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-10 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-blue-100"
            >
              <IconExternalLink className="size-4" />
              {copy.originalProduct}
            </a>
          </div>
        </div>

        <aside className="min-h-0 border-t border-white/10 bg-white/[0.025] p-4 lg:border-l lg:border-t-0">
          <div className="mb-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.quickQc.group}</p>
            <h3 className="mt-2 text-lg font-semibold text-white">{group.title}</h3>
            <p className="mt-1 text-sm text-slate-500">
              {group.images.length} {copy.quickQc.found}
            </p>
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

  return portalRoot ? createPortal(viewer, portalRoot) : null;
}

function VariantPicker({
  copy,
  details,
  selectedValues,
  onSelect,
}: {
  copy: ProductDetailCopy;
  details: W2CBBDBuyProductDetails;
  selectedValues: Record<string, string>;
  onSelect: (propId: string, valueId: string) => void;
}) {
  const [expandedProps, setExpandedProps] = useState<Set<string>>(new Set());

  const toggleProp = (propId: string) => {
    setExpandedProps((current) => {
      const next = new Set(current);

      if (next.has(propId)) {
        next.delete(propId);
      } else {
        next.add(propId);
      }

      return next;
    });
  };

  return (
    <section className="grid gap-4 rounded-3xl border border-white/10 bg-black/25 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="font-semibold text-white">{copy.variants}</h2>
        <span className="rounded-full bg-white/[0.05] px-3 py-1 text-xs font-semibold text-slate-400">
          {copy.stock.total}: {formatCompact(details.totalStock, "en")}
        </span>
      </div>

      {details.skuPropList.map((prop) => (
        <div key={prop.propId} className="grid gap-2.5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
              {formatPropName(prop)}
            </p>
            <span className="text-xs font-semibold text-slate-600">{prop.propValueList.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {getVisibleVariantValues(
              prop.propValueList,
              selectedValues[prop.propId],
              expandedProps.has(prop.propId),
            ).map((value) => {
              const valueImage = getValueImage(details, value.valueId);
              const active = selectedValues[prop.propId] === value.valueId;
              const available = isOptionAvailable(details, selectedValues, prop, value.valueId);

              return (
                <button
                  key={value.valueId}
                  type="button"
                  onClick={() => onSelect(prop.propId, value.valueId)}
                  disabled={!available && !active}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2 rounded-2xl border px-3 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-35",
                    active
                      ? "border-blue-300/70 bg-blue-500/20 text-white shadow-[0_0_24px_rgba(41,52,255,0.22)]"
                      : "border-white/10 bg-white/[0.04] text-slate-300 hover:border-white/25 hover:bg-white/[0.08] hover:text-white",
                  )}
                >
                  {valueImage ? (
                    <SmartImage src={valueImage} alt="" className="size-8 rounded-xl object-cover" />
                  ) : null}
                  <span>{value.valueNameTrans || value.valueName}</span>
                  {active ? <IconCheck className="size-4 text-blue-100" /> : null}
                </button>
              );
            })}
            {prop.propValueList.length > collapsedVariantLimit ? (
              <button
                type="button"
                onClick={() => toggleProp(prop.propId)}
                className="inline-flex min-h-11 items-center rounded-2xl border border-white/10 bg-white/[0.03] px-3 py-2 text-sm font-bold text-blue-100 transition hover:border-blue-300/40 hover:bg-blue-500/10"
              >
                {expandedProps.has(prop.propId)
                  ? copy.showLessVariants
                  : `${copy.showAllVariants} (${prop.propValueList.length})`}
              </button>
            ) : null}
          </div>
        </div>
      ))}
    </section>
  );
}

function ProductDetailImages({
  copy,
  images,
}: {
  copy: ProductDetailCopy;
  images: string[];
}) {
  return (
    <section className="grid gap-5">
      <div className="flex items-center gap-3">
        <span className="grid size-10 place-items-center rounded-2xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
          <IconPhoto className="size-5" />
        </span>
        <h2 className="font-['Poppins'] text-2xl font-medium text-white">{copy.detailImages}</h2>
      </div>
      <div className="grid w-full gap-4">
        {images.map((image) => (
          <div key={image} className="overflow-hidden rounded-[24px] border border-white/10 bg-[#0d0e14] shadow-2xl shadow-black/20">
            <SmartImage src={image} alt="" loading="lazy" className="w-full object-contain" />
          </div>
        ))}
      </div>
    </section>
  );
}

function MetaBadge({ icon, value }: { icon?: React.ReactNode; value: string }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-black/25 px-3 py-1 text-xs font-semibold text-slate-300">
      {icon}
      {value}
    </span>
  );
}

function SmallInfo({
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
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function buildInitialSelection(details?: W2CBBDBuyProductDetails | null) {
  if (!details) {
    return {};
  }

  const firstSku = details.skuList.find((sku) => sku.stock > 0) ?? details.skuList[0];

  return Object.fromEntries(
    details.skuPropList
      .map((prop, index) => [prop.propId, firstSku?.valueIdList[index] ?? prop.propValueList[0]?.valueId ?? ""])
      .filter((entry): entry is [string, string] => Boolean(entry[0] && entry[1])),
  );
}

function findMatchingSku(
  details: W2CBBDBuyProductDetails | null | undefined,
  selectedValues: Record<string, string>,
) {
  if (!details) {
    return null;
  }

  return (
    details.skuList.find((sku) =>
      details.skuPropList.every((prop) => {
        const selected = selectedValues[prop.propId];
        return !selected || sku.valueIdList.includes(selected);
      }),
    ) ?? null
  );
}

function isOptionAvailable(
  details: W2CBBDBuyProductDetails,
  selectedValues: Record<string, string>,
  prop: W2CBBDBuySkuProp,
  valueId: string,
) {
  return details.skuList.some((sku) => {
    if (sku.stock <= 0) {
      return false;
    }

    return details.skuPropList.every((currentProp) => {
      const selected = currentProp.propId === prop.propId ? valueId : selectedValues[currentProp.propId];
      return !selected || sku.valueIdList.includes(selected);
    });
  });
}

function getValueImage(details: W2CBBDBuyProductDetails, valueId: string) {
  return details.skuList.find((sku) => sku.valueIdList.includes(valueId) && sku.image)?.image ?? null;
}

function getVisibleVariantValues<Value extends { valueId: string }>(
  values: Value[],
  selectedValueId: string | undefined,
  expanded: boolean,
) {
  if (expanded || values.length <= collapsedVariantLimit) {
    return values;
  }

  const visible = values.slice(0, collapsedVariantLimit);

  if (selectedValueId && !visible.some((value) => value.valueId === selectedValueId)) {
    const selectedValue = values.find((value) => value.valueId === selectedValueId);

    if (selectedValue) {
      return [...visible.slice(0, collapsedVariantLimit - 1), selectedValue];
    }
  }

  return visible;
}

function getQuickQCViewerTarget(groups: QuickQCGroup[], photoUrl: string) {
  for (const group of groups) {
    const imageIndex = group.images.findIndex((image) => image.photoUrl === photoUrl);

    if (imageIndex >= 0) {
      return { groupId: group.id, imageIndex };
    }
  }

  return null;
}

function groupQuickQCImages(images: QuickQCImage[], locale: string) {
  const groupMap = new Map<string, QuickQCGroup>();

  for (const image of images) {
    const dateLabel = formatQuickQCDate(image.createTime, locale);
    const title = image.skuId?.trim() || "QC";
    const id = `${image.source}:${dateLabel}:${title}`;
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
      title,
    });
  }

  return Array.from(groupMap.values()).sort(
    (first, second) => getQuickQCTime(second.images[0]?.createTime) - getQuickQCTime(first.images[0]?.createTime),
  );
}

function getQuickQCTime(value: string | number | null | undefined) {
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

function formatQuickQCDate(value: string | number | null | undefined, locale: string) {
  const timestamp = getQuickQCTime(value);

  if (!timestamp) {
    return "QC";
  }

  return new Intl.DateTimeFormat(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(timestamp));
}

function formatPropName(prop: W2CBBDBuySkuProp) {
  return prop.propNameTrans || prop.propName || prop.propId;
}

function formatGender(value: string, labels: Record<string, string>) {
  return labels[value] ?? value;
}

function formatCompact(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    compactDisplay: "short",
    maximumFractionDigits: 1,
    notation: "compact",
  }).format(value);
}

function uniqueImages(values: Array<string | null | undefined>) {
  return Array.from(new Set(values.filter((value): value is string => Boolean(value?.trim()))));
}
