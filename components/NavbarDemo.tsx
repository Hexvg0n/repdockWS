"use client";
import SmartImage from "@/components/SmartImage";
import {
  Navbar,
  NavBody,
  MobileNav,
  NavbarLogo,
  NavbarButton,
  MobileNavHeader,
  MobileNavToggle,
  MobileNavMenu,
} from "@/components/ui/resizable-navbar";
import {
  IconAdjustmentsHorizontalFilled,
  IconChevronDown,
  IconCurrencyYuan,
  IconFlagQuestion,
  IconHeart,
  IconHeartFilled,
  IconLoader2,
  IconLogout,
  IconShoppingBag,
  IconUser,
  IconTruck,
} from "@tabler/icons-react";
import { LoginRequiredDialog } from "@/components/LoginRequiredDialog";
import SmoothDrawer from "@/components/kokonutui/smooth-drawer";
import { getWebpImageUrl } from "@/lib/cloudinary-image";
import {
  settingsStorageKey,
  useLanguageCopy,
} from "@/lib/use-repdock-language";
import type { W2CProduct } from "@/types/w2c";
import { useEffect, useRef, useState } from "react";

const navLinks = [
  {
    key: "w2c",
    link: "/w2c",
  },
  {
    key: "outfits",
    link: "/outfits",
  },
  {
    key: "tiktokItems",
    link: "/tiktok-items",
  },
] as const;

const toolLinks = [
  {
    key: "converter",
    link: "/converter",
  },
  {
    key: "qc",
    link: "/qc",
  },
  {
    key: "calculator",
    link: "/calculator",
  },
  {
    key: "tracking",
    link: "/tracking",
  },
] as const;

const navbarCopy = {
  PL: {
    auth: {
      admin: "Admin",
      login: "Zaloguj",
      logout: "Wyloguj",
      profile: "Profil",
      profileDisabled: "Profil chwilowo niedostepny",
    },
    favorites: {
      close: "Zamknij",
      empty: "Nie masz jeszcze ulubionych itemow.",
      loginAction: "Zaloguj przez Discord",
      loginDescription: "Ulubione sa przypisane do konta. Zaloguj sie, zeby zapisywac i przegladac itemy.",
      loginTitle: "Ulubione wymagaja logowania",
      open: "Ulubione",
      title: "Ulubione W2C",
    },
    nav: {
      w2c: "W2C",
      outfits: "Outfity",
      tiktokItems: "TikTok Items",
    },
    settings: {
      agentDescription: "Preferowany agent dla linków, zamówień i trackingu.",
      agentTitle: "Agent",
      currencyDescription: "Używana przy wycenach, kosztach i kalkulatorach.",
      currencyTitle: "Waluta",
      languageDescription: "Język interfejsu dla nawigacji i narzędzi.",
      languageTitle: "Język",
      save: "Zapisz",
      title: "Ustawienia",
      trigger: "Ustawienia",
      description: "Wybierz język, walutę i agenta zakupowego.",
    },
    tools: {
      calculator: "Kalkulator",
      converter: "Konwerter",
      qc: "QC",
      tracking: "Tracking",
    },
    toolsLabel: "Narzędzia",
  },
  EN: {
    auth: {
      admin: "Admin",
      login: "Login",
      logout: "Logout",
      profile: "Profile",
      profileDisabled: "Profile is temporarily unavailable",
    },
    favorites: {
      close: "Close",
      empty: "You do not have favorite items yet.",
      loginAction: "Login with Discord",
      loginDescription: "Favorites are tied to your account. Login to save and preview items.",
      loginTitle: "Favorites require login",
      open: "Favorites",
      title: "W2C Favorites",
    },
    nav: {
      w2c: "W2C",
      outfits: "Outfits",
      tiktokItems: "TikTok Items",
    },
    settings: {
      agentDescription: "Preferred agent for links, orders and tracking.",
      agentTitle: "Agent",
      currencyDescription: "Used for estimates, fees and calculators.",
      currencyTitle: "Currency",
      languageDescription: "Interface language for navigation and tools.",
      languageTitle: "Language",
      save: "Save",
      title: "Settings",
      trigger: "Settings",
      description: "Choose your language, currency and shopping agent.",
    },
    tools: {
      calculator: "Calculator",
      converter: "Converter",
      qc: "QC",
      tracking: "Tracking",
    },
    toolsLabel: "Tools",
  },
} as const;

