"""
Django management command: PostgreSQL va Redis tayyor bo'lguncha kutish.
Docker Compose da servislar container dan oldin ishga tushishni oldini oladi.
"""
import time
from django.conf import settings
from django.core.management.base import BaseCommand
from django.db import connection
from django.db.utils import OperationalError


class Command(BaseCommand):
    help = "PostgreSQL va Redis tayyor bo'lguncha kutadi"

    def handle(self, *args, **options):
        self._wait_postgres()
        self._wait_redis()

    def _wait_postgres(self):
        self.stdout.write("PostgreSQL kutilmoqda...")
        while True:
            try:
                connection.ensure_connection()
                self.stdout.write(self.style.SUCCESS("PostgreSQL tayyor!"))
                return
            except OperationalError:
                self.stdout.write("PostgreSQL hali tayyor emas. 1 soniya kutilmoqda...")
                time.sleep(1)

    def _wait_redis(self):
        import redis
        url = getattr(settings, "REDIS_TIMER_URL", "redis://redis:6379/5")
        self.stdout.write("Redis kutilmoqda...")
        while True:
            try:
                r = redis.from_url(url, socket_connect_timeout=1)
                r.ping()
                r.close()
                self.stdout.write(self.style.SUCCESS("Redis tayyor!"))
                return
            except Exception:
                self.stdout.write("Redis hali tayyor emas. 1 soniya kutilmoqda...")
                time.sleep(1)
