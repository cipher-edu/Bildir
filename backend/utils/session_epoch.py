"""Parol almashganda eski access va refresh tokenlarni bir zumda yaroqsiz qilish.

Token ichidagi `epoch` cache dagi qiymatga teng bo‘lmasa, sessiya rad etiladi.
"""
from __future__ import annotations

from django.core.cache import cache

EPOCH_PREFIX = "session_epoch:"
# Refresh muddatidan ancha uzoq. Kalit tushib ketsa, epoch 0 ga qaytadi va
# parol almashishidan oldingi (epoch 0) tokenlar yana yashashi mumkin.
EPOCH_TTL_SECONDS = 60 * 60 * 24 * 400


def _key(user_id) -> str:
    return f"{EPOCH_PREFIX}{user_id}"


def current_epoch(user_id) -> int:
    raw = cache.get(_key(user_id))
    try:
        return int(raw or 0)
    except (TypeError, ValueError):
        return 0


def bump_epoch(user_id) -> int:
    key = _key(user_id)
    try:
        return int(cache.incr(key))
    except ValueError:
        cache.set(key, 1, timeout=EPOCH_TTL_SECONDS)
        return 1


def token_epoch_ok(user_id, token_epoch) -> bool:
    if not user_id:
        return False
    try:
        got = int(0 if token_epoch is None else token_epoch)
    except (TypeError, ValueError):
        got = 0
    return got == current_epoch(user_id)
