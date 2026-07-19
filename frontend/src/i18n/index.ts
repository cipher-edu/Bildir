import type { Locale } from "./config";
import type { Dict } from "./locales/uz";
import uz from "./locales/uz";
import ru from "./locales/ru";
import en from "./locales/en";
import kaa from "./locales/kaa";

const DICTS: Record<Locale, Dict> = { uz, ru, en, kaa };

export function getDict(locale: Locale): Dict {
  return DICTS[locale] || uz;
}

/** Nested key: "nav.home", "admin.kpi.title" */
export function translate(dict: Dict, key: string): string {
  const parts = key.split(".");
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let cur: any = dict;
  for (const p of parts) {
    if (cur == null || typeof cur !== "object") return key;
    cur = cur[p];
  }
  return typeof cur === "string" ? cur : key;
}

export type { Dict };
export { DICTS };
