"""
Demo data seed command — auth-starter uchun faqat foydalanuvchi yaratadi.
"""
from django.core.management.base import BaseCommand
from apps.users.models import User


class Command(BaseCommand):
    help = "Demo foydalanuvchilarni yaratadi"

    def handle(self, *args, **options):
        if not User.objects.filter(email="admin@example.com").exists():
            User.objects.create_superuser(
                email="admin@example.com",
                password="admin123",
                first_name="Admin",
                last_name="User",
            )
            self.stdout.write(self.style.SUCCESS("admin@example.com / admin123 yaratildi"))
        else:
            self.stdout.write("admin@example.com allaqachon mavjud")