const languageOptions = ["PL", "EN"] as const;
const currencyOptions = ["PLN", "CNY", "USD", "EUR"] as const;
const agentOptions = ["BBDBUY", "KAKOBUY", "USFANS", "ACBUY"] as const;

const languageMeta: Record<
  (typeof languageOptions)[number],
  { icon: string; label: string }
> = {
  PL: {
    icon: "pl_flag.png",
    label: "Polski",
  },
  EN: {
    icon: "uk_flag.png",
    label: "English",
  },
};

const agentMeta: Record<
  (typeof agentOptions)[number],
  { icon: string; accent: string }
> = {
  BBDBUY: {
    icon: "/agents/BBDBUY_icon.png",
    accent: "from-transparent to-transparent",
  },
  KAKOBUY: {
    icon: "/agents/kako_icon.png",
    accent: "from-transparent to-transparent",
  },
  USFANS: {
    icon: "/agents/usfans_icon.png",
    accent: "from-transparent to-transparent",
  },
  ACBUY: {
    icon: "/agents/acb_icon.png",
    accent: "from-transparent to-transparent",
  },
};

type RepdockSettings = {
  language: (typeof languageOptions)[number];
  currency: (typeof currencyOptions)[number];
  agent: (typeof agentOptions)[number];
};

type DiscordUser = {
  id: string;
  username: string;
  globalName: string | null;
  avatarUrl: string;
  isAdmin: boolean;
};

type FavoritePreviewCache = {
  productIds?: string[];
  products?: W2CProduct[];
  savedAt?: number;
};

const favoritePreviewStorageKey = "repdock-w2c-favorites-preview";

export function NavbarDemo() {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const copy = useLanguageCopy(navbarCopy);
  const navItems = navLinks.map((item) => ({
    link: item.link,
    name: copy.nav[item.key],
  }));
  const toolItems = toolLinks.map((item) => ({
    link: item.link,
    name: copy.tools[item.key],
  }));

  return (
    <div className="relative w-full">
      <Navbar>
        {/* Desktop Navigation */}
        <NavBody>
          <NavbarLogo />
          <DesktopNav
            navItems={navItems}
            toolItems={toolItems}
            toolsLabel={copy.toolsLabel}
          />
          <div className="relative z-30 flex items-center gap-4">
            <FavoritesPreviewButton />
            <SettingsDrawerTrigger />
            <AuthControl />
          </div>
        </NavBody>

        {/* Mobile Navigation */}
        <MobileNav>
          <MobileNavHeader>
            <NavbarLogo />
            <MobileNavToggle
              isOpen={isMobileMenuOpen}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            />
          </MobileNavHeader>

          <MobileNavMenu
            isOpen={isMobileMenuOpen}
            onClose={() => setIsMobileMenuOpen(false)}
          >
            {navItems.slice(0, 2).map((item) => (
              <a
                key={`mobile-link-${item.name}`}
                href={item.link}
                onClick={() => setIsMobileMenuOpen(false)}
                className="relative text-neutral-300"
              >
                <span className="block">{item.name}</span>
              </a>
            ))}
            <div className="grid w-full gap-3">
              <span className="text-sm font-medium text-white">{copy.toolsLabel}</span>
              <div className="grid gap-2 border-l border-white/10 pl-3">
                {toolItems.map((item) => (
                  <a
                    key={`mobile-tool-${item.name}`}
                    href={item.link}
                    onClick={() => setIsMobileMenuOpen(false)}
                    className="text-sm text-neutral-300 transition hover:text-white"
                  >
                    {item.name}
                  </a>
                ))}
              </div>
            </div>
            <a
              href="/tiktok-items"
              onClick={() => setIsMobileMenuOpen(false)}
              className="relative text-neutral-300"
            >
              <span className="block">{copy.nav.tiktokItems}</span>
            </a>
            <div className="flex w-full flex-col gap-4">
              <FavoritesPreviewButton
                mobile
                onNavigate={() => setIsMobileMenuOpen(false)}
              />
              <SettingsDrawerTrigger
                className="flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
                label={copy.settings.trigger}
              />
              <AuthControl
                mobile
                onNavigate={() => setIsMobileMenuOpen(false)}
              />
            </div>
          </MobileNavMenu>
        </MobileNav>
      </Navbar>

      {/* Navbar */}
    </div>
  );
}

