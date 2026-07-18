import re as _re

_NUL_RE = _re.compile(r"[\x00]")


def safe_int(val, default, minimum=1, maximum=None):
    try:
        v = int(val)
    except (TypeError, ValueError):
        return default
    v = max(v, minimum)
    if maximum is not None:
        v = min(v, maximum)
    return v


def clean_search(raw):
    if not raw:
        return ""
    return _NUL_RE.sub("", raw).strip()
