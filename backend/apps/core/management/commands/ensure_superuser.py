"""
Docker/entrypoint: SUPERUSER_EMAIL + SUPERUSER_PASSWORD dan superadmin yaratish/yangilash.
"""
from decouple import config
from django.core.management.base import BaseCommand

from apps.users.models import User


# Repo tarixida qolgan ochiq standart. Yangi o'rnatishda qabul qilinmaydi.
# Mavjud hisob shu parolda turgan bo'lsa va env da boshqa parol bo'lsa, bir marta almashtiriladi.
_KNOWN_DEFAULT_PASSWORDS = {"SuperAdmin2026!"}


class Command(BaseCommand):
    help = "Superadmin yo'q bo'lsa yaratadi. Mavjud parolni har safar qayta yozmaydi."

    def handle(self, *args, **options):
        email = config("SUPERUSER_EMAIL", default="superadmin@ndu.uz")
        password = config("SUPERUSER_PASSWORD", default="")
        first = config("SUPERUSER_FIRST_NAME", default="Super")
        last = config("SUPERUSER_LAST_NAME", default="Admin")

        if not email:
            self.stdout.write(self.style.WARNING("SUPERUSER_EMAIL bo'sh — o'tkazib yuborildi"))
            return

        user = User.objects.filter(email=email).first()
        if user:
            upgraded = False
            if (
                password
                and password not in _KNOWN_DEFAULT_PASSWORDS
                and any(user.check_password(old) for old in _KNOWN_DEFAULT_PASSWORDS)
            ):
                user.set_password(password)
                upgraded = True
            user.role = User.Role.SUPERADMIN
            user.is_staff = True
            user.is_superuser = True
            user.is_active = True
            user.save()
            note = "standart parol almashtirildi" if upgraded else "parol tegilmadi"
            self.stdout.write(self.style.SUCCESS(f"Superadmin mavjud ({note}): {email}"))
            return

        if not password or password in _KNOWN_DEFAULT_PASSWORDS or len(password) < 12:
            self.stdout.write(
                self.style.WARNING(
                    "SUPERUSER_PASSWORD bo'sh yoki standart — superadmin yaratilmadi"
                )
            )
            return

        user = User(email=email, first_name=first, last_name=last)
        user.role = User.Role.SUPERADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS(f"Superadmin yaratildi: {email}"))