function FavoritesPreviewButton({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const copy = useLanguageCopy(navbarCopy).favorites;
  const [open, setOpen] = useState(false);
  const [loginOpen, setLoginOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [products, setProducts] = useState<W2CProduct[]>([]);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  const applyCachedFavorites = () => {
    const cached = readFavoritePreviewCache();

    if (!cached) {
      return;
    }

    const cachedProducts = cached.products ?? [];
    setProducts(cachedProducts);
    setFavoriteCount(cached.productIds?.length ?? cachedProducts.length);
  };

  const loadFavorites = async ({
    promptLogin = false,
    showLoading = false,
  }: {
    promptLogin?: boolean;
    showLoading?: boolean;
  } = {}) => {
    if (showLoading) {
      setLoading(true);
    }

    try {
      const response = await fetch("/api/w2c/favorites");

      if (response.status === 401) {
        setOpen(false);
        if (promptLogin) {
          setLoginOpen(true);
        }
        setProducts([]);
        setFavoriteCount(0);
        clearFavoritePreviewCache();
        return false;
      }

      if (!response.ok) {
        return true;
      }

      const data = (await response.json()) as { productIds?: string[]; products?: W2CProduct[] };
      const nextProducts = data.products ?? [];
      setProducts(nextProducts);
      setFavoriteCount(data.productIds?.length ?? nextProducts.length);
      writeFavoritePreviewCache({
        productIds: data.productIds ?? nextProducts.map((product) => product.id),
        products: nextProducts,
        savedAt: Date.now(),
      });
      return true;
    } finally {
      if (showLoading) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    applyCachedFavorites();
    void loadFavorites();
  }, []);

  useEffect(() => {
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  useEffect(() => {
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

  const toggleOpen = async () => {
    if (open) {
      setOpen(false);
      return;
    }

    const canOpen = await loadFavorites({ promptLogin: true, showLoading: true });
    if (canOpen) {
      setOpen(true);
    }
  };

  return (
    <div className={mobile ? "relative w-full" : "relative"} ref={menuRef}>
      <button
        type="button"
        onClick={toggleOpen}
        aria-label={copy.open}
        className={
          mobile
            ? "relative flex w-full items-center justify-center gap-2 rounded-md border border-white/10 px-4 py-2 text-sm font-bold text-white transition hover:bg-white/10"
            : "relative grid size-10 place-items-center rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08]"
        }
      >
        {favoriteCount ? <IconHeartFilled className="size-5 text-red-400" /> : <IconHeart className="size-5" />}
        {favoriteCount ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-red-500 px-1.5 text-[10px] font-black text-white">
            {favoriteCount}
          </span>
        ) : null}
        {mobile ? <span>{copy.open}</span> : null}
      </button>

      {open ? (
        <div
          className={`absolute z-50 mt-3 w-80 rounded-2xl border border-white/10 bg-neutral-950/95 p-3 text-sm text-white shadow-2xl backdrop-blur-xl ${
            mobile ? "left-0 right-0 w-full" : "right-0"
          }`}
        >
          <div className="mb-3 flex items-center justify-between gap-3">
            <p className="font-semibold text-white">{copy.title}</p>
            <span className="rounded-full bg-white/[0.06] px-2 py-1 text-xs font-bold text-slate-400">
              {favoriteCount}
            </span>
          </div>

          {loading ? (
            <div className="grid place-items-center py-8 text-slate-500">
              <IconLoader2 className="size-5 animate-spin" />
            </div>
          ) : products.length ? (
            <div className="grid max-h-96 gap-2 overflow-y-auto pr-1">
              {products.map((product) => (
                <a
                  key={product.id}
                  href={`/w2c/${encodeURIComponent(product.id)}`}
                  onClick={onNavigate}
                  className="grid grid-cols-[54px_minmax(0,1fr)_auto] items-center gap-3 rounded-2xl border border-white/10 bg-white/[0.035] p-2 transition hover:border-blue-300/30 hover:bg-blue-500/10"
                >
                  <SmartImage src={getWebpImageUrl(product.image)} alt="" className="size-14 rounded-xl object-cover" />
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-semibold text-white">{product.name}</span>
                    <span className="mt-1 block truncate text-xs text-slate-500">
                      {product.metadata.brand} / {product.metadata.category}
                    </span>
                  </span>
                  <IconShoppingBag className="size-4 text-slate-500" />
                </a>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4 text-sm text-slate-500">
              {copy.empty}
            </div>
          )}
        </div>
      ) : null}

      <LoginRequiredDialog
        open={loginOpen}
        title={copy.loginTitle}
        description={copy.loginDescription}
        actionLabel={copy.loginAction}
        closeLabel={copy.close}
        onClose={() => setLoginOpen(false)}
      />
    </div>
  );
}

function readFavoritePreviewCache() {
  try {
    const rawValue = globalThis.localStorage?.getItem(favoritePreviewStorageKey);

    if (!rawValue) {
      return null;
    }

    const parsedValue = JSON.parse(rawValue) as FavoritePreviewCache;
    const products = Array.isArray(parsedValue.products) ? parsedValue.products : [];
    const productIds = Array.isArray(parsedValue.productIds) ? parsedValue.productIds : products.map((product) => product.id);

    return {
      productIds,
      products,
      savedAt: Number(parsedValue.savedAt) || 0,
    } satisfies FavoritePreviewCache;
  } catch {
    clearFavoritePreviewCache();
    return null;
  }
}

function writeFavoritePreviewCache(cache: FavoritePreviewCache) {
  try {
    globalThis.localStorage?.setItem(favoritePreviewStorageKey, JSON.stringify(cache));
  } catch {
    // Cache is only a fast visual hint for the navbar.
  }
}

function clearFavoritePreviewCache() {
  try {
    globalThis.localStorage?.removeItem(favoritePreviewStorageKey);
  } catch {
    // Cache cleanup should never block rendering.
  }
}

function AuthControl({
  mobile = false,
  onNavigate,
}: {
  mobile?: boolean;
  onNavigate?: () => void;
}) {
  const copy = useLanguageCopy(navbarCopy).auth;
  const [user, setUser] = useState<DiscordUser | null>(null);
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

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
    const onPointerDown = (event: PointerEvent) => {
      if (!menuRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    document.addEventListener("pointerdown", onPointerDown);

    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const logout = async () => {
    await fetch("/api/auth/logout", {
      method: "POST",
    });
    setUser(null);
    setOpen(false);
    onNavigate?.();
  };

  if (!user) {
    return (
      <NavbarButton
        onClick={onNavigate}
        variant="primary"
        href="/api/auth/discord/login"
        className={`inline-flex items-center justify-center gap-2 bg-[#5865F2] text-white shadow-[0_10px_35px_rgba(88,101,242,0.38)] hover:bg-[#4752C4] ${
          mobile ? "w-full" : "rounded-full px-4"
        }`}
      >
        <DiscordLogo className="size-5" />
        {copy.login}
      </NavbarButton>
    );
  }

  return (
    <div className={mobile ? "relative w-full" : "relative"} ref={menuRef}>
      <button
        type="button"
        onClick={() => setOpen((current) => !current)}
        className={`flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] text-white transition hover:bg-white/[0.08] ${
          mobile ? "w-full justify-center px-4 py-2" : "p-1 pr-3"
        }`}
      >
        <SmartImage
          src={user.avatarUrl}
          alt=""
          className="size-8 rounded-full object-cover ring-1 ring-white/15"
        />
        <span
          className={
            mobile
              ? "text-sm font-semibold"
              : "hidden max-w-24 truncate text-sm font-semibold lg:block"
          }
        >
          {user.globalName ?? user.username}
        </span>
      </button>

      {open ? (
        <div
          className={`absolute z-50 mt-3 min-w-48 rounded-2xl border border-white/10 bg-neutral-950/95 p-2 text-sm text-white shadow-2xl backdrop-blur-xl ${
            mobile ? "left-0 right-0" : "right-0"
          }`}
        >
          {user.isAdmin ? (
            <a
              href="/admin"
              onClick={onNavigate}
              className="flex items-center gap-2 rounded-xl px-3 py-2 text-blue-200 transition hover:bg-blue-500/15 hover:text-white"
            >
              <SmartImage
                src="/moderatoricon.png"
                alt=""
                className="size-6 shrink-0 object-contain"
              />
              {copy.admin}
            </a>
          ) : null}
          <button
            type="button"
            disabled
            title={copy.profileDisabled}
            className="flex w-full cursor-not-allowed items-center gap-2 rounded-xl px-3 py-2 text-left text-neutral-600 opacity-60"
          >
            <IconUser className="size-4" stroke={1.8} />
            {copy.profile}
          </button>
          <button
            type="button"
            onClick={logout}
            className="flex w-full items-center gap-2 rounded-xl px-3 py-2 text-left text-red-200 transition hover:bg-red-500/15 hover:text-white"
          >
            <IconLogout className="size-4" stroke={1.8} />
            {copy.logout}
          </button>
        </div>
      ) : null}
    </div>
  );
}

function SettingsDrawerTrigger({
  className,
  label,
  onClick,
  onSave,
}: {
  className?: string;
  label?: string;
  onClick?: () => void;
  onSave?: () => void;
}) {
  const copy = useLanguageCopy(navbarCopy).settings;
  const [language, setLanguage] =
    useState<(typeof languageOptions)[number]>("PL");
  const [currency, setCurrency] =
    useState<(typeof currencyOptions)[number]>("PLN");
  const [agent, setAgent] = useState<(typeof agentOptions)[number]>("BBDBUY");

  useEffect(() => {
    const savedSettings = window.localStorage.getItem(settingsStorageKey);

    if (!savedSettings) {
      return;
    }

    try {
      const parsedSettings = JSON.parse(
        savedSettings,
      ) as Partial<RepdockSettings>;

      if (
        parsedSettings.language &&
        languageOptions.includes(parsedSettings.language)
      ) {
        setLanguage(parsedSettings.language);
      }

      if (
        parsedSettings.currency &&
        currencyOptions.includes(parsedSettings.currency)
      ) {
        setCurrency(parsedSettings.currency);
      }

      if (parsedSettings.agent && agentOptions.includes(parsedSettings.agent)) {
        setAgent(parsedSettings.agent);
      }
    } catch {
      window.localStorage.removeItem(settingsStorageKey);
    }
  }, []);

  const saveSettings = () => {
    const settings: RepdockSettings = {
      language,
      currency,
      agent,
    };

    window.localStorage.setItem(settingsStorageKey, JSON.stringify(settings));
    window.dispatchEvent(new Event("repdock-settings-updated"));
    onSave?.();
  };

  return (
    <SmoothDrawer
      title={copy.title}
      description={copy.description}
      secondaryButtonText={copy.save}
      onCloseAction={saveSettings}
      showPrimaryAction={false}
      showPrice={false}
      trigger={
        <button
          type="button"
          aria-label={copy.trigger}
          onClick={onClick}
          className={
            className ??
            "grid size-10 place-items-center rounded-full border border-white/10 p-0 text-white/80 transition hover:bg-white/10 hover:text-white"
          }
        >
          <IconAdjustmentsHorizontalFilled className="size-5" stroke={1.8} />
          {label ? <span>{label}</span> : null}
        </button>
      }
    >
      <div className="grid gap-5">
        <SettingsSection
          iconType="language"
          title={copy.languageTitle}
          description={copy.languageDescription}
        >
          <div className="grid grid-cols-2 gap-2">
            {languageOptions.map((option) => (
              <SettingsOption
                active={language === option}
                icon={languageMeta[option].icon}
                key={option}
                subtitle={languageMeta[option].label}
                onClick={() => setLanguage(option)}
              >
                {option}
              </SettingsOption>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          iconType="currency"
          title={copy.currencyTitle}
          description={copy.currencyDescription}
        >
          <div className="grid grid-cols-4 rounded-2xl bg-black/35 p-1 ring-1 ring-white/10">
            {currencyOptions.map((option) => (
              <SettingsOption
                active={currency === option}
                key={option}
                onClick={() => setCurrency(option)}
              >
                {option}
              </SettingsOption>
            ))}
          </div>
        </SettingsSection>

        <SettingsSection
          iconType="agent"
          title={copy.agentTitle}
          description={copy.agentDescription}
        >
          <div className="grid grid-cols-2 gap-2">
            {agentOptions.map((option) => (
              <SettingsOption
                active={agent === option}
                icon={agentMeta[option].icon}
                iconAccent={agentMeta[option].accent}
                key={option}
                onClick={() => setAgent(option)}
              >
                {option}
              </SettingsOption>
            ))}
          </div>
        </SettingsSection>
      </div>
    </SmoothDrawer>
  );
}

function SettingsSection({
  title,
  description,
  children,
  iconType,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
  iconType: "agent" | "currency" | "language";
}) {
  const icons = {
    agent: IconTruck,
    currency: IconCurrencyYuan,
    language: IconFlagQuestion,
  };
  const Icon = icons[iconType];

  return (
    <section className="grid gap-3">
      <div className="flex items-start gap-3">
        {Icon ? (
          <span className="mt-0.5 grid size-9 shrink-0 place-items-center rounded-2xl bg-white/[0.06] text-blue-300 ring-1 ring-white/10">
            <Icon className="size-4" stroke={1.8} />
          </span>
        ) : null}
        <div className="min-w-0">
          <h3 className="text-sm font-semibold tracking-tight text-white">
            {title}
          </h3>
          <p className="mt-0.5 text-xs leading-relaxed text-zinc-500">
            {description}
          </p>
        </div>
      </div>
      {children}
    </section>
  );
}

function SettingsOption({
  active,
  children,
  icon,
  iconAccent = "from-blue-400 to-indigo-500",
  subtitle,
  onClick,
}: Readonly<{
  active: boolean;
  children: React.ReactNode;
  icon?: string;
  iconAccent?: string;
  subtitle?: string;
  onClick: () => void;
}>) {
  const iconIsImage =
    typeof icon === "string" && /\.(png|jpe?g|webp|svg)$/i.test(icon);
  const iconSrc =
    iconIsImage && icon
      ? icon.startsWith("/")
        ? icon
        : `/${icon}`
      : undefined;

  return (
    <button
      type="button"
      onClick={onClick}
      className={`group relative min-h-10 overflow-hidden rounded-2xl border px-3 py-2 text-sm font-semibold transition ${
        active
          ? "border-blue-400/50 bg-gradient-to-b from-blue-500/25 to-blue-700/15 text-white shadow-[0_8px_26px_rgba(41,52,255,0.3)]"
          : "border-white/10 bg-white/[0.035] text-zinc-400 hover:border-white/20 hover:bg-white/[0.07] hover:text-white"
      }`}
    >
      <span
        className={`relative z-10 flex items-center gap-2 ${icon ? "justify-start" : "justify-center"}`}
      >
        {icon ? (
          <span
            className={`grid size-8 shrink-0 place-items-center overflow-hidden rounded-xl ${
              iconSrc
                ? "bg-white/[0.06] ring-1 ring-white/10"
                : `bg-gradient-to-br ${iconAccent}`
            } text-[11px] font-black text-white shadow-inner`}
          >
            {iconSrc ? (
              <SmartImage src={iconSrc} alt="" className="size-full object-cover" />
            ) : (
              icon
            )}
          </span>
        ) : null}
        <span className={icon ? "min-w-0 text-left" : "min-w-0 text-center"}>
          <span className="block leading-tight">{children}</span>
          {subtitle ? (
            <span className="mt-0.5 block text-[11px] font-medium leading-tight text-zinc-400">
              {subtitle}
            </span>
          ) : null}
        </span>
      </span>
      {active ? (
        <span className="absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-white/60 to-transparent" />
      ) : null}
    </button>
  );
}

function DesktopNav({
  navItems,
  toolItems,
  toolsLabel,
}: {
  navItems: Array<{ link: string; name: string }>;
  toolItems: Array<{ link: string; name: string }>;
  toolsLabel: string;
}) {
  return (
    <div className="pointer-events-none absolute inset-0 hidden flex-1 flex-row items-center justify-center space-x-2 text-sm font-medium text-neutral-300 lg:flex lg:space-x-2">
      <NavLink href="/w2c">{navItems[0]?.name ?? "W2C"}</NavLink>
      <NavLink href="/outfits">{navItems[1]?.name ?? "Outfits"}</NavLink>
      <div className="group pointer-events-auto relative">
        <button type="button" className="relative flex items-center gap-1 rounded-full px-4 py-2 text-neutral-300 transition hover:bg-neutral-800 hover:text-white">
          {toolsLabel}
          <IconChevronDown
            className="size-4 transition group-hover:rotate-180"
            stroke={1.8}
          />
        </button>
        <div className="absolute left-0 top-full h-3 w-full" />
        <div className="invisible absolute left-1/2 top-full z-50 mt-2 w-44 -translate-x-1/2 rounded-xl border border-white/10 bg-neutral-950/95 p-2 opacity-0 shadow-2xl backdrop-blur-xl transition group-hover:visible group-hover:opacity-100">
          {toolItems.map((item) => (
            <a
              key={item.name}
              href={item.link}
              className="block rounded-lg px-3 py-2 text-sm text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
            >
              {item.name}
            </a>
          ))}
        </div>
      </div>
      <NavLink href="/tiktok-items">{navItems[2]?.name ?? "TikTok Items"}</NavLink>
    </div>
  );
}

function NavLink({
  href,
  children,
}: Readonly<{
  href: string;
  children: React.ReactNode;
}>) {
  return (
    <a
      className="pointer-events-auto relative rounded-full px-4 py-2 text-neutral-300 transition hover:bg-neutral-800 hover:text-white"
      href={href}
    >
      {children}
    </a>
  );
}

function DiscordLogo(props: Readonly<React.ComponentProps<"svg">>) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" {...props}>
      <path d="M20.317 4.369A19.79 19.79 0 0 0 15.466 3c-.21.375-.456.88-.624 1.28a18.27 18.27 0 0 0-5.487 0A12.64 12.64 0 0 0 8.73 3a19.74 19.74 0 0 0-4.853 1.37C.787 8.963-.048 13.442.37 17.858A19.9 19.9 0 0 0 6.314 20.9c.48-.65.908-1.34 1.275-2.061a12.98 12.98 0 0 1-2.008-.963c.168-.122.332-.25.49-.38a14.24 14.24 0 0 0 11.858 0c.16.13.323.258.49.38-.642.38-1.315.704-2.012.965.367.72.794 1.41 1.274 2.059a19.86 19.86 0 0 0 5.948-3.042c.49-5.12-.838-9.558-3.312-13.489ZM8.02 15.162c-1.16 0-2.11-1.064-2.11-2.372 0-1.306.93-2.37 2.11-2.37 1.19 0 2.13 1.074 2.11 2.37 0 1.308-.93 2.372-2.11 2.372Zm7.96 0c-1.16 0-2.11-1.064-2.11-2.372 0-1.306.93-2.37 2.11-2.37 1.19 0 2.13 1.074 2.11 2.37 0 1.308-.92 2.372-2.11 2.372Z" />
    </svg>
  );
}