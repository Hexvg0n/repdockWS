"use client";

import SmartImage from "@/components/SmartImage";
import { Button } from "@/components/ui/button";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import { currencies, fallbackCurrencyRates, readClientRate, type CurrencyCode } from "@/lib/currency";
import {
  calculateShippingOptions,
  shippingLines,
  type ShippingAgent,
  type ShippingCalculationInput,
  type ShippingCalculationResult,
} from "@/lib/shipping-calculator";
import { settingsStorageKey, useLanguageCopy, useRepdockLanguage } from "@/lib/use-repdock-language";
import { cn } from "@/lib/utils";
import type { W2CProduct } from "@/types/w2c";
import {
  IconBoxSeam,
  IconCalculator,
  IconChevronDown,
  IconChevronUp,
  IconClock,
  IconHeart,
  IconHeartFilled,
  IconInfoCircle,
  IconLink,
  IconLoader2,
  IconPackage,
  IconPackageExport,
  IconPackageImport,
  IconPlus,
  IconRefresh,
  IconRulerMeasure,
  IconScale,
  IconShip,
  IconSparkles2Filled,
  IconTrash,
  IconTruckDelivery,
} from "@tabler/icons-react";
import type React from "react";
import { useEffect, useMemo, useState } from "react";

type CourierMeta = {
  icon: string;
  label: string;
};

type FavoritesResponse = {
  authenticated?: boolean;
  productIds?: string[];
  products?: W2CProduct[];
};

type ImportedCalculatorItem = {
  id: string;
  image: string;
  name: string;
  originalUrl: string;
  platform: string;
  priceCny: number;
  productId: string;
  weight: number;
};

type ProductLookupResponse = {
  imageUrl?: string;
  name?: string;
  originalUrl?: string;
  platform?: string;
  price?: number;
  productId?: string;
  weight?: number;
};

const favoritePreviewStorageKey = "repdock-w2c-favorites-preview";
const cartonWeight = 500;
const shippingBaseCurrency: CurrencyCode = "USD";
const visibleResultLimit = 5;

const agentIcons: Partial<Record<ShippingAgent, string>> = {
  Acbuy: "/agents/acb_icon.png?v=20260604c",
  BBDBUY: "/agents/BBDBUY_icon.png?v=20260604c",
  Boonbuy: "/agents/BoonBuy_icon.png",
  Kakobuy: "/agents/kako_icon.png",
  Litbuy: "/agents/litbuy_logo.jpg",
  Oopbuy: "/agents/oop_icon.png",
  USfans: "/agents/usfans_icon.png?v=20260604c",
};

const agentLabels: Record<ShippingAgent, string> = {
  Acbuy: "ACBuy",
  BBDBUY: "BBDBUY",
  Boonbuy: "BoonBuy",
  Kakobuy: "Kakobuy",
  Litbuy: "Litbuy",
  Oopbuy: "Oopbuy",
  USfans: "USFans",
};

const courierIcons: Record<string, CourierMeta> = {
  dhl: {
    icon: "/couriers/DHL.png",
    label: "DHL",
  },
  dpd: {
    icon: "/couriers/dpd.png",
    label: "DPD",
  },
  fedex: {
    icon: "/couriers/fedex.png",
    label: "FedEx",
  },
  inpost: {
    icon: "/couriers/inpost.png",
    label: "InPost",
  },
  poczta: {
    icon: "/couriers/poczta_polska.png",
    label: "Poczta Polska",
  },
  ups: {
    icon: "/couriers/ups.png",
    label: "UPS",
  },
};

const quickWeights = [
  { label: "500 g", value: "500" },
  { label: "1 kg", value: "1000" },
  { label: "2 kg", value: "2000" },
  { label: "5 kg", value: "5000" },
  { label: "10 kg", value: "10000" },
];

const calculatorCopy = {
  EN: {
    actions: {
      calculate: "Calculate",
      clearSelection: "Clear",
      login: "Login with Discord",
      reset: "Reset",
      selectAll: "Select all",
      showLess: "Show less",
      showMore: "Show all options",
    },
    empty: {
      description:
        "Enter weight manually or select favorite W2C items, then run the calculation to compare the cheapest shipping lines.",
      title: "Build a parcel first",
    },
    favorites: {
      empty: "You do not have favorite W2C items yet.",
      login: "Favorites are available after login.",
      loading: "Loading favorites",
      selected: "selected",
      title: "Favorite items",
    },
    linkItems: {
      add: "Add item",
      empty: "Paste a marketplace or agent link to add an item without saving it to favorites.",
      error: "Could not import this item.",
      inputLabel: "Product link",
      inputPlaceholder: "Paste Weidian, Taobao, 1688 or agent link",
      loading: "Fetching item",
      remove: "Remove",
      selected: "selected from links",
      success: "Item imported and selected.",
      title: "Items from link",
      unknownName: "Imported item",
      weightMissing: "Weight missing",
    },
    header: {
      badge: "Shipping calculator",
      description:
        "Select saved items or type parcel weight, then compare the cheapest agent shipping lines in one clean step.",
      note: "Selected favorites add their stored item weights plus 500 g for the carton.",
      noteTitle: "Favorite items workflow",
      title: "Calculate shipping cost",
    },
    labels: {
      actualWeight: "Actual weight",
      availableRoutes: "Available routes",
      billableWeight: "Billable weight",
      beforeDiscount: "Before discount",
      carton: "Carton",
      cheapest: "Cheapest route",
      continued: "Continued",
      dimensions: "Dimensions",
      discount: "Discount",
      extraWeight: "Manual weight",
      fees: "Fees",
      first: "First",
      height: "Height",
      hiddenRoutes: "hidden by weight limits",
      itemsWeight: "Items weight",
      length: "Length",
      limit: "Limit",
      noRoutes:
        "No route matches this weight. Try lowering package weight or changing dimensions.",
      optional: "optional",
      pending:
        "Results will appear here after calculation. The first view shows the 5 cheapest options.",
      routeDetails: "Route details",
      routes: "routes",
      tableAmount: "Final amount",
      time: "Time",
      totalWeight: "Total weight",
      volumeWeight: "Volume weight",
      volumetric: "volumetric",
      weight: "Weight",
      width: "Width",
    },
    placeholders: {
      grams: "grams",
    },
  },
  PL: {
    actions: {
      calculate: "Oblicz",
      clearSelection: "Wyczyść",
      login: "Zaloguj przez Discord",
      reset: "Resetuj",
      selectAll: "Zaznacz wszystko",
      showLess: "Pokaż mniej",
      showMore: "Pokaż wszystkie opcje",
    },
    empty: {
      description:
        "Wpisz wagę ręcznie albo zaznacz ulubione itemy W2C, a potem uruchom kalkulację najtańszych linii.",
      title: "Zbuduj paczkę",
    },
    favorites: {
      empty: "Nie masz jeszcze ulubionych itemów W2C.",
      login: "Ulubione są dostępne po zalogowaniu.",
      loading: "Ładowanie ulubionych",
      selected: "zaznaczone",
      title: "Ulubione itemy",
    },
    linkItems: {
      add: "Dodaj item",
      empty: "Wklej link marketplace albo agenta, żeby dodać item bez zapisywania go w ulubionych.",
      error: "Nie udało się zaimportować tego itemu.",
      inputLabel: "Link produktu",
      inputPlaceholder: "Wklej link Weidian, Taobao, 1688 albo agenta",
      loading: "Pobieranie itemu",
      remove: "Usuń",
      selected: "zaznaczone z linków",
      success: "Item zaimportowany i zaznaczony.",
      title: "Itemy z linku",
      unknownName: "Zaimportowany item",
      weightMissing: "Brak wagi",
    },
    header: {
      badge: "Kalkulator wysyłki",
      description:
        "Zaznacz zapisane itemy albo wpisz wagę paczki, a potem porównaj najtańsze linie agentów jednym kliknięciem.",
      note: "Zaznaczone ulubione dodają wagę itemów z bazy oraz 500 g na karton.",
      noteTitle: "Workflow z ulubionymi",
      title: "Oblicz koszt wysyłki",
    },
    labels: {
      actualWeight: "Waga realna",
      availableRoutes: "Dostępne trasy",
      billableWeight: "Waga rozliczeniowa",
      beforeDiscount: "Przed zniżką",
      carton: "Karton",
      cheapest: "Najtańsza trasa",
      continued: "Kolejne",
      dimensions: "Wymiary",
      discount: "Zniżka",
      extraWeight: "Waga ręczna",
      fees: "Opłaty",
      first: "Pierwsze",
      height: "Wysokość",
      hiddenRoutes: "ukryte przez limity wagi",
      itemsWeight: "Waga itemów",
      length: "Długość",
      limit: "Limit",
      noRoutes:
        "Brak trasy dla tej wagi. Spróbuj zmniejszyć wagę paczki albo zmienić wymiary.",
      optional: "opcjonalne",
      pending:
        "Wyniki pojawią się tutaj po kliknięciu obliczania. Najpierw pokazujemy 5 najtańszych opcji.",
      routeDetails: "Szczegóły trasy",
      routes: "tras",
      tableAmount: "Cena po zniżce",
      time: "Czas",
      totalWeight: "Waga łączna",
      volumeWeight: "Waga objętościowa",
      volumetric: "objętościowa",
      weight: "Waga",
      width: "Szerokość",
    },
    placeholders: {
      grams: "gramy",
    },
  },
} as const;

type CalculatorCopy = (typeof calculatorCopy)[keyof typeof calculatorCopy];

export function CalculatorTool() {
  const copy = useLanguageCopy(calculatorCopy);
  const language = useRepdockLanguage();
  const [manualWeight, setManualWeight] = useState("");
  const [length, setLength] = useState("");
  const [width, setWidth] = useState("");
  const [height, setHeight] = useState("");
  const [favorites, setFavorites] = useState<W2CProduct[]>([]);
  const [favoritesAuthenticated, setFavoritesAuthenticated] = useState(true);
  const [favoritesLoading, setFavoritesLoading] = useState(true);
  const [selectedFavoriteIds, setSelectedFavoriteIds] = useState<Set<string>>(new Set());
  const [importedItems, setImportedItems] = useState<ImportedCalculatorItem[]>([]);
  const [importedLink, setImportedLink] = useState("");
  const [importedLookupLoading, setImportedLookupLoading] = useState(false);
  const [importedLookupStatus, setImportedLookupStatus] = useState<{
    text: string;
    tone: "error" | "success";
  } | null>(null);
  const [selectedImportedItemIds, setSelectedImportedItemIds] = useState<Set<string>>(new Set());
  const [results, setResults] = useState<ShippingCalculationResult[] | null>(null);
  const [calculationInput, setCalculationInput] = useState<ShippingCalculationInput | null>(null);
  const [showAllResults, setShowAllResults] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const [currency, setCurrency] = useState<CurrencyCode>("PLN");
  const [currencyRates, setCurrencyRates] = useState(fallbackCurrencyRates);

  const locale = language === "EN" ? "en-US" : "pl-PL";
  const selectedProducts = useMemo(
    () => favorites.filter((product) => selectedFavoriteIds.has(product.id)),
    [favorites, selectedFavoriteIds],
  );
  const selectedImportedItems = useMemo(
    () => importedItems.filter((item) => selectedImportedItemIds.has(item.id)),
    [importedItems, selectedImportedItemIds],
  );
  const selectedImportedItemsWeight = useMemo(
    () => selectedImportedItems.reduce((total, item) => total + item.weight, 0),
    [selectedImportedItems],
  );
  const selectedItemsWeight = useMemo(
    () =>
      selectedProducts.reduce((total, product) => total + getProductWeight(product), 0) +
      selectedImportedItemsWeight,
    [selectedImportedItemsWeight, selectedProducts],
  );
  const selectedItemsCount = selectedFavoriteIds.size + selectedImportedItemIds.size;
  const packageWeight = selectedItemsCount > 0 ? cartonWeight : 0;
  const extraWeight = parseNumber(manualWeight);
  const totalWeight = selectedItemsWeight + packageWeight + extraWeight;
  const currentInput = useMemo<ShippingCalculationInput>(
    () => ({
      height: parseOptionalNumber(height),
      length: parseOptionalNumber(length),
      weight: totalWeight,
      width: parseOptionalNumber(width),
    }),
    [height, length, totalWeight, width],
  );
  const bestResult = results?.[0] ?? null;
  const hiddenRoutes = results ? Math.max(shippingLines.length - results.length, 0) : 0;
  const visibleResults = results ? (showAllResults ? results : results.slice(0, visibleResultLimit)) : [];
  const remainingResults = results ? Math.max(results.length - visibleResultLimit, 0) : 0;
  const hasWeight = totalWeight > 0;

  useEffect(() => {
    setHydrated(true);

    const cachedFavorites = readFavoritePreviewCache();

    if (cachedFavorites.length) {
      setFavorites(cachedFavorites);
      setFavoritesLoading(false);
    }

    void loadFavorites();

    const onFavoritesUpdated = () => {
      void loadFavorites();
    };

    globalThis.addEventListener("repdock-favorites-updated", onFavoritesUpdated);
    globalThis.addEventListener("focus", onFavoritesUpdated);

    return () => {
      globalThis.removeEventListener("repdock-favorites-updated", onFavoritesUpdated);
      globalThis.removeEventListener("focus", onFavoritesUpdated);
    };
  }, []);

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(
          globalThis.localStorage.getItem(settingsStorageKey) ?? "{}",
        ) as { currency?: string };

        if (currencies.includes(savedSettings.currency as CurrencyCode)) {
          setCurrency(savedSettings.currency as CurrencyCode);
        }
      } catch {
        setCurrency("PLN");
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

    const loadCurrencyRates = async () => {
      try {
        const response = await fetch("/api/currency-rates");

        if (!response.ok) {
          return;
        }

        const data = (await response.json()) as {
          rates?: Partial<Record<CurrencyCode, number>>;
        };

        if (!cancelled && data.rates) {
          setCurrencyRates({
            CNY: 1,
            PLN: readClientRate(data.rates.PLN, fallbackCurrencyRates.PLN),
            USD: readClientRate(data.rates.USD, fallbackCurrencyRates.USD),
            EUR: readClientRate(data.rates.EUR, fallbackCurrencyRates.EUR),
          });
        }
      } catch {
        if (!cancelled) {
          setCurrencyRates(fallbackCurrencyRates);
        }
      }
    };

    void loadCurrencyRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const loadFavorites = async () => {
    setFavoritesLoading(true);

    try {
      const response = await fetch("/api/w2c/favorites?optional=1");

      if (!response.ok) {
        return;
      }

      const data = (await response.json()) as FavoritesResponse;
      const nextProducts = data.products ?? [];
      setFavoritesAuthenticated(data.authenticated !== false);
      setFavorites(nextProducts);
      setSelectedFavoriteIds((current) => {
        const availableIds = new Set(nextProducts.map((product) => product.id));
        return new Set([...current].filter((productId) => availableIds.has(productId)));
      });
    } finally {
      setFavoritesLoading(false);
    }
  };

  const calculate = () => {
    if (!hasWeight) {
      setResults(null);
      setCalculationInput(null);
      return;
    }

    const input = currentInput;
    setCalculationInput(input);
    setResults(calculateShippingOptions(input));
    setShowAllResults(false);
  };

  const reset = () => {
    setManualWeight("");
    setLength("");
    setWidth("");
    setHeight("");
    setSelectedFavoriteIds(new Set());
    setImportedItems([]);
    setImportedLink("");
    setImportedLookupStatus(null);
    setSelectedImportedItemIds(new Set());
    setResults(null);
    setCalculationInput(null);
    setShowAllResults(false);
  };

  const toggleFavoriteSelection = (productId: string) => {
    setSelectedFavoriteIds((current) => {
      const next = new Set(current);

      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }

      return next;
    });
  };

  const selectAllFavorites = () => {
    setSelectedFavoriteIds(new Set(favorites.map((product) => product.id)));
  };

  const importItemFromLink = async () => {
    const trimmedLink = importedLink.trim();

    if (!trimmedLink) {
      setImportedLookupStatus({ text: copy.linkItems.empty, tone: "error" });
      return;
    }

    setImportedLookupLoading(true);
    setImportedLookupStatus(null);

    try {
      const response = await fetch(`/api/w2c/lookup?url=${encodeURIComponent(trimmedLink)}`);

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as ProductLookupResponse;
      const productId = data.productId?.trim();
      const platform = data.platform?.trim() || "unknown";

      if (!productId) {
        throw new Error(copy.linkItems.error);
      }

      const importedItem: ImportedCalculatorItem = {
        id: `${platform}:${productId}`,
        image: data.imageUrl || "",
        name: data.name?.trim() || copy.linkItems.unknownName,
        originalUrl: data.originalUrl || trimmedLink,
        platform,
        priceCny: readPositiveNumber(data.price),
        productId,
        weight: Math.round(readPositiveNumber(data.weight)),
      };

      setImportedItems((current) => {
        const nextItems = current.filter((item) => item.id !== importedItem.id);
        return [importedItem, ...nextItems];
      });
      setSelectedImportedItemIds((current) => new Set(current).add(importedItem.id));
      setImportedLink("");
      setImportedLookupStatus({ text: copy.linkItems.success, tone: "success" });
    } catch (error) {
      setImportedLookupStatus({
        text: error instanceof Error && error.message ? error.message : copy.linkItems.error,
        tone: "error",
      });
    } finally {
      setImportedLookupLoading(false);
    }
  };

  const toggleImportedItemSelection = (itemId: string) => {
    setSelectedImportedItemIds((current) => {
      const next = new Set(current);

      if (next.has(itemId)) {
        next.delete(itemId);
      } else {
        next.add(itemId);
      }

      return next;
    });
  };

  const removeImportedItem = (itemId: string) => {
    setImportedItems((current) => current.filter((item) => item.id !== itemId));
    setSelectedImportedItemIds((current) => {
      const next = new Set(current);
      next.delete(itemId);
      return next;
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[640px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute left-[-18%] top-32 h-[520px] w-[520px] rotate-[-20deg] bg-[linear-gradient(90deg,transparent,rgba(41,52,255,0.24),transparent)] blur-3xl" />

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
                <IconInfoCircle className="size-6" />
              </span>
              <div>
                <p className="text-sm font-semibold text-white">{copy.header.noteTitle}</p>
                <p className="text-xs leading-relaxed text-slate-500">{copy.header.note}</p>
              </div>
            </div>
          </div>
        </div>

        <section className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_420px]">
          <div className="grid gap-4">
            <FavoritesSelector
              authenticated={favoritesAuthenticated}
              copy={copy}
              favorites={favorites}
              loading={favoritesLoading}
              selectedFavoriteIds={selectedFavoriteIds}
              onClear={() => setSelectedFavoriteIds(new Set())}
              onSelectAll={selectAllFavorites}
              onToggle={toggleFavoriteSelection}
            />

            <LinkItemsImporter
              copy={copy}
              importedItems={importedItems}
              inputValue={importedLink}
              loading={importedLookupLoading}
              selectedItemIds={selectedImportedItemIds}
              status={importedLookupStatus}
              onAdd={importItemFromLink}
              onInputChange={setImportedLink}
              onRemove={removeImportedItem}
              onToggle={toggleImportedItemSelection}
            />

            <ManualWeightPanel
              copy={copy}
              height={height}
              length={length}
              manualWeight={manualWeight}
              setHeight={setHeight}
              setLength={setLength}
              setManualWeight={setManualWeight}
              setWidth={setWidth}
              width={width}
            />
          </div>

          <SummaryPanel
            bestResult={bestResult}
            copy={copy}
            extraWeight={extraWeight}
            hiddenRoutes={hiddenRoutes}
            hydrated={hydrated}
            input={calculationInput ?? currentInput}
            locale={locale}
            currency={currency}
            currencyRates={currencyRates}
            packageWeight={packageWeight}
            resultsCount={results?.length ?? 0}
            selectedCount={selectedItemsCount}
            selectedItemsWeight={selectedItemsWeight}
            onCalculate={calculate}
            onReset={reset}
          />
        </section>

        <ResultsSection
          calculationInput={calculationInput}
          copy={copy}
          hiddenRoutes={hiddenRoutes}
          locale={locale}
          currency={currency}
          currencyRates={currencyRates}
          remainingResults={remainingResults}
          results={results}
          showAllResults={showAllResults}
          visibleResults={visibleResults}
          onToggleShowAll={() => setShowAllResults((current) => !current)}
        />
      </section>
    </main>
  );
}

function FavoritesSelector({
  authenticated,
  copy,
  favorites,
  loading,
  onClear,
  onSelectAll,
  onToggle,
  selectedFavoriteIds,
}: Readonly<{
  authenticated: boolean;
  copy: CalculatorCopy;
  favorites: W2CProduct[];
  loading: boolean;
  onClear: () => void;
  onSelectAll: () => void;
  onToggle: (productId: string) => void;
  selectedFavoriteIds: Set<string>;
}>) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.favorites.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {selectedFavoriteIds.size} {copy.favorites.selected}
          </h2>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            onClick={onSelectAll}
            type="button"
          >
            {copy.actions.selectAll}
          </button>
          <button
            className="h-10 rounded-2xl border border-white/10 bg-white/[0.04] px-3 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
            onClick={onClear}
            type="button"
          >
            {copy.actions.clearSelection}
          </button>
        </div>
      </div>

      {loading ? (
        <div className="grid min-h-40 place-items-center rounded-3xl border border-white/10 bg-black/25 text-slate-500">
          <IconLoader2 className="size-5 animate-spin" />
          <span className="sr-only">{copy.favorites.loading}</span>
        </div>
      ) : !authenticated ? (
        <div className="grid gap-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-slate-400 sm:grid-cols-[1fr_auto] sm:items-center">
          <p>{copy.favorites.login}</p>
          <a
            className="inline-flex h-11 items-center justify-center rounded-2xl bg-white px-4 text-sm font-bold text-black transition hover:bg-blue-100"
            href="/api/auth/discord/login"
          >
            {copy.actions.login}
          </a>
        </div>
      ) : favorites.length ? (
        <div className="grid max-h-[430px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {favorites.map((product) => (
            <FavoriteProductCard
              key={product.id}
              product={product}
              selected={selectedFavoriteIds.has(product.id)}
              onToggle={() => onToggle(product.id)}
            />
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-slate-500">
          {copy.favorites.empty}
        </div>
      )}
    </section>
  );
}

