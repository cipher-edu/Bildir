from django.core.management.base import BaseCommand

from apps.compliance.models import ComplianceRisk


class Command(BaseCommand):
    help = "Demo risk reestri (i18n). Email/Telegram yo'q."

    def handle(self, *args, **options):
        samples = [
            {
                "title": "Xaridlar shaffofligi bo'shlig'i",
                "title_i18n": {
                    "uz": "Xaridlar shaffofligi bo'shlig'i",
                    "ru": "Пробел прозрачности закупок",
                    "en": "Procurement transparency gap",
                    "kaa": "Satıp alıw ashıqlıǵı boślıǵı",
                },
                "description": "Demo: xarid jarayonida ochiqlikni kuchaytirish.",
                "description_i18n": {
                    "uz": "Demo: xarid jarayonida ochiqlikni kuchaytirish.",
                    "ru": "Демо: усилить прозрачность закупок.",
                    "en": "Demo: strengthen procurement transparency.",
                    "kaa": "Demo: satıp alıw ashıqlıǵın kúsheytiw.",
                },
                "level": "medium",
                "status": "open",
                "owner_name": "Komplayens",
            },
            {
                "title": "Murojaat SLA kechikishi xavfi",
                "title_i18n": {
                    "uz": "Murojaat SLA kechikishi xavfi",
                    "ru": "Риск просрочки SLA по обращениям",
                    "en": "Appeal SLA delay risk",
                    "kaa": "Múrájat SLA keshigiw qáwpi",
                },
                "description": "72 soatlik javob muddatini nazorat qilish.",
                "description_i18n": {
                    "uz": "72 soatlik javob muddatini nazorat qilish.",
                    "ru": "Контроль 72-часового срока ответа.",
                    "en": "Monitor the 72-hour response deadline.",
                    "kaa": "72 saatlıq juwap múddetin baqlaw.",
                },
                "level": "high",
                "status": "in_progress",
                "owner_name": "Admin",
            },
        ]
        created = 0
        for s in samples:
            _, was = ComplianceRisk.objects.get_or_create(
                title=s["title"],
                defaults=s,
            )
            if was:
                created += 1
        self.stdout.write(
            self.style.SUCCESS(
                f"Compliance risks: +{created}, total={ComplianceRisk.objects.count()}"
            )
        )
