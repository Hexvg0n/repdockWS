"use client";

import {
  IconArrowRight,
  IconEye,
  IconLoader2,
  IconLogin,
  IconPlus,
  IconSearch,
  IconSend,
  IconShoppingBag,
  IconSparkles2Filled,
  IconTrash,
  IconX,
} from "@tabler/icons-react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import { Button } from "@/components/ui/button";
import { convertLink } from "@/lib/converter";
import { currencies, fallbackCurrencyRates, formatPrice, readClientRate } from "@/lib/currency";
import { cn } from "@/lib/utils";
import type { Outfit, OutfitItem, OutfitsResponse } from "@/types/outfits";

const settingsStorageKey = "repdock-settings";
const agents = ["RIZZITGO", "KAKOBUY", "USFANS", "ACBUY"] as const;
const agentKeyMap: Record<(typeof agents)[number], string> = {
  ACBUY: "acbuy",
  KAKOBUY: "kakobuy",
  RIZZITGO: "rizzitgo",
  USFANS: "usfans",
};

type DiscordUser = {
  avatarUrl: string;
  globalName: string | null;
  id: string;
  isAdmin: boolean;
  username: string;
};

type OutfitSubmitForm = {
  description: string;
  image: string;
  items: OutfitItem[];
  title: string;
};

const createSubmitItem = (): OutfitItem => ({
  id: crypto.randomUUID(),
  image: "",
  link: "",
  priceCny: 0,
  title: "",
});

const createSubmitForm = (): OutfitSubmitForm => ({
  description: "",
  image: "",
  items: [createSubmitItem()],
  title: "",
});

