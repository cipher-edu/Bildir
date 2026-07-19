export const LOCALES = ["uz", "ru", "en", "kaa"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "uz";
export const LOCALE_STORAGE_KEY = "bildir_locale";

export const LOCALE_LABELS: Record<Locale, string> = {
  uz: "Oʻzbekcha",
  ru: "Русский",
  en: "English",
  kaa: "Qaraqalpaqsha",
};

export const LOCALE_FLAGS: Record<Locale, string> = {
  uz: "UZ",
  ru: "RU",
  en: "EN",
  kaa: "KK",
};

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

export function pickLocalized(
  base: string | null | undefined,
  i18n: Record<string, string> | null | undefined,
  locale: Locale,
  fallbacks: Locale[] = ["uz", "ru", "en", "kaa"]
): string {
  if (i18n && typeof i18n === "object") {
    if (i18n[locale]?.trim()) return i18n[locale];
    for (const fb of fallbacks) {
      if (i18n[fb]?.trim()) return i18n[fb];
    }
  }
  return (base || "").trim();
}
