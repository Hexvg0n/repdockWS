"use client";

import { useEffect, useState } from "react";

export const settingsStorageKey = "repdock-settings";

export type RepdockLanguage = "PL" | "EN";

type StoredSettings = {
  agent?: string;
  currency?: string;
  language?: string;
};

function readLanguage(): RepdockLanguage {
  if (typeof window === "undefined") {
    return "PL";
  }

  try {
    const settings = JSON.parse(
      window.localStorage.getItem(settingsStorageKey) ?? "{}",
    ) as StoredSettings;

    return settings.language === "EN" ? "EN" : "PL";
  } catch {
    return "PL";
  }
}

export function useRepdockLanguage() {
  const [language, setLanguage] = useState<RepdockLanguage>("PL");

  useEffect(() => {
    const syncLanguage = () => {
      const nextLanguage = readLanguage();
      setLanguage(nextLanguage);
      document.documentElement.lang = nextLanguage.toLowerCase();
    };

    syncLanguage();

    window.addEventListener("focus", syncLanguage);
    window.addEventListener("storage", syncLanguage);
    window.addEventListener("repdock-settings-updated", syncLanguage);

    return () => {
      window.removeEventListener("focus", syncLanguage);
      window.removeEventListener("storage", syncLanguage);
      window.removeEventListener("repdock-settings-updated", syncLanguage);
    };
  }, []);

  return language;
}

export function useLanguageCopy<T extends Record<RepdockLanguage, unknown>>(
  copy: T,
): T[RepdockLanguage] {
  const language = useRepdockLanguage();

  return copy[language];
}