function LinkItemsImporter({
  copy,
  importedItems,
  inputValue,
  loading,
  onAdd,
  onInputChange,
  onRemove,
  onToggle,
  selectedItemIds,
  status,
}: Readonly<{
  copy: CalculatorCopy;
  importedItems: ImportedCalculatorItem[];
  inputValue: string;
  loading: boolean;
  onAdd: () => void;
  onInputChange: (value: string) => void;
  onRemove: (itemId: string) => void;
  onToggle: (itemId: string) => void;
  selectedItemIds: Set<string>;
  status: { text: string; tone: "error" | "success" } | null;
}>) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.linkItems.title}
          </p>
          <h2 className="mt-1 text-xl font-semibold text-white">
            {selectedItemIds.size} {copy.linkItems.selected}
          </h2>
        </div>
      </div>

      <form
        className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]"
        onSubmit={(event) => {
          event.preventDefault();
          onAdd();
        }}
      >
        <label className="block rounded-2xl border border-white/10 bg-black/25 p-3">
          <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
            <IconLink className="size-4" />
            {copy.linkItems.inputLabel}
          </span>
          <input
            className="w-full bg-transparent text-base font-semibold text-white outline-none placeholder:text-slate-700"
            onChange={(event) => onInputChange(event.target.value)}
            placeholder={copy.linkItems.inputPlaceholder}
            type="url"
            value={inputValue}
          />
        </label>
        <Button
          className="h-full min-h-16 rounded-2xl px-5"
          disabled={loading}
          type="submit"
        >
          {loading ? <IconLoader2 className="size-5 animate-spin" /> : <IconPlus className="size-5" />}
          {loading ? copy.linkItems.loading : copy.linkItems.add}
        </Button>
      </form>

      {status ? (
        <p
          className={cn(
            "mt-3 rounded-2xl border px-4 py-3 text-sm",
            status.tone === "success"
              ? "border-emerald-300/20 bg-emerald-500/10 text-emerald-100"
              : "border-red-300/20 bg-red-500/10 text-red-100",
          )}
        >
          {status.text}
        </p>
      ) : null}

      {importedItems.length ? (
        <div className="mt-4 grid max-h-[360px] gap-3 overflow-y-auto pr-1 sm:grid-cols-2 xl:grid-cols-3">
          {importedItems.map((item) => (
            <ImportedProductCard
              item={item}
              key={item.id}
              selected={selectedItemIds.has(item.id)}
              weightMissingText={copy.linkItems.weightMissing}
              onRemove={() => onRemove(item.id)}
              onToggle={() => onToggle(item.id)}
            />
          ))}
        </div>
      ) : (
        <div className="mt-4 rounded-3xl border border-white/10 bg-black/25 p-5 text-sm text-slate-500">
          {copy.linkItems.empty}
        </div>
      )}
    </section>
  );
}

