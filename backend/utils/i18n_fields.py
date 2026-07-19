"""
Ko'p tillilik yordamchilari: uz / ru / en / kaa
Asosiy matn maydonlari + i18n JSON (masalan title_i18n).
"""
from __future__ import annotations

from typing import Any

LOCALES = ("uz", "ru", "en", "kaa")
DEFAULT_LOCALE = "uz"


def normalize_locale(raw: str | None) -> str:
    if not raw:
        return DEFAULT_LOCALE
    code = raw.strip().lower().split("-")[0].split("_")[0]
    if code in ("kk", "kaa", "qr", "karakalpak"):
        return "kaa"
    if code in LOCALES:
        return code
    return DEFAULT_LOCALE


def pick_i18n(
    base: str | None,
    i18n: dict | None,
    locale: str | None,
) -> str:
    loc = normalize_locale(locale)
    data = i18n if isinstance(i18n, dict) else {}
    for key in (loc, "uz", "ru", "en", "kaa"):
        val = data.get(key)
        if isinstance(val, str) and val.strip():
            return val.strip()
    return (base or "").strip()


def locale_from_request(request) -> str:
    # ?lang= / Accept-Language / X-Locale
    q = request.query_params.get("lang") or request.query_params.get("locale")
    if q:
        return normalize_locale(q)
    header = request.headers.get("X-Locale") or request.headers.get("Accept-Language")
    if header:
        first = header.split(",")[0].strip()
        return normalize_locale(first)
    return DEFAULT_LOCALE


def merge_i18n_payload(data: dict[str, Any], field: str) -> dict[str, Any]:
    """
    FormData: title_ru, title_en... → title_i18n dict.
    JSON: title_i18n: {ru: ...}
    """
    out = dict(data)
    bucket: dict[str, str] = {}
    existing = out.get(f"{field}_i18n")
    if isinstance(existing, dict):
        bucket.update({k: str(v) for k, v in existing.items() if v is not None})
    elif isinstance(existing, str) and existing.strip().startswith("{"):
        import json

        try:
            parsed = json.loads(existing)
            if isinstance(parsed, dict):
                bucket.update({k: str(v) for k, v in parsed.items() if v is not None})
        except Exception:
            pass
    for loc in LOCALES:
        key = f"{field}_{loc}"
        if key in out and out[key] is not None and str(out[key]).strip():
            bucket[loc] = str(out[key]).strip()
            # form may also send base field as title
    if bucket:
        out[f"{field}_i18n"] = bucket
    return out


def ensure_i18n_bucket(base: str | None, i18n: dict | None) -> dict[str, str]:
    """Base maydonni uz ga qo'yib, to'liq 4 til lug'atini qaytaradi (bo'sh tillar base/uz)."""
    out: dict[str, str] = {}
    if isinstance(i18n, dict):
        for k, v in i18n.items():
            if k in LOCALES and v is not None and str(v).strip():
                out[k] = str(v).strip()
    base_s = (base or "").strip()
    if base_s and "uz" not in out:
        out["uz"] = base_s
    fill = out.get("uz") or base_s
    if fill:
        for loc in LOCALES:
            if loc not in out:
                out[loc] = fill
    return out


def localize_options(options: list | None, locale: str | None) -> list:
    """Option list: har element text_i18n dan tilga mos text oladi."""
    if not options:
        return []
    loc = normalize_locale(locale)
    out = []
    for opt in options:
        if not isinstance(opt, dict):
            continue
        item = dict(opt)
        base = item.get("text") or ""
        i18n = item.get("text_i18n") if isinstance(item.get("text_i18n"), dict) else {}
        item["text"] = pick_i18n(str(base), i18n, loc)
        item["text_i18n"] = ensure_i18n_bucket(str(base), i18n)
        out.append(item)
    return out


# UI status/category labels (API category_label)
NEWS_CATEGORY_I18N = {
    "announcement": {
        "uz": "E'lon",
        "ru": "Объявление",
        "en": "Announcement",
        "kaa": "Járiyalanıw",
    },
    "event": {
        "uz": "Tadbir",
        "ru": "Мероприятие",
        "en": "Event",
        "kaa": "Ish-háreket",
    },
    "regulation": {
        "uz": "Normativ / tartib",
        "ru": "Норматив / порядок",
        "en": "Regulation",
        "kaa": "Normativ / tártip",
    },
    "anti_corruption": {
        "uz": "Halollik / komplayens",
        "ru": "Честность / комплаенс",
        "en": "Integrity / compliance",
        "kaa": "Durıslıq / komplayens",
    },
    "general": {
        "uz": "Umumiy yangilik",
        "ru": "Общая новость",
        "en": "General",
        "kaa": "Ulıwma jańalıq",
    },
}

NEWS_STATUS_I18N = {
    "draft": {"uz": "Qoralama", "ru": "Черновик", "en": "Draft", "kaa": "Qoralama"},
    "published": {
        "uz": "Nashr qilingan",
        "ru": "Опубликовано",
        "en": "Published",
        "kaa": "Járiyalanǵan",
    },
    "archived": {"uz": "Arxiv", "ru": "Архив", "en": "Archived", "kaa": "Arxiv"},
}


def label_i18n(mapping: dict, key: str, locale: str | None, fallback: str = "") -> str:
    loc = normalize_locale(locale)
    row = mapping.get(key) or {}
    return pick_i18n(fallback or key, row, loc)
