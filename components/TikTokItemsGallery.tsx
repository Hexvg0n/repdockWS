"use client";

import {
  IconArrowRight,
  IconBrandTiktok,
  IconCheck,
  IconEye,
  IconLoader2,
  IconLogin,
  IconPhoto,
  IconPlus,
  IconSearch,
  IconSend,
  IconShoppingBag,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import { currencies, fallbackCurrencyRates, formatPrice, readClientRate } from "@/lib/currency";
import {
  settingsStorageKey,
  useLanguageCopy,
  useRepdockLanguage,
} from "@/lib/use-repdock-language";
import { cn } from "@/lib/utils";
import type {
  TikTokAttachedProduct,
  TikTokItemPost,
  TikTokItemsResponse,
  TikTokProductSearchResponse,
} from "@/types/tiktok-items";
import type { W2CProduct } from "@/types/w2c";

const agents = ["BBDBUY", "KAKOBUY", "USFANS", "ACBUY"] as const;

type DiscordUser = {
  avatarUrl: string;
  globalName: string | null;
  id: string;
  isAdmin: boolean;
  username: string;
};

type TikTokSubmitForm = {
  coverImage: string;
  description: string;
  productIds: string[];
  tiktokUrl: string;
  title: string;
};

const createSubmitForm = (): TikTokSubmitForm => ({
  coverImage: "",
  description: "",
  productIds: [],
  tiktokUrl: "",
  title: "",
});

const tiktokItemsCopy = {
  PL: {
    actions: {
      add: "Dodaj TikToka",
      cancel: "Anuluj",
      loginToSubmit: "Zaloguj, zeby dodac",
      openTikTok: "Otworz TikToka",
      search: "Szukaj",
      submitForReview: "Zapisz film",
    },
    empty: "Nie ma jeszcze dodanych filmow.",
    header: {
      badge: "TikTok Items",
      description:
        "Jedno miejsce na itemy pokazane w filmach. Wrzucasz TikToka, podpinasz produkty z W2C i kazdy moze od razu przejsc do kupienia.",
      ready: "filmow z podpietymi itemami",
      statsLabel: "Opublikowane",
      title: "Itemy z TikToka",
    },
    labels: {
      closePost: "Zamknij film",
      item: "item",
      items: "itemow",
      linkedItems: "Itemy z filmu",
      postedBy: "Dodane przez",
      settingsFollow: "Linki i ceny korzystaja z Ustawien",
      views: "wyswietlen",
    },
    searchPlaceholder: "Szukaj filmu, itemu, marki albo kategorii...",
    status: {
      incomplete: "Uzupelnij tytul, link TikToka i wybierz przynajmniej jeden item.",
      loginRequired: "Zaloguj sie przez Discorda przed dodaniem filmu.",
      submitError: "Nie udalo sie zapisac filmu.",
      submitted: "Film zapisany. Jesli nie jestes adminem, pojawi sie po akceptacji.",
    },
    submit: {
      coverImage: "URL covera / kadru",
      description: "Opis",
      header: "Nowy film",
      intro: "Dodaj link do TikToka i przypnij produkty z katalogu W2C, ktore widac w materiale.",
      itemSearch: "Szukaj itemow W2C",
      noProducts: "Brak wynikow dla tej frazy.",
      optionalCover: "Opcjonalnie. Bez covera uzyjemy zdjecia pierwszego produktu.",
      preview: "Podglad filmu",
      productLimit: "Mozesz przypiac maksymalnie 12 itemow.",
      selectedItems: "Wybrane itemy",
      sentAs: "Dodajesz jako",
      tiktokUrl: "Link TikToka",
      title: "Dodaj TikToka z itemami",
      titleField: "Tytul filmu",
      userFallback: "Uzytkownik Discorda",
    },
  },
  EN: {
    actions: {
      add: "Add TikTok",
      cancel: "Cancel",
      loginToSubmit: "Login to submit",
      openTikTok: "Open TikTok",
      search: "Search",
      submitForReview: "Save video",
    },
    empty: "No videos have been added yet.",
    header: {
      badge: "TikTok Items",
      description:
        "A dedicated shelf for products shown in TikToks. Add the video, attach W2C items, and let people jump straight to buying.",
      ready: "videos with linked items",
      statsLabel: "Published",
      title: "TikTok Items",
    },
    labels: {
      closePost: "Close video",
      item: "item",
      items: "items",
      linkedItems: "Items in this video",
      postedBy: "Posted by",
      settingsFollow: "Links and prices follow Settings",
      views: "views",
    },
    searchPlaceholder: "Search videos, items, brands or categories...",
    status: {
      incomplete: "Fill title, TikTok link and choose at least one item.",
      loginRequired: "Login with Discord before adding a video.",
      submitError: "Could not save video.",
      submitted: "Video saved. If you are not an admin, it will appear after approval.",
    },
    submit: {
      coverImage: "Cover / frame URL",
      description: "Description",
      header: "New video",
      intro: "Add the TikTok link and attach the W2C products shown in the clip.",
      itemSearch: "Search W2C items",
      noProducts: "No products found for this query.",
      optionalCover: "Optional. Without a cover, the first product image will be used.",
      preview: "Video preview",
      productLimit: "You can attach up to 12 items.",
      selectedItems: "Selected items",
      sentAs: "Posting as",
      tiktokUrl: "TikTok link",
      title: "Add TikTok with items",
      titleField: "Video title",
      userFallback: "Discord user",
    },
  },
} as const;

type TikTokItemsCopy = (typeof tiktokItemsCopy)[keyof typeof tiktokItemsCopy];

export function TikTokItemsGallery() {
  const copy = useLanguageCopy(tiktokItemsCopy);
  const language = useRepdockLanguage();
  const dateLocale = language === "PL" ? "pl" : "en";
  const [items, setItems] = useState<TikTokItemPost[]>([]);
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState<TikTokSubmitForm>(() => createSubmitForm());
  const [selectedProducts, setSelectedProducts] = useState<W2CProduct[]>([]);
  const [submitSaving, setSubmitSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("CNY");
  const [agent, setAgent] = useState<(typeof agents)[number]>("BBDBUY");
  const [currencyRates, setCurrencyRates] = useState(fallbackCurrencyRates);
  const observerTarget = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

  const selectedItem = useMemo(
    () => items.find((item) => item.id === selectedItemId) ?? null,
    [items, selectedItemId],
  );
  const readyToSubmit = Boolean(
    submitForm.title.trim() &&
      submitForm.tiktokUrl.trim() &&
      submitForm.productIds.length > 0,
  );

  useEffect(() => {
    const loadSettings = () => {
      try {
        const savedSettings = JSON.parse(
          globalThis.localStorage.getItem(settingsStorageKey) ?? "{}",
        ) as { agent?: string; currency?: string };

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

    fetch("/api/auth/me")
      .then((response) => response.json())
      .then((data: { user: DiscordUser | null }) => {
        if (!cancelled) {
          setUser(data.user);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setUser(null);
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    const loadCurrencyRates = async () => {
      try {
        const response = await fetch("/api/currency-rates");
        const data = (await response.json()) as {
          rates?: Partial<Record<(typeof currencies)[number], number>>;
        };

        if (!cancelled && response.ok && data.rates) {
          setCurrencyRates({
            CNY: 1,
            PLN: readClientRate(data.rates.PLN, fallbackCurrencyRates.PLN),
            USD: readClientRate(data.rates.USD, fallbackCurrencyRates.USD),
            EUR: readClientRate(data.rates.EUR, fallbackCurrencyRates.EUR),
          });
        }
      } catch {
        setCurrencyRates(fallbackCurrencyRates);
      }
    };

    void loadCurrencyRates();

    return () => {
      cancelled = true;
    };
  }, []);

  const fetchItems = useCallback(
    async ({ cursor, replace }: { cursor: number; replace: boolean }) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      const params = new URLSearchParams({ cursor: String(cursor) });
      if (appliedSearch) params.set("search", appliedSearch);

      try {
        const response = await fetch(`/api/tiktok-items?${params.toString()}`);
        const data = (await response.json()) as TikTokItemsResponse;

        if (requestId !== requestIdRef.current) return;

        setItems((current) => (replace ? data.items : [...current, ...data.items]));
        setNextCursor(data.nextCursor);
        setTotal(data.total);
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
        }
      }
    },
    [appliedSearch],
  );

  useEffect(() => {
    void fetchItems({ cursor: 0, replace: true });
  }, [fetchItems]);

  useEffect(() => {
    if (nextCursor === null || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor !== null && !loading) {
          void fetchItems({ cursor: nextCursor, replace: false });
        }
      },
      { rootMargin: "420px" },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchItems, loading, nextCursor]);

  const applySearch = () => {
    setAppliedSearch(search.trim());
  };

  const openItem = (item: TikTokItemPost) => {
    setSelectedItemId(item.id);
    void countItemView(item.id);
  };

  const countItemView = async (itemId: string) => {
    try {
      const response = await fetch(`/api/tiktok-items/${itemId}/view`, { method: "POST" });
      const data = (await response.json()) as { counted?: boolean };

      if (!response.ok || !data.counted) {
        return;
      }

      setItems((current) =>
        current.map((item) =>
          item.id === itemId
            ? {
                ...item,
                stats: {
                  ...item.stats,
                  views: item.stats.views + 1,
                },
              }
            : item,
        ),
      );
    } catch {
      // View counting is best-effort only.
    }
  };

  const saveTikTokSubmission = async () => {
    if (!user) {
      setSubmitStatus({ tone: "error", text: copy.status.loginRequired });
      return;
    }

    if (!readyToSubmit) {
      setSubmitStatus({ tone: "error", text: copy.status.incomplete });
      return;
    }

    setSubmitSaving(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/tiktok-items", {
        body: JSON.stringify(submitForm),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      const data = (await response.json()) as { item: TikTokItemPost };
      setSubmitStatus({ tone: "success", text: copy.status.submitted });
      setSubmitForm(createSubmitForm());
      setSelectedProducts([]);

      if (data.item.status === "approved") {
        setItems((current) => [data.item, ...current]);
        setTotal((current) => current + 1);
      }
    } catch (error) {
      setSubmitStatus({
        tone: "error",
        text: error instanceof Error ? error.message : copy.status.submitError,
      });
    } finally {
      setSubmitSaving(false);
    }
  };

  const toggleProduct = (product: W2CProduct) => {
    setSelectedProducts((current) => {
      if (current.some((currentProduct) => currentProduct.id === product.id)) {
        setSubmitForm((form) => ({
          ...form,
          productIds: form.productIds.filter((productId) => productId !== product.id),
        }));
        return current.filter((currentProduct) => currentProduct.id !== product.id);
      }

      if (current.length >= 12) {
        return current;
      }

      setSubmitForm((form) => ({
        ...form,
        productIds: [...form.productIds, product.id],
      }));
      return [...current, product];
    });
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,transparent_78%)]" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
              <IconBrandTiktok className="size-4" />
              {copy.header.badge}
            </div>
            <h1 className="mt-5 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
              {copy.header.title}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              {copy.header.description}
            </p>
          </div>

          <div className="grid gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">{copy.header.statsLabel}</p>
            <p className="font-['Poppins'] text-3xl font-medium text-white">{total}</p>
            <p className="text-sm text-slate-500">{copy.header.ready}</p>
            <div className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm font-semibold text-slate-400">
              <IconShoppingBag className="size-4" />
              {copy.labels.settingsFollow}
            </div>
          </div>
        </div>

        <div className="rounded-[34px] border border-white/10 bg-white/[0.04] p-4 shadow-2xl shadow-black/30 backdrop-blur-xl md:p-5">
          <div className="grid gap-3 md:grid-cols-[1fr_auto]">
            <label className="relative block">
              <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-slate-400" />
              <input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") applySearch();
                }}
                placeholder={copy.searchPlaceholder}
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
              />
            </label>
            <Button onClick={applySearch} className="h-14 rounded-2xl px-6">
              <IconSearch className="size-4" />
              {copy.actions.search}
            </Button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item) => (
            <TikTokItemCard key={item.id} copy={copy} item={item} onOpen={() => openItem(item)} />
          ))}
        </div>

        {!loading && !items.length ? (
          <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-10 text-center text-slate-500">
            {copy.empty}
          </div>
        ) : null}

        <div ref={observerTarget} className="h-10" />
        {loading ? (
          <div className="flex justify-center py-6 text-slate-500">
            <IconLoader2 className="size-6 animate-spin" />
          </div>
        ) : null}
      </section>

      {selectedItem ? (
        <TikTokItemModal
          copy={copy}
          currency={currency}
          currencyRates={currencyRates}
          dateLocale={dateLocale}
          item={selectedItem}
          preferredAgent={agent}
          onClose={() => setSelectedItemId(null)}
        />
      ) : null}

    </main>
  );
}