function ImportedProductCard({
  item,
  onRemove,
  onToggle,
  selected,
  weightMissingText,
}: Readonly<{
  item: ImportedCalculatorItem;
  onRemove: () => void;
  onToggle: () => void;
  selected: boolean;
  weightMissingText: string;
}>) {
  return (
    <div
      className={cn(
        "grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border p-3 transition",
        selected
          ? "border-blue-300/40 bg-blue-500/15 shadow-[0_18px_55px_rgba(41,52,255,0.16)]"
          : "border-white/10 bg-black/25 hover:bg-white/[0.06]",
      )}
    >
      <button
        aria-pressed={selected}
        className="contents text-left"
        onClick={onToggle}
        type="button"
      >
        <span className="relative grid size-20 place-items-center overflow-hidden rounded-2xl bg-white/[0.05] ring-1 ring-white/10">
          {item.image ? (
            <SmartImage
              alt=""
              className="size-20 object-cover"
              src={getWebpImageUrl(item.image)}
            />
          ) : (
            <IconPackage className="size-7 text-slate-500" />
          )}
        </span>
        <span className="min-w-0">
          <span className="block truncate text-sm font-semibold text-white">{item.name}</span>
          <span className="mt-1 block truncate text-xs text-slate-500">
            {item.platform.toUpperCase()} / {item.productId}
          </span>
          <span className="mt-2 flex flex-wrap gap-2">
            <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
              {item.weight > 0 ? `${item.weight} g` : weightMissingText}
            </span>
            {item.priceCny > 0 ? (
              <span className="inline-flex rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
                {item.priceCny.toFixed(2)} CNY
              </span>
            ) : null}
          </span>
        </span>
      </button>
      <span className="grid gap-2">
        <button
          aria-label={selected ? "Deselect item" : "Select item"}
          className={cn(
            "grid size-10 place-items-center rounded-2xl ring-1 transition",
            selected ? "bg-red-500/15 text-red-300 ring-red-300/20" : "bg-white/[0.05] text-slate-500 ring-white/10",
          )}
          onClick={onToggle}
          type="button"
        >
          {selected ? <IconPackageExport className="size-5" /> : <IconPackageImport className="size-5" />}
        </button>
        <button
          aria-label="Remove imported item"
          className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-500 ring-1 ring-white/10 transition hover:bg-red-500/10 hover:text-red-200 hover:ring-red-300/20"
          onClick={onRemove}
          type="button"
        >
          <IconTrash className="size-5" />
        </button>
      </span>
    </div>
  );
}

function FavoriteProductCard({
  onToggle,
  product,
  selected,
}: Readonly<{
  onToggle: () => void;
  product: W2CProduct;
  selected: boolean;
}>) {
  return (
    <button
      aria-pressed={selected}
      className={cn(
        "grid grid-cols-[80px_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border p-3 text-left transition hover:-translate-y-0.5",
        selected
          ? "border-blue-300/40 bg-blue-500/15 shadow-[0_18px_55px_rgba(41,52,255,0.16)]"
          : "border-white/10 bg-black/25 hover:bg-white/[0.06]",
      )}
      onClick={onToggle}
      type="button"
    >
      <SmartImage
        alt=""
        className="size-20 rounded-2xl object-cover"
        src={getWebpImageUrl(product.image)}
      />
      <span className="min-w-0">
        <span className="block truncate text-sm font-semibold text-white">{product.name}</span>
        <span className="mt-1 block truncate text-xs text-slate-500">
          {product.metadata.brand} / {product.metadata.category}
        </span>
        <span className="mt-2 inline-flex rounded-full bg-white/[0.06] px-2 py-1 text-xs font-semibold text-slate-300">
          {getProductWeight(product)} g
        </span>
      </span>
      <span
        className={cn(
          "grid size-10 place-items-center rounded-2xl ring-1",
          selected ? "bg-red-500/15 text-red-300 ring-red-300/20" : "bg-white/[0.05] text-slate-500 ring-white/10",
        )}
      >
        {selected ? <IconHeartFilled className="size-5" /> : <IconHeart className="size-5" />}
      </span>
    </button>
  );
}