export function OutfitsGallery() {
  const [search, setSearch] = useState("");
  const [appliedSearch, setAppliedSearch] = useState("");
  const [outfits, setOutfits] = useState<Outfit[]>([]);
  const [selectedOutfitId, setSelectedOutfitId] = useState<string | null>(null);
  const [nextCursor, setNextCursor] = useState<number | null>(0);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [submitOpen, setSubmitOpen] = useState(false);
  const [submitForm, setSubmitForm] = useState<OutfitSubmitForm>(() => createSubmitForm());
  const [submitSaving, setSubmitSaving] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<{ tone: "error" | "success"; text: string } | null>(null);
  const [currency, setCurrency] = useState<(typeof currencies)[number]>("CNY");
  const [agent, setAgent] = useState<(typeof agents)[number]>("RIZZITGO");
  const [currencyRates, setCurrencyRates] = useState(fallbackCurrencyRates);
  const observerTarget = useRef<HTMLDivElement>(null);
  const requestIdRef = useRef(0);

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
        setAgent("RIZZITGO");
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

  const fetchOutfits = useCallback(
    async ({ cursor, replace }: { cursor: number; replace: boolean }) => {
      const requestId = ++requestIdRef.current;
      setLoading(true);

      const params = new URLSearchParams({ cursor: String(cursor) });
      if (appliedSearch) params.set("search", appliedSearch);

      try {
        const response = await fetch(`/api/outfits?${params.toString()}`);
        const data = (await response.json()) as OutfitsResponse;

        if (requestId !== requestIdRef.current) return;

        setOutfits((current) => (replace ? data.outfits : [...current, ...data.outfits]));
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
    void fetchOutfits({ cursor: 0, replace: true });
  }, [fetchOutfits]);

  useEffect(() => {
    if (nextCursor === null || loading) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting && nextCursor !== null && !loading) {
          void fetchOutfits({ cursor: nextCursor, replace: false });
        }
      },
      { rootMargin: "420px" },
    );

    const target = observerTarget.current;
    if (target) observer.observe(target);

    return () => {
      observer.disconnect();
    };
  }, [fetchOutfits, loading, nextCursor]);

  const readyToSubmit = useMemo(
    () =>
      Boolean(
        submitForm.title.trim() &&
          submitForm.image.trim() &&
          submitForm.items.some((item) => item.title.trim() && item.image.trim() && item.link.trim()),
      ),
    [submitForm],
  );
  const selectedOutfit = useMemo(
    () => outfits.find((outfit) => outfit.id === selectedOutfitId) ?? null,
    [outfits, selectedOutfitId],
  );

  const applySearch = () => {
    setAppliedSearch(search.trim());
  };

  const openOutfit = (outfit: Outfit) => {
    setSelectedOutfitId(outfit.id);
    void countOutfitView(outfit.id);
  };

  const countOutfitView = async (outfitId: string) => {
    try {
      const response = await fetch(`/api/outfits/${outfitId}/view`, {
        method: "POST",
      });
      const data = (await response.json()) as { counted?: boolean };

      if (!response.ok || !data.counted) {
        return;
      }

      setOutfits((current) =>
        current.map((outfit) =>
          outfit.id === outfitId
            ? {
                ...outfit,
                stats: {
                  ...outfit.stats,
                  views: outfit.stats.views + 1,
                },
              }
            : outfit,
        ),
      );
    } catch {
      // View counting should never block opening the outfit.
    }
  };

  const saveOutfitSubmission = async () => {
    if (!user) {
      setSubmitStatus({ tone: "error", text: "Login with Discord before submitting an outfit." });
      return;
    }

    if (!readyToSubmit) {
      setSubmitStatus({ tone: "error", text: "Fill title, cover image and at least one complete outfit piece." });
      return;
    }

    setSubmitSaving(true);
    setSubmitStatus(null);

    try {
      const response = await fetch("/api/outfits", {
        body: JSON.stringify(submitForm),
        headers: {
          "Content-Type": "application/json",
        },
        method: "POST",
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      setSubmitStatus({ tone: "success", text: "Outfit submitted. It will appear after admin approval." });
      setSubmitForm(createSubmitForm());
    } catch (error) {
      setSubmitStatus({
        tone: "error",
        text: error instanceof Error ? error.message : "Could not submit outfit.",
      });
    } finally {
      setSubmitSaving(false);
    }
  };

  const updateSubmitItem = <Key extends keyof OutfitItem>(id: string, key: Key, value: OutfitItem[Key]) => {
    setSubmitForm((current) => ({
      ...current,
      items: current.items.map((item) => (item.id === id ? { ...item, [key]: value } : item)),
    }));
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-black px-4 pb-24 pt-28 text-white sm:px-6 lg:px-8">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[620px] bg-[radial-gradient(70%_45%_at_50%_0%,rgba(41,52,255,0.34),transparent_72%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[linear-gradient(rgba(230,236,255,0.026)_1px,transparent_1px),linear-gradient(90deg,rgba(230,236,255,0.026)_1px,transparent_1px)] bg-[size:120px_120px] opacity-30 [mask-image:linear-gradient(to_bottom,transparent,black_18%,transparent_78%)]" />
      <div className="pointer-events-none absolute left-[-18%] top-36 h-[520px] w-[520px] rotate-[-28deg] bg-[linear-gradient(90deg,transparent,rgba(41,52,255,0.22),transparent)] blur-3xl" />

      <section className="relative mx-auto grid w-full max-w-7xl gap-8">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_390px] lg:items-end">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-500/10 px-3 py-1.5 text-sm font-semibold text-blue-100">
              <IconSparkles2Filled className="size-4" />
              Community outfits
            </div>
            <h1 className="mt-5 font-['Poppins'] text-4xl font-medium tracking-normal md:text-6xl">
              Shop complete fits
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-slate-400">
              Browse community outfits and open a post to see every linked piece in the look.
            </p>
          </div>

          <div className="grid gap-4 rounded-[30px] border border-white/10 bg-white/[0.04] p-5 shadow-2xl shadow-black/25 backdrop-blur-xl">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Approved posts</p>
            <p className="mt-2 font-['Poppins'] text-3xl font-medium text-white">{total}</p>
            <p className="mt-1 text-sm text-slate-500">Outfits ready to explore</p>
            {user ? (
              <Button onClick={() => setSubmitOpen(true)} className="h-12 rounded-2xl">
                <IconSend className="size-4" />
                Submit outfit
              </Button>
            ) : (
              <a
                href="/api/auth/discord/login"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-2xl bg-[#5865F2] px-4 text-sm font-semibold text-white transition hover:bg-[#4752C4]"
              >
                <IconLogin className="size-4" />
                Login to submit
              </a>
            )}
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
                placeholder="Search outfits, pieces or creators..."
                className="h-14 w-full rounded-2xl border border-white/10 bg-black/25 pl-12 pr-4 text-sm font-medium text-white outline-none transition placeholder:text-slate-600 focus:border-blue-400/50 focus:bg-white/[0.06] focus:shadow-[0_0_32px_rgba(41,52,255,0.18)]"
              />
            </label>
            <Button onClick={applySearch} className="h-14 rounded-2xl px-6">
              <IconSearch className="size-4" />
              Search
            </Button>
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {outfits.map((outfit) => (
            <OutfitCard
              key={outfit.id}
              outfit={outfit}
              onOpen={() => openOutfit(outfit)}
            />
          ))}
        </div>

        {!loading && !outfits.length ? (
          <div className="rounded-[34px] border border-white/10 bg-white/[0.035] p-10 text-center text-slate-500">
            No approved outfits yet.
          </div>
        ) : null}

        <div ref={observerTarget} className="h-10" />
        {loading ? (
          <div className="flex justify-center py-6 text-slate-500">
            <IconLoader2 className="size-6 animate-spin" />
          </div>
        ) : null}
      </section>

      {selectedOutfit ? (
        <OutfitPostModal
          currency={currency}
          currencyRates={currencyRates}
          preferredAgent={agent}
          outfit={selectedOutfit}
          onClose={() => setSelectedOutfitId(null)}
        />
      ) : null}

      {submitOpen ? (
        <SubmitOutfitModal
          form={submitForm}
          ready={readyToSubmit}
          saving={submitSaving}
          status={submitStatus}
          user={user}
          onAddItem={() => setSubmitForm((current) => ({ ...current, items: [...current.items, createSubmitItem()] }))}
          onClose={() => setSubmitOpen(false)}
          onRemoveItem={(id) =>
            setSubmitForm((current) => ({
              ...current,
              items: current.items.length === 1 ? current.items : current.items.filter((item) => item.id !== id),
            }))
          }
          onSave={saveOutfitSubmission}
          onUpdateField={(key, value) => setSubmitForm((current) => ({ ...current, [key]: value }))}
          onUpdateItem={updateSubmitItem}
        />
      ) : null}
    </main>
  );
}

function OutfitCard({
  outfit,
  onOpen,
}: {
  outfit: Outfit;
  onOpen: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onOpen}
      className={cn(
        "group overflow-hidden rounded-[30px] border bg-[#0d0e14] text-left shadow-2xl shadow-black/25 transition hover:-translate-y-1",
        "border-white/10 hover:border-blue-300/25",
      )}
    >
      <div className="relative aspect-[4/5] overflow-hidden bg-white/[0.04]">
        <img src={outfit.image} alt="" className="h-full w-full object-cover transition duration-700 group-hover:scale-105" />
        <div className="absolute inset-0 bg-gradient-to-t from-black via-black/10 to-transparent" />
        <div className="absolute left-4 top-4 rounded-full border border-white/15 bg-black/35 px-3 py-1 text-xs font-semibold text-white backdrop-blur-md">
          {outfit.items.length} items
        </div>
      </div>
      <div className="grid gap-3 p-4">
        <h2 className="line-clamp-2 min-h-12 text-lg font-semibold text-white">{outfit.title}</h2>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="inline-flex min-w-0 items-center gap-2">
            <AuthorAvatar outfit={outfit} size="sm" />
            {outfit.createdBy}
          </span>
          <span className="inline-flex items-center gap-3">
            <span className="inline-flex items-center gap-1">
              <IconEye className="size-3.5" />
              {outfit.stats.views}
            </span>
          </span>
        </div>
      </div>
    </button>
  );
}