function TikTokItemCard({
  copy,
  item,
  onOpen,
}: {
  copy: TikTokItemsCopy;
  item: TikTokItemPost;
  onOpen: () => void;
}) {
  const itemLabel = item.products.length === 1 ? copy.labels.item : copy.labels.items;
  const cover = item.coverImage || item.products[0]?.image || "";

  return (
    <button
      type="button"
      onClick={onOpen}
      className="group overflow-hidden rounded-[30px] border border-white/10 bg-[#0d0e14] text-left shadow-2xl shadow-black/25 transition hover:-translate-y-1 hover:border-blue-300/25"
    >
      <div className="relative aspect-[9/16] overflow-hidden bg-white/[0.04]">
        {cover ? (
          <img
            src={getWebpImageUrl(cover)}
            alt=""
            className="h-full w-full object-cover transition duration-700 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center text-slate-600">
            <IconBrandTiktok className="size-12" />
          </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />
        <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-full border border-white/15 bg-black/40 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
          <IconBrandTiktok className="size-3.5" />
          TikTok
        </div>
        <div className="absolute bottom-4 left-4 right-4">
          <h2 className="line-clamp-2 text-xl font-semibold text-white">{item.title}</h2>
          <div className="mt-3 flex items-center justify-between gap-3 text-xs text-slate-300">
            <span className="inline-flex items-center gap-2">
              <IconShoppingBag className="size-4" />
              {item.products.length} {itemLabel}
            </span>
            <span className="inline-flex items-center gap-1">
              <IconEye className="size-3.5" />
              {item.stats.views}
            </span>
          </div>
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <div className="flex -space-x-2">
          {item.products.slice(0, 4).map((product) => (
            <img
              key={product.productId}
              src={getWebpImageUrl(product.image)}
              alt=""
              className="size-10 rounded-2xl border border-[#0d0e14] bg-white object-cover"
            />
          ))}
          {item.products.length > 4 ? (
            <span className="grid size-10 place-items-center rounded-2xl border border-[#0d0e14] bg-white text-xs font-black text-black">
              +{item.products.length - 4}
            </span>
          ) : null}
        </div>
        <p className="line-clamp-1 text-xs text-slate-500">{copy.labels.postedBy} {item.createdBy}</p>
      </div>
    </button>
  );
}

function TikTokItemModal({
  copy,
  currency,
  currencyRates,
  dateLocale,
  item,
  preferredAgent,
  onClose,
}: {
  copy: TikTokItemsCopy;
  currency: (typeof currencies)[number];
  currencyRates: Record<(typeof currencies)[number], number>;
  dateLocale: string;
  item: TikTokItemPost;
  preferredAgent: (typeof agents)[number];
  onClose: () => void;
}) {
  const cover = item.coverImage || item.products[0]?.image || "";

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-3 backdrop-blur-xl md:p-6">
      <button type="button" aria-label={copy.labels.closePost} className="absolute inset-0" onClick={onClose} />
      <article className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[34px] border border-white/10 bg-[#080910] shadow-2xl shadow-black md:grid md:grid-cols-[minmax(0,0.9fr)_460px] md:overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-2xl border border-white/10 bg-black/45 text-slate-300 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconX className="size-5" />
        </button>

        <div className="relative grid min-h-[62vh] place-items-center overflow-hidden bg-black md:min-h-[720px]">
          {cover ? (
            <img src={getWebpImageUrl(cover)} alt="" className="h-full min-h-[62vh] w-full object-cover md:max-h-[92vh]" />
          ) : (
            <IconBrandTiktok className="size-16 text-slate-700" />
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-black/20" />
          <a
            href={item.tiktokUrl}
            target="_blank"
            rel="noreferrer"
            className="absolute bottom-5 left-5 inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-white px-4 text-sm font-black text-black transition hover:bg-blue-100"
          >
            <IconBrandTiktok className="size-4" />
            {copy.actions.openTikTok}
          </a>
        </div>

        <div className="grid md:max-h-[92vh] md:grid-rows-[auto_1fr_auto] md:overflow-hidden">
          <header className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <AuthorAvatar item={item} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{item.createdBy}</p>
                <p className="text-xs text-slate-500">{formatDate(item.createdAt, dateLocale)}</p>
              </div>
            </div>
            <h2 className="mt-5 font-['Poppins'] text-3xl font-medium text-white">{item.title}</h2>
            {item.description ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{item.description}</p>
            ) : null}
          </header>

          <div className="p-5 md:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">{copy.labels.linkedItems}</p>
              <p className="text-xs text-slate-500">{copy.labels.settingsFollow}</p>
            </div>
            <div className="grid gap-3">
              {item.products.map((product) => (
                <a
                  key={product.productId}
                  href={getPreferredProductLink(product, preferredAgent)}
                  rel="noreferrer"
                  target="_blank"
                  className="group grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-blue-300/30 hover:bg-blue-500/10"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl bg-white/[0.04]">
                    <img src={getWebpImageUrl(product.image)} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{product.name}</h3>
                    <p className="mt-1 text-xs text-slate-500">
                      {product.metadata.brand} / {product.metadata.category}
                    </p>
                    <p className="mt-1 text-sm font-semibold text-blue-100">
                      {formatPrice(product.priceCny, currency, currencyRates)}
                    </p>
                  </div>
                  <span className="grid size-10 place-items-center rounded-2xl bg-white/[0.05] text-slate-300 transition group-hover:bg-blue-500/20 group-hover:text-white">
                    <IconArrowRight className="size-4" />
                  </span>
                </a>
              ))}
            </div>
          </div>

          <footer className="border-t border-white/10 p-5">
            <div className="flex items-center justify-end text-sm text-slate-400">
              <span className="inline-flex items-center gap-2">
                <IconEye className="size-4" />
                {item.stats.views} {copy.labels.views}
              </span>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

function SubmitTikTokItemModal({
  copy,
  form,
  onClose,
  onRemoveProduct,
  onSave,
  onToggleProduct,
  onUpdateField,
  ready,
  saving,
  selectedProducts,
  status,
  user,
}: {
  copy: TikTokItemsCopy;
  form: TikTokSubmitForm;
  onClose: () => void;
  onRemoveProduct: (productId: string) => void;
  onSave: () => void;
  onToggleProduct: (product: W2CProduct) => void;
  onUpdateField: <Key extends keyof TikTokSubmitForm>(key: Key, value: TikTokSubmitForm[Key]) => void;
  ready: boolean;
  saving: boolean;
  selectedProducts: W2CProduct[];
  status: { tone: "error" | "success"; text: string } | null;
  user: DiscordUser | null;
}) {
  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/80 p-3 backdrop-blur-xl md:p-6">
      <button type="button" aria-label={copy.labels.closePost} className="absolute inset-0" onClick={onClose} />
      <article className="relative grid max-h-[92vh] w-full max-w-6xl overflow-hidden rounded-[34px] border border-white/10 bg-[#080910] shadow-2xl shadow-black lg:grid-cols-[minmax(0,1fr)_370px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-2xl border border-white/10 bg-black/45 text-slate-300 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconX className="size-5" />
        </button>

        <div className="max-h-[92vh] overflow-y-auto p-5 md:p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">{copy.submit.header}</p>
            <h2 className="mt-2 font-['Poppins'] text-3xl font-medium text-white">{copy.submit.title}</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">{copy.submit.intro}</p>
          </div>

          {status ? (
            <div
              className={cn(
                "mb-5 rounded-2xl border px-4 py-3 text-sm",
                status.tone === "success"
                  ? "border-emerald-400/20 bg-emerald-500/10 text-emerald-100"
                  : "border-red-400/20 bg-red-500/10 text-red-100",
              )}
            >
              {status.text}
            </div>
          ) : null}

          <div className="grid gap-4">
            <TextInput label={copy.submit.titleField} value={form.title} onChange={(value) => onUpdateField("title", value)} />
            <TextInput label={copy.submit.tiktokUrl} value={form.tiktokUrl} onChange={(value) => onUpdateField("tiktokUrl", value)} />
            <TextInput label={copy.submit.coverImage} hint={copy.submit.optionalCover} value={form.coverImage} onChange={(value) => onUpdateField("coverImage", value)} />
            <TextArea label={copy.submit.description} value={form.description} onChange={(value) => onUpdateField("description", value)} />

            <ProductPicker
              copy={copy}
              selectedProducts={selectedProducts}
              onRemoveProduct={onRemoveProduct}
              onToggleProduct={onToggleProduct}
            />
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onSave} disabled={saving || !ready || !user} className="h-12 rounded-2xl">
              {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconSend className="size-4" />}
              {copy.actions.submitForReview}
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              {copy.actions.cancel}
            </Button>
          </div>
        </div>

        <aside className="hidden border-l border-white/10 bg-white/[0.025] p-5 lg:block">
          <div className="sticky top-5">
            <div className="aspect-[9/16] overflow-hidden rounded-[28px] bg-white/[0.04]">
              {form.coverImage || selectedProducts[0]?.image ? (
                <img
                  src={getWebpImageUrl(form.coverImage || selectedProducts[0]?.image || "")}
                  alt=""
                  className="h-full w-full object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center text-slate-600">
                  <IconPhoto className="size-10" />
                </div>
              )}
            </div>
            <h3 className="mt-5 line-clamp-2 text-xl font-semibold text-white">{form.title || copy.submit.preview}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-500">
              {form.description || copy.submit.productLimit}
            </p>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-slate-400">
              {copy.submit.sentAs}{" "}
              <span className="font-semibold text-white">
                {user?.globalName || user?.username || copy.submit.userFallback}
              </span>
            </div>
          </div>
        </aside>
      </article>
    </div>
  );
}

function ProductPicker({
  copy,
  onRemoveProduct,
  onToggleProduct,
  selectedProducts,
}: {
  copy: TikTokItemsCopy;
  onRemoveProduct: (productId: string) => void;
  onToggleProduct: (product: W2CProduct) => void;
  selectedProducts: W2CProduct[];
}) {
  const [search, setSearch] = useState("");
  const [products, setProducts] = useState<W2CProduct[]>([]);
  const [loading, setLoading] = useState(false);
  const selectedIds = useMemo(() => new Set(selectedProducts.map((product) => product.id)), [selectedProducts]);

  useEffect(() => {
    let cancelled = false;
    const timeout = window.setTimeout(async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams();
        if (search.trim()) params.set("search", search.trim());
        const response = await fetch(`/api/tiktok-items/products?${params.toString()}`);
        const data = (await response.json()) as TikTokProductSearchResponse;

        if (!cancelled) {
          setProducts(data.products ?? []);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }, 220);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [search]);

  return (
    <div className="grid gap-3">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">{copy.submit.selectedItems}</p>
        <span className="text-xs text-slate-500">{selectedProducts.length}/12</span>
      </div>

      {selectedProducts.length > 0 ? (
        <div className="grid gap-2">
          {selectedProducts.map((product) => (
            <div key={product.id} className="grid grid-cols-[56px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-2">
              <img src={getWebpImageUrl(product.image)} alt="" className="size-14 rounded-xl object-cover" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{product.name}</p>
                <p className="truncate text-xs text-slate-500">{product.metadata.brand} / {product.metadata.category}</p>
              </div>
              <button
                type="button"
                onClick={() => onRemoveProduct(product.id)}
                className="grid size-9 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
              >
                <IconTrash className="size-4" />
              </button>
            </div>
          ))}
        </div>
      ) : null}

      <label className="relative block">
        <IconSearch className="pointer-events-none absolute left-4 top-1/2 size-4 -translate-y-1/2 text-slate-500" />
        <input
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder={copy.submit.itemSearch}
          className="h-12 w-full rounded-2xl border border-white/10 bg-black/25 pl-11 pr-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
        />
      </label>

      <div className="grid max-h-80 gap-2 overflow-y-auto pr-1">
        {loading ? (
          <div className="grid place-items-center py-6 text-slate-500">
            <IconLoader2 className="size-5 animate-spin" />
          </div>
        ) : products.length > 0 ? (
          products.map((product) => {
            const selected = selectedIds.has(product.id);

            return (
              <button
                key={product.id}
                type="button"
                onClick={() => onToggleProduct(product)}
                className={cn(
                  "grid grid-cols-[60px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border p-2 text-left transition",
                  selected
                    ? "border-blue-300/40 bg-blue-500/10"
                    : "border-white/10 bg-white/[0.03] hover:border-white/25 hover:bg-white/[0.06]",
                )}
              >
                <img src={getWebpImageUrl(product.image)} alt="" className="size-[60px] rounded-xl object-cover" />
                <span className="min-w-0">
                  <span className="block truncate text-sm font-semibold text-white">{product.name}</span>
                  <span className="mt-1 block truncate text-xs text-slate-500">
                    {product.metadata.brand} / {product.metadata.category}
                  </span>
                </span>
                <span
                  className={cn(
                    "grid size-9 place-items-center rounded-2xl border",
                    selected
                      ? "border-blue-300/30 bg-blue-500/20 text-blue-100"
                      : "border-white/10 bg-white/[0.04] text-slate-500",
                  )}
                >
                  {selected ? <IconCheck className="size-4" /> : <IconPlus className="size-4" />}
                </span>
              </button>
            );
          })
        ) : (
          <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
            {copy.submit.noProducts}
          </div>
        )}
      </div>
    </div>
  );
}

function TextInput({
  hint,
  label,
  onChange,
  value,
}: {
  hint?: string;
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
      />
      {hint ? <span className="text-xs text-slate-600">{hint}</span> : null}
    </label>
  );
}

function TextArea({
  label,
  onChange,
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <textarea
        value={value}
        onChange={(event) => onChange(event.target.value)}
        rows={4}
        className="rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
      />
    </label>
  );
}

function getPreferredProductLink(product: TikTokAttachedProduct, preferredAgent: (typeof agents)[number]) {
  return product.links[preferredAgent] ?? product.links.original;
}

function AuthorAvatar({
  item,
  size,
}: {
  item: Pick<TikTokItemPost, "createdBy" | "createdByAvatarUrl">;
  size: "sm" | "lg";
}) {
  const dimensions = size === "lg" ? "size-11 rounded-2xl" : "size-6 rounded-full";

  if (item.createdByAvatarUrl) {
    return (
      <img
        src={item.createdByAvatarUrl}
        alt=""
        className={cn(dimensions, "shrink-0 border border-white/10 bg-white/[0.04] object-cover")}
      />
    );
  }

  return (
    <span
      className={cn(
        dimensions,
        "grid shrink-0 place-items-center border border-white/10 bg-blue-500/15 text-xs font-semibold text-blue-100",
      )}
    >
      {item.createdBy.slice(0, 1).toUpperCase() || "U"}
    </span>
  );
}

function formatDate(value: string, locale: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString(locale, {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