function ManualWeightPanel({
  copy,
  height,
  length,
  manualWeight,
  setHeight,
  setLength,
  setManualWeight,
  setWidth,
  width,
}: Readonly<{
  copy: CalculatorCopy;
  height: string;
  length: string;
  manualWeight: string;
  setHeight: (value: string) => void;
  setLength: (value: string) => void;
  setManualWeight: (value: string) => void;
  setWidth: (value: string) => void;
  width: string;
}>) {
  return (
    <section className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
      <div className="grid gap-4">
        <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto]">
          <LabeledInput
            icon={<IconScale className="size-5" />}
            label={copy.labels.extraWeight}
            min="0"
            onChange={setManualWeight}
            placeholder={copy.placeholders.grams}
            suffix="g"
            value={manualWeight}
          />
          <div className="flex flex-wrap gap-2 self-end">
            {quickWeights.map((preset) => (
              <button
                className={cn(
                  "h-12 rounded-2xl border px-4 text-sm font-semibold transition",
                  manualWeight === preset.value
                    ? "border-blue-300/40 bg-blue-500/15 text-blue-100"
                    : "border-white/10 bg-black/25 text-slate-400 hover:bg-white/[0.07] hover:text-white",
                )}
                key={preset.value}
                onClick={() => setManualWeight(preset.value)}
                type="button"
              >
                {preset.label}
              </button>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-3 flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-slate-300">{copy.labels.dimensions}</p>
            <span className="rounded-full bg-white/[0.05] px-2.5 py-1 text-xs text-slate-500">
              {copy.labels.optional}
            </span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            <LabeledInput
              icon={<IconRulerMeasure className="size-5" />}
              label={copy.labels.length}
              onChange={setLength}
              placeholder="cm"
              suffix="cm"
              value={length}
            />
            <LabeledInput
              icon={<IconRulerMeasure className="size-5" />}
              label={copy.labels.width}
              onChange={setWidth}
              placeholder="cm"
              suffix="cm"
              value={width}
            />
            <LabeledInput
              icon={<IconRulerMeasure className="size-5" />}
              label={copy.labels.height}
              onChange={setHeight}
              placeholder="cm"
              suffix="cm"
              value={height}
            />
          </div>
        </div>
      </div>
    </section>
  );
}

function SummaryPanel({
  bestResult,
  copy,
  currency,
  currencyRates,
  extraWeight,
  hiddenRoutes,
  hydrated,
  input,
  locale,
  onCalculate,
  onReset,
  packageWeight,
  resultsCount,
  selectedCount,
  selectedItemsWeight,
}: Readonly<{
  bestResult: ShippingCalculationResult | null;
  copy: CalculatorCopy;
  currency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  extraWeight: number;
  hiddenRoutes: number;
  hydrated: boolean;
  input: ShippingCalculationInput;
  locale: string;
  onCalculate: () => void;
  onReset: () => void;
  packageWeight: number;
  resultsCount: number;
  selectedCount: number;
  selectedItemsWeight: number;
}>) {
  const bestCourier = bestResult ? getCourierMeta(bestResult.line.name, bestResult.line.routeFeature) : null;

  return (
    <aside className="grid gap-3 rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5 lg:sticky lg:top-24 lg:self-start">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.labels.totalWeight}
          </p>
          <h2 className="mt-2 font-poppins text-4xl font-medium text-white">
            {formatInteger(input.weight, locale)} g
          </h2>
        </div>
        <Button
          className="h-11 rounded-2xl border-white/10 bg-white/[0.04] px-4 text-white hover:bg-white/[0.08]"
          onClick={onReset}
          type="button"
          variant="outline"
        >
          <IconRefresh className="size-4" />
          {copy.actions.reset}
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <MetricTile
          icon={<IconHeart className="size-5" />}
          label={copy.labels.itemsWeight}
          value={`${formatInteger(selectedItemsWeight, locale)} g`}
        />
        <MetricTile
          icon={<IconBoxSeam className="size-5" />}
          label={copy.labels.carton}
          value={`${formatInteger(packageWeight, locale)} g`}
        />
        <MetricTile
          icon={<IconScale className="size-5" />}
          label={copy.labels.extraWeight}
          value={`${formatInteger(extraWeight, locale)} g`}
        />
        <MetricTile
          icon={<IconPackage className="size-5" />}
          label={copy.labels.availableRoutes}
          value={`${resultsCount}`}
        />
      </div>

      {bestResult ? (
        <div className="rounded-3xl border border-blue-300/20 bg-blue-500/10 p-4">
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.labels.cheapest}
          </p>
          <div className="mt-3 flex items-center gap-3">
            <AgentIcon agent={bestResult.line.agent} />
            <div className="min-w-0">
              <p className="truncate font-semibold text-white">{bestResult.line.name}</p>
              <p className="text-sm text-slate-400">
                {agentLabels[bestResult.line.agent]} / {formatAmount(bestResult.price, locale, currency, currencyRates)}
              </p>
            </div>
            {bestCourier ? <CourierIcon courier={bestCourier} /> : null}
          </div>
        </div>
      ) : null}

      {hiddenRoutes > 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-3 text-xs text-slate-500">
          {hiddenRoutes} {copy.labels.hiddenRoutes}
        </p>
      ) : null}

      <Button
        className="h-14 rounded-2xl text-base"
        disabled={hydrated ? input.weight <= 0 : false}
        onClick={onCalculate}
        type="button"
      >
        <IconCalculator className="size-5" />
        {copy.actions.calculate}
      </Button>

      {selectedCount > 0 ? (
        <p className="text-center text-xs text-slate-500">
          {selectedCount} {copy.favorites.selected} + {formatInteger(cartonWeight, locale)} g {copy.labels.carton.toLowerCase()}
        </p>
      ) : null}
    </aside>
  );
}

function ResultsSection({
  calculationInput,
  copy,
  currency,
  currencyRates,
  hiddenRoutes,
  locale,
  onToggleShowAll,
  remainingResults,
  results,
  showAllResults,
  visibleResults,
}: Readonly<{
  calculationInput: ShippingCalculationInput | null;
  copy: CalculatorCopy;
  currency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  hiddenRoutes: number;
  locale: string;
  onToggleShowAll: () => void;
  remainingResults: number;
  results: ShippingCalculationResult[] | null;
  showAllResults: boolean;
  visibleResults: ShippingCalculationResult[];
}>) {
  if (!results) {
    return <EmptyCalculatorState copy={copy} />;
  }

  if (!calculationInput || results.length === 0) {
    return <NoRoutesState copy={copy} />;
  }

  return (
    <section className="grid gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.labels.availableRoutes}
          </p>
          <h2 className="mt-1 font-poppins text-3xl font-medium text-white">
            {results.length} {copy.labels.routes}
          </h2>
        </div>
        {hiddenRoutes > 0 ? (
          <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-xs font-semibold text-slate-400">
            {hiddenRoutes} {copy.labels.hiddenRoutes}
          </span>
        ) : null}
      </div>

      {visibleResults.map((result) => (
        <ShippingResultCard
          copy={copy}
          currency={currency}
          currencyRates={currencyRates}
          input={calculationInput}
          key={result.line.id}
          locale={locale}
          result={result}
        />
      ))}

      {remainingResults > 0 ? (
        <button
          className="mx-auto inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-white/[0.04] px-5 text-sm font-semibold text-white transition hover:bg-white/[0.08]"
          onClick={onToggleShowAll}
          type="button"
        >
          {showAllResults ? <IconChevronUp className="size-4" /> : <IconChevronDown className="size-4" />}
          {showAllResults ? copy.actions.showLess : `${copy.actions.showMore} (${remainingResults})`}
        </button>
      ) : null}
    </section>
  );
}

