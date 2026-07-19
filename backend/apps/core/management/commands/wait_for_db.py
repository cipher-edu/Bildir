"""
PostgreSQL (va ixtiyoriy Redis) tayyor bo'lguncha kutish.
Docker Compose entrypoint da ishlatiladi.
"""
import time

from decouple import config
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "PostgreSQL va (ixtiyoriy) Redis tayyor bo'lguncha kutadi"

    def add_arguments(self, parser):
        parser.add_argument("--timeout", type=int, default=120, help="Maksimal kutish (soniya)")

    def handle(self, *args, **options):
        timeout = options["timeout"]
        self._wait_postgres(timeout)
        if config("WAIT_FOR_REDIS", default=False, cast=bool):
            self._wait_redis(timeout)

    def _wait_postgres(self, timeout: int):
        self.stdout.write("PostgreSQL kutilmoqda...")
        deadline = time.time() + timeout
        while True:
            try:
                connection.ensure_connection()
                self.stdout.write(self.style.SUCCESS("PostgreSQL tayyor!"))
                return
            except OperationalError as e:
                if time.time() >= deadline:
                    raise SystemExit(f"PostgreSQL {timeout}s ichida tayyor bo'lmadi: {e}")
                self.stdout.write("  hali tayyor emas — 1s...")
                time.sleep(1)

    def _wait_redis(self, timeout: int):
        import redis
        from django.conf import settings

        url = getattr(settings, "REDIS_TIMER_URL", None) or getattr(settings, "REDIS_URL", "")
        if not url:
            self.stdout.write(self.style.WARNING("Redis URL yo'q — o'tkazib yuborildi"))
            return

        self.stdout.write(f"Redis kutilmoqda ({url})...")
        deadline = time.time() + timeout
        while True:
            try:
                r = redis.from_url(url, socket_connect_timeout=2)
                r.ping()
                r.close()
                self.stdout.write(self.style.SUCCESS("Redis tayyor!"))
                return
            except Exception as e:
                if time.time() >= deadline:
                    raise SystemExit(f"Redis {timeout}s ichida tayyor bo'lmadi: {e}")
                self.stdout.write("  hali tayyor emas — 1s...")
                time.sleep(1)
