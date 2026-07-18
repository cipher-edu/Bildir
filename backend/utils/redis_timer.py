"""
OsiyoNigohi — Redis Timer Utilities (async)
FastAPI exam_engine.core.redis o'rnini bosadi.
Django Channels consumerlari tomonidan ishlatiladi.
"""
import redis.asyncio as aioredis
from django.conf import settings


_redis: aioredis.Redis | None = None


async def get_redis() -> aioredis.Redis:
    global _redis
    if _redis is None:
        url = getattr(settings, "REDIS_TIMER_URL", "redis://redis:6379/5")
        _redis = aioredis.from_url(url, decode_responses=True)
    return _redis


async def set_timer(session_id: str, remaining_sec: int) -> None:
    r = await get_redis()
    # TTL: qolgan vaqt + 60s buffer
    await r.setex(f"timer:{session_id}", remaining_sec + 60, remaining_sec)


async def get_timer(session_id: str) -> int | None:
    r = await get_redis()
    val = await r.get(f"timer:{session_id}")
    return int(val) if val is not None else None


async def decrement_timer(session_id: str) -> int:
    r = await get_redis()
    val = await r.decr(f"timer:{session_id}")
    return max(0, int(val))


async def set_session_active(session_id: str, duration: int) -> None:
    r = await get_redis()
    await r.setex(f"session:active:{session_id}", duration + 120, "1")


async def is_session_active(session_id: str) -> bool:
    r = await get_redis()
    return bool(await r.exists(f"session:active:{session_id}"))


async def terminate_session(session_id: str) -> None:
    r = await get_redis()
    await r.delete(f"timer:{session_id}", f"session:active:{session_id}")


async def save_answer(session_id: str, question_id: str, answer: str) -> None:
    """30 soniyada bir auto-save uchun — imtihon yakunida Django'ga yoziladi."""
    r = await get_redis()
    key = f"answers:{session_id}"
    await r.hset(key, question_id, answer)
    await r.expire(key, 7200)  # 2 soat TTL


async def get_all_answers(session_id: str) -> dict:
    r = await get_redis()
    return await r.hgetall(f"answers:{session_id}")


async def clear_answers(session_id: str) -> None:
    r = await get_redis()
    await r.delete(f"answers:{session_id}")
