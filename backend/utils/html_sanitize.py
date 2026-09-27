"""Yangilik HTML i uchun qat'iy allowlist.

Skript, hodisa atributlari va javascript: havolalar tushirib qoldiriladi.
"""
from __future__ import annotations

import re
from html.parser import HTMLParser

ALLOWED_TAGS = {
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li", "a", "h1", "h2", "h3", "h4",
    "blockquote", "code", "pre", "span", "div",
    "table", "thead", "tbody", "tr", "th", "td",
    "img", "hr", "sub", "sup",
}
VOID_TAGS = {"br", "img", "hr"}
DROP_WITH_CONTENT = {"script", "style", "iframe", "object", "embed", "svg", "math", "link", "meta"}
GLOBAL_ATTRS = {"class"}
TAG_ATTRS = {
    "a": {"href", "title"},
    "img": {"src", "alt", "title"},
    "td": {"colspan", "rowspan"},
    "th": {"colspan", "rowspan"},
}
_SAFE_URL = re.compile(r"^(https?:|mailto:|/media/|/|#)", re.IGNORECASE)


def _clean_url(value: str) -> str | None:
    v = re.sub(r"[\x00-\x20]+", "", value or "")
    if not v:
        return None
    lowered = v.lower()
    if lowered.startswith("javascript:") or lowered.startswith("data:") or lowered.startswith("vbscript:"):
        return None
    if _SAFE_URL.match(v):
        return v
    return None


def _esc_attr(value: str) -> str:
    return (
        str(value)
        .replace("&", "&amp;")
        .replace('"', "&quot;")
        .replace("<", "&lt;")
        .replace(">", "&gt;")
    )


class _Sanitizer(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.out: list[str] = []
        self.skip = 0

    def handle_starttag(self, tag, attrs):
        tag = (tag or "").lower()
        if tag in DROP_WITH_CONTENT:
            self.skip += 1
            return
        if self.skip or tag not in ALLOWED_TAGS:
            return
        allowed = GLOBAL_ATTRS | TAG_ATTRS.get(tag, set())
        clean: list[str] = []
        for key, val in attrs:
            if not key:
                continue
            key = key.lower()
            if key.startswith("on") or key not in allowed or val is None:
                continue
            if key in {"href", "src"}:
                val = _clean_url(str(val))
                if not val:
                    continue
            else:
                val = _esc_attr(val)
            clean.append(f'{key}="{val}"')
        attr = (" " + " ".join(clean)) if clean else ""
        if tag == "a":
            self.out.append(f'<a{attr} rel="noopener noreferrer">')
        elif tag in VOID_TAGS:
            self.out.append(f"<{tag}{attr}>")
        else:
            self.out.append(f"<{tag}{attr}>")

    def handle_endtag(self, tag):
        tag = (tag or "").lower()
        if tag in DROP_WITH_CONTENT:
            if self.skip:
                self.skip -= 1
            return
        if self.skip or tag not in ALLOWED_TAGS or tag in VOID_TAGS:
            return
        self.out.append(f"</{tag}>")

    def handle_data(self, data):
        if self.skip or not data:
            return
        self.out.append(data.replace("&", "&amp;").replace("<", "&lt;").replace(">", "&gt;"))


def sanitize_html(value: str | None) -> str:
    if not value:
        return ""
    parser = _Sanitizer()
    parser.feed(str(value))
    parser.close()
    return "".join(parser.out)


def sanitize_i18n_html(value):
    if not isinstance(value, dict):
        return value
    out = {}
    for key, item in value.items():
        out[key] = sanitize_html(item) if isinstance(item, str) else item
    return out
