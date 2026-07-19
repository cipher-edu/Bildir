"""
Xavfsizlik texnik xizmati:
  - muddati o'tgan JWT blacklist yozuvlarini tozalash
  - (kelajakda boshqa maintenance)

  python manage.py security_maintenance
  python manage.py security_maintenance --quiet
"""
from __future__ import annotations

from io import StringIO

from django.core.management import call_command
from django.core.management.base import BaseCommand


class Command(BaseCommand):
    help = "JWT blacklist flush va boshqa xavfsizlik maintenance"

    def add_arguments(self, parser):
        parser.add_argument(
            "--quiet",
            action="store_true",
            help="Minimal chiqish",
        )

    def handle(self, *args, **options):
        quiet = options["quiet"]
        out = StringIO() if quiet else self.stdout

        try:
            call_command("flushexpiredtokens", stdout=out)
            if not quiet:
                self.stdout.write(self.style.SUCCESS("flushexpiredtokens: OK"))
        except Exception as e:
            self.stderr.write(self.style.WARNING(f"flushexpiredtokens: {e}"))

        if not quiet:
            self.stdout.write(self.style.SUCCESS("security_maintenance tugadi"))
