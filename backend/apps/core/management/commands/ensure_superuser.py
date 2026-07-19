"""
Docker/entrypoint: SUPERUSER_EMAIL + SUPERUSER_PASSWORD dan superadmin yaratish/yangilash.
"""
from decouple import config
from django.core.management.base import BaseCommand

from apps.users.models import User


class Command(BaseCommand):
    help = "Superadmin foydalanuvchini kafolatlaydi (env dan)"

    def handle(self, *args, **options):
        email = config("SUPERUSER_EMAIL", default="superadmin@ndu.uz")
        password = config("SUPERUSER_PASSWORD", default="SuperAdmin2026!")
        first = config("SUPERUSER_FIRST_NAME", default="Super")
        last = config("SUPERUSER_LAST_NAME", default="Admin")

        if not email or not password:
            self.stdout.write(self.style.WARNING("SUPERUSER_EMAIL/PASSWORD bo'sh — o'tkazib yuborildi"))
            return

        user = User.objects.filter(email=email).first()
        created = False
        if not user:
            user = User(email=email, first_name=first, last_name=last)
            created = True

        user.first_name = first
        user.last_name = last
        user.role = User.Role.SUPERADMIN
        user.is_staff = True
        user.is_superuser = True
        user.is_active = True
        user.set_password(password)
        user.save()

        action = "yaratildi" if created else "yangilandi"
        self.stdout.write(self.style.SUCCESS(f"Superadmin {action}: {email}"))