function ShippingResultCard({
  copy,
  currency,
  currencyRates,
  input,
  locale,
  result,
}: Readonly<{
  copy: CalculatorCopy;
  currency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  input: ShippingCalculationInput;
  locale: string;
  result: ShippingCalculationResult;
}>) {
  const courier = getCourierMeta(result.line.name, result.line.routeFeature);
  const usesVolume = result.volumeWeight !== null && result.volumeWeight > input.weight;

  return (
    <article className="grid gap-5 rounded-[32px] border border-white/10 bg-[#0d0e14] p-5 shadow-2xl shadow-black/20 transition hover:-translate-y-0.5 hover:border-blue-300/25 hover:shadow-[0_24px_80px_rgba(41,52,255,0.14)] lg:grid-cols-[minmax(0,1fr)_300px]">
      <div className="min-w-0">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3">
            <AgentIcon agent={result.line.agent} />
            <div className="min-w-0">
              <h2 className="truncate font-poppins text-xl font-medium text-white">{result.line.name}</h2>
              <p className="mt-1 text-sm text-slate-500">{agentLabels[result.line.agent]}</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {courier ? <CourierBadge courier={courier} /> : null}
            {usesVolume ? (
              <span className="rounded-full border border-amber-300/25 bg-amber-500/10 px-3 py-1.5 text-xs font-semibold text-amber-100">
                {copy.labels.volumetric}
              </span>
            ) : null}
          </div>
        </div>

        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <InfoChip
            icon={<IconClock className="size-4" />}
            label={copy.labels.time}
            value={result.line.time}
          />
          <InfoChip
            icon={<IconPackage className="size-4" />}
            label={copy.labels.billableWeight}
            value={`${formatInteger(result.billableWeight, locale)} g`}
          />
          <InfoChip
            icon={<IconScale className="size-4" />}
            label={copy.labels.first}
            value={`${formatInteger(result.line.firstWeight, locale)} g / ${formatAmount(result.line.firstPrice, locale, currency, currencyRates)}`}
          />
          <InfoChip
            icon={<IconCalculator className="size-4" />}
            label={copy.labels.continued}
            value={`${formatInteger(result.line.continuedWeight, locale)} g / ${formatAmount(result.line.continuedPrice, locale, currency, currencyRates)}`}
          />
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-2">
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {copy.labels.limit}
            </p>
            <p className="mt-2 text-sm leading-relaxed text-slate-300">{result.line.shippingLimit}</p>
          </div>
          <div className="rounded-3xl border border-white/10 bg-black/20 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">
              {copy.labels.routeDetails}
            </p>
            <p className="mt-2 line-clamp-3 text-sm leading-relaxed text-slate-300">
              {result.line.routeFeature}
            </p>
          </div>
        </div>
      </div>

      <aside className="grid content-between gap-4 rounded-[28px] border border-white/10 bg-black/25 p-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.16em] text-blue-200">
            {copy.labels.tableAmount}
          </p>
          <p className="mt-2 font-poppins text-3xl font-medium text-white sm:text-4xl">
            {formatAmount(result.price, locale, currency, currencyRates)}
          </p>
          {result.discount ? (
            <p className="mt-2 text-sm text-slate-500">
              <span>{copy.labels.beforeDiscount}: </span>
              <span className="line-through">
                {formatAmount(result.originalPrice, locale, currency, currencyRates)}
              </span>
              <span className="ml-2 rounded-full border border-emerald-300/20 bg-emerald-500/10 px-2 py-1 text-xs font-bold text-emerald-200">
                {result.discount.label}
              </span>
            </p>
          ) : null}
        </div>

        <div className="grid gap-2 text-sm">
          <PriceRow currency={currency} currencyRates={currencyRates} label={copy.labels.first} locale={locale} value={result.line.firstPrice} />
          <PriceRow
            currency={currency}
            currencyRates={currencyRates}
            label={`${copy.labels.continued} x${result.continuedUnits}`}
            locale={locale}
            value={result.continuedUnits * result.line.continuedPrice}
          />
          <PriceRow currency={currency} currencyRates={currencyRates} label={copy.labels.fees} locale={locale} value={result.line.fees} />
          {result.discountAmount > 0 ? (
            <PriceRow
              currency={currency}
              currencyRates={currencyRates}
              label={`${copy.labels.discount} ${result.discount?.label ?? ""}`.trim()}
              locale={locale}
              value={-result.discountAmount}
            />
          ) : null}
        </div>
      </aside>
    </article>
  );
}

function LabeledInput({
  icon,
  label,
  min,
  onChange,
  placeholder,
  suffix,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  min?: string;
  onChange: (value: string) => void;
  placeholder: string;
  suffix: string;
  value: string;
}>) {
  return (
    <label className="block rounded-2xl border border-white/10 bg-black/25 p-3">
      <span className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </span>
      <span className="flex items-center gap-2">
        <input
          className="min-w-0 flex-1 bg-transparent text-lg font-semibold text-white outline-none placeholder:text-slate-700"
          inputMode="decimal"
          min={min}
          onChange={(event) => onChange(event.target.value)}
          placeholder={placeholder}
          type="number"
          value={value}
        />
        <span className="shrink-0 rounded-xl bg-white/[0.06] px-2.5 py-1 text-xs font-semibold text-slate-400">
          {suffix}
        </span>
      </span>
    </label>
  );
}