function SubmitOutfitModal({
  form,
  onAddItem,
  onClose,
  onRemoveItem,
  onSave,
  onUpdateField,
  onUpdateItem,
  ready,
  saving,
  status,
  user,
}: {
  form: OutfitSubmitForm;
  onAddItem: () => void;
  onClose: () => void;
  onRemoveItem: (id: string) => void;
  onSave: () => void;
  onUpdateField: <Key extends keyof OutfitSubmitForm>(key: Key, value: OutfitSubmitForm[Key]) => void;
  onUpdateItem: <Key extends keyof OutfitItem>(id: string, key: Key, value: OutfitItem[Key]) => void;
  ready: boolean;
  saving: boolean;
  status: { tone: "error" | "success"; text: string } | null;
  user: DiscordUser | null;
}) {
  return (
    <div className="fixed inset-0 z-[210] grid place-items-center bg-black/80 p-3 backdrop-blur-xl md:p-6">
      <button type="button" aria-label="Close submit outfit" className="absolute inset-0" onClick={onClose} />
      <article className="relative grid max-h-[92vh] w-full max-w-5xl overflow-hidden rounded-[34px] border border-white/10 bg-[#080910] shadow-2xl shadow-black md:grid-cols-[minmax(0,1fr)_340px]">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-2xl border border-white/10 bg-black/45 text-slate-300 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconX className="size-5" />
        </button>

        <div className="max-h-[92vh] overflow-y-auto p-5 md:p-6">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Submit outfit</p>
            <h2 className="mt-2 font-['Poppins'] text-3xl font-medium text-white">Send your fit for review</h2>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              Your outfit will be saved as pending and published after admin approval.
            </p>
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
            <TextInput label="Outfit title" value={form.title} onChange={(value) => onUpdateField("title", value)} />
            <TextInput label="Cover image URL" value={form.image} onChange={(value) => onUpdateField("image", value)} />
            <TextArea label="Description" value={form.description} onChange={(value) => onUpdateField("description", value)} />

            <div className="mt-2 grid gap-3">
              <div className="flex items-center justify-between gap-3">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-slate-500">Linked pieces</p>
                <Button
                  variant="outline"
                  onClick={onAddItem}
                  className="rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
                >
                  <IconPlus className="size-4" />
                  Add item
                </Button>
              </div>

              {form.items.map((item, index) => (
                <div key={item.id} className="grid gap-3 rounded-3xl border border-white/10 bg-black/25 p-4">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-semibold text-white">Piece {index + 1}</p>
                    <button
                      type="button"
                      onClick={() => onRemoveItem(item.id)}
                      className="grid size-9 place-items-center rounded-2xl border border-red-400/20 bg-red-500/10 text-red-200 transition hover:bg-red-500/20"
                    >
                      <IconTrash className="size-4" />
                    </button>
                  </div>
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput label="Title" value={item.title} onChange={(value) => onUpdateItem(item.id, "title", value)} />
                    <TextInput
                      label="Price CNY"
                      type="number"
                      value={String(item.priceCny || "")}
                      onChange={(value) => onUpdateItem(item.id, "priceCny", Number(value))}
                    />
                    <TextInput label="Image URL" value={item.image} onChange={(value) => onUpdateItem(item.id, "image", value)} />
                    <TextInput label="Product link" value={item.link} onChange={(value) => onUpdateItem(item.id, "link", value)} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onSave} disabled={saving || !ready || !user} className="h-12 rounded-2xl">
              {saving ? <IconLoader2 className="size-4 animate-spin" /> : <IconSend className="size-4" />}
              Submit for review
            </Button>
            <Button
              variant="outline"
              onClick={onClose}
              className="h-12 rounded-2xl border-white/10 bg-white/[0.04] text-white hover:bg-white/[0.08]"
            >
              Cancel
            </Button>
          </div>
        </div>

        <aside className="hidden border-l border-white/10 bg-white/[0.025] p-5 md:block">
          <div className="sticky top-5">
            <div className="aspect-[4/5] overflow-hidden rounded-[28px] bg-white/[0.04]">
              {form.image ? (
                <img src={form.image} alt="" className="h-full w-full object-cover" />
              ) : (
                <div className="grid h-full place-items-center text-slate-600">
                  <IconShoppingBag className="size-10" />
                </div>
              )}
            </div>
            <h3 className="mt-5 line-clamp-2 text-xl font-semibold text-white">{form.title || "Outfit preview"}</h3>
            <p className="mt-2 line-clamp-4 text-sm leading-relaxed text-slate-500">
              {form.description || "Add a short note about the fit, vibe, sizing or styling."}
            </p>
            <div className="mt-5 rounded-3xl border border-white/10 bg-black/25 p-4 text-sm text-slate-400">
              Submitted as <span className="font-semibold text-white">{user?.globalName || user?.username || "Discord user"}</span>
            </div>
          </div>
        </aside>
      </article>
    </div>
  );
}

function OutfitPostModal({
  currency,
  currencyRates,
  outfit,
  preferredAgent,
  onClose,
}: {
  currency: (typeof currencies)[number];
  currencyRates: Record<(typeof currencies)[number], number>;
  outfit: Outfit;
  preferredAgent: (typeof agents)[number];
  onClose: () => void;
}) {
  const total = useMemo(
    () => outfit.items.reduce((sum, item) => sum + item.priceCny, 0),
    [outfit.items],
  );

  return (
    <div className="fixed inset-0 z-[200] grid place-items-center bg-black/80 p-3 backdrop-blur-xl md:p-6">
      <button type="button" aria-label="Close outfit post" className="absolute inset-0" onClick={onClose} />
      <article className="relative max-h-[92vh] w-full max-w-6xl overflow-y-auto rounded-[34px] border border-white/10 bg-[#080910] shadow-2xl shadow-black md:grid md:grid-cols-[minmax(0,1.15fr)_430px] md:overflow-hidden">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 z-10 grid size-11 place-items-center rounded-2xl border border-white/10 bg-black/45 text-slate-300 backdrop-blur-md transition hover:bg-white/[0.08] hover:text-white"
        >
          <IconX className="size-5" />
        </button>

        <div className="relative min-h-[62vh] overflow-hidden bg-black md:min-h-[720px]">
          <img src={outfit.image} alt="" className="h-full min-h-[62vh] w-full object-cover md:max-h-[92vh]" />
          <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/85 to-transparent p-5 md:hidden">
            <h2 className="font-['Poppins'] text-2xl font-medium text-white">{outfit.title}</h2>
          </div>
        </div>

        <div className="grid md:max-h-[92vh] md:grid-rows-[auto_1fr_auto] md:overflow-hidden">
          <header className="border-b border-white/10 p-5">
            <div className="flex items-center gap-3">
              <AuthorAvatar outfit={outfit} size="lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-white">{outfit.createdBy}</p>
                <p className="text-xs text-slate-500">{formatDate(outfit.createdAt)}</p>
              </div>
            </div>
            <h2 className="mt-5 hidden font-['Poppins'] text-3xl font-medium text-white md:block">{outfit.title}</h2>
            {outfit.description ? (
              <p className="mt-3 text-sm leading-relaxed text-slate-400">{outfit.description}</p>
            ) : null}
          </header>

          <div className="p-5 md:overflow-y-auto">
            <div className="mb-4 flex items-center justify-between">
              <p className="text-xs font-semibold uppercase tracking-[0.18em] text-blue-200">Pieces in this fit</p>
              <p className="text-xs text-slate-500">
                Total {formatPrice(total, currency, currencyRates)}
              </p>
            </div>
            <div className="grid gap-3">
              {outfit.items.map((item) => (
                <a
                  key={item.id}
                  href={getPreferredItemLink(item.link, preferredAgent)}
                  rel="noreferrer"
                  target="_blank"
                  className="group grid grid-cols-[74px_minmax(0,1fr)_auto] items-center gap-3 rounded-3xl border border-white/10 bg-white/[0.035] p-3 transition hover:border-blue-300/30 hover:bg-blue-500/10"
                >
                  <div className="aspect-square overflow-hidden rounded-2xl bg-white/[0.04]">
                    <img src={item.image} alt="" className="h-full w-full object-cover" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="line-clamp-2 text-sm font-semibold text-white">{item.title}</h3>
                    <p className="mt-1 text-sm font-semibold text-blue-100">
                      {formatPrice(item.priceCny, currency, currencyRates)}
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
                {outfit.stats.views} views
              </span>
            </div>
          </footer>
        </div>
      </article>
    </div>
  );
}

function TextInput({
  label,
  onChange,
  type = "text",
  value,
}: {
  label: string;
  onChange: (value: string) => void;
  type?: string;
  value: string;
}) {
  return (
    <label className="grid gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-500">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-12 rounded-2xl border border-white/10 bg-black/25 px-4 text-sm text-white outline-none transition placeholder:text-slate-600 focus:border-blue-300/50 focus:bg-blue-500/10"
      />
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

function getPreferredItemLink(link: string, preferredAgent: (typeof agents)[number]) {
  const converted = convertLink(link);
  const preferredKey = agentKeyMap[preferredAgent];
  const preferredLink = converted.convertedLinks.find((convertedLink) => convertedLink.key === preferredKey);

  return preferredLink?.url ?? converted.originalUrl ?? link;
}

function AuthorAvatar({
  outfit,
  size,
}: {
  outfit: Pick<Outfit, "createdBy" | "createdByAvatarUrl">;
  size: "sm" | "lg";
}) {
  const dimensions = size === "lg" ? "size-11 rounded-2xl" : "size-6 rounded-full";

  if (outfit.createdByAvatarUrl) {
    return (
      <img
        src={outfit.createdByAvatarUrl}
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
      {outfit.createdBy.slice(0, 1).toUpperCase() || "U"}
    </span>
  );
}

function formatDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;

  return date.toLocaleDateString("en", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}