function MetricTile({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.035] p-3">
      <span className="mb-3 grid size-9 place-items-center rounded-2xl bg-white/[0.05] text-blue-100 ring-1 ring-white/10">
        {icon}
      </span>
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function InfoChip({
  icon,
  label,
  value,
}: Readonly<{
  icon: React.ReactNode;
  label: string;
  value: string;
}>) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-3">
      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">
        {icon}
        {label}
      </div>
      <p className="mt-2 text-sm font-semibold text-white">{value}</p>
    </div>
  );
}

function PriceRow({
  currency,
  currencyRates,
  label,
  locale,
  value,
}: Readonly<{
  currency: CurrencyCode;
  currencyRates: Record<CurrencyCode, number>;
  label: string;
  locale: string;
  value: number;
}>) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl bg-white/[0.035] px-3 py-2">
      <span className="text-slate-500">{label}</span>
      <span className="font-semibold text-white">{formatAmount(value, locale, currency, currencyRates)}</span>
    </div>
  );
}

function CourierBadge({ courier }: Readonly<{ courier: CourierMeta }>) {
  return (
    <span className="inline-flex h-14 items-center gap-1 rounded-2xl border border-white/10 bg-white/[0.04] px-1.5 text-sm font-semibold text-white">
      <CourierIcon courier={courier} />
      {courier.label}
    </span>
  );
}

function AgentIcon({ agent }: Readonly<{ agent: ShippingAgent }>) {
  const iconSrc = agentIcons[agent];

  return (
    <span className="grid size-16 shrink-0 place-items-center rounded-[22px] bg-white ring-1 ring-white/10">
      <span className="relative block size-12 overflow-hidden rounded-2xl">
        {iconSrc ? (
          <SmartImage
            alt={`${agentLabels[agent]} logo`}
            className="object-contain"
            fill
            sizes="48px"
            src={iconSrc}
          />
        ) : (
          <span className="grid size-full place-items-center rounded-2xl bg-blue-600 text-2xl font-black text-white">
            {agentLabels[agent].slice(0, 1)}
          </span>
        )}
      </span>
    </span>
  );
}

function CourierIcon({ courier }: Readonly<{ courier: CourierMeta }>) {
  return (
    <span className="relative grid size-16 shrink-0 place-items-start overflow-hidden rounded-[12px]">
        <SmartImage
          alt={`${courier.label} logo`}
          className="object-contain"
          fill
          sizes="100px"
          src={courier.icon}
        />
    </span>
  );
}

function EmptyCalculatorState({ copy }: Readonly<{ copy: CalculatorCopy }>) {
  return (
    <div className="grid min-h-72 place-items-center rounded-[34px] border border-dashed border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-blue-500/15 text-blue-100 ring-1 ring-blue-300/20">
          <IconCalculator className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">{copy.empty.title}</h2>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">{copy.empty.description}</p>
        <p className="mt-4 rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-slate-400">
          {copy.labels.pending}
        </p>
      </div>
    </div>
  );
}

function NoRoutesState({ copy }: Readonly<{ copy: CalculatorCopy }>) {
  return (
    <div className="grid min-h-56 place-items-center rounded-[34px] border border-white/10 bg-white/[0.025] p-8 text-center">
      <div className="max-w-md">
        <span className="mx-auto grid size-14 place-items-center rounded-3xl bg-amber-500/15 text-amber-100 ring-1 ring-amber-300/20">
          <IconShip className="size-6" />
        </span>
        <h2 className="mt-5 text-xl font-semibold text-white">{copy.labels.noRoutes}</h2>
      </div>
    </div>
  );
}

function getCourierMeta(name: string, routeFeature: string) {
  const normalized = `${name} ${routeFeature}`.toLowerCase();

  if (normalized.includes("in-post") || normalized.includes("inpost")) {
    return courierIcons.inpost;
  }

  if (normalized.includes("poczta")) {
    return courierIcons.poczta;
  }

  if (normalized.includes("fedex")) {
    return courierIcons.fedex;
  }

  if (normalized.includes("ups")) {
    return courierIcons.ups;
  }

  if (normalized.includes("dpd")) {
    return courierIcons.dpd;
  }

  if (normalized.includes("dhl")) {
    return courierIcons.dhl;
  }

  return null;
}

function getProductWeight(product: W2CProduct) {
  const weight = Number(product.metadata.weight);
  return Number.isFinite(weight) && weight > 0 ? Math.round(weight) : 0;
}

function parseNumber(value: string) {
  const parsed = Number(value.replace(",", "."));
  return Number.isFinite(parsed) ? Math.max(0, parsed) : 0;
}

function readPositiveNumber(value: unknown) {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function parseOptionalNumber(value: string) {
  const parsed = parseNumber(value);
  return parsed > 0 ? parsed : undefined;
}

function formatAmount(
  valueUsd: number,
  locale: string,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
) {
  const converted = convertFromUsd(valueUsd, currency, rates);

  return new Intl.NumberFormat(locale, {
    currency,
    style: "currency",
    maximumFractionDigits: currency === "CNY" ? 0 : 2,
    minimumFractionDigits: currency === "CNY" ? 0 : 2,
  }).format(converted);
}

function convertFromUsd(
  valueUsd: number,
  currency: CurrencyCode,
  rates: Record<CurrencyCode, number>,
) {
  if (currency === shippingBaseCurrency) {
    return valueUsd;
  }

  const usdRate = rates.USD || fallbackCurrencyRates.USD;
  const cnyValue = valueUsd / usdRate;

  return cnyValue * (rates[currency] ?? fallbackCurrencyRates[currency]);
}

function formatInteger(value: number, locale: string) {
  return new Intl.NumberFormat(locale, {
    maximumFractionDigits: 0,
  }).format(value);
}

function readFavoritePreviewCache() {
  try {
    const rawValue = globalThis.localStorage?.getItem(favoritePreviewStorageKey);

    if (!rawValue) {
      return [];
    }

    const parsedValue = JSON.parse(rawValue) as { products?: W2CProduct[] };
    return Array.isArray(parsedValue.products) ? parsedValue.products : [];
  } catch {
    return [];
  }
}
