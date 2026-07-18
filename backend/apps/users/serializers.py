"""
OsiyoNigohi — User Serializers
"""
from rest_framework import serializers
from .models import User


class UserSerializer(serializers.ModelSerializer):
    """Foydalanuvchi profili — o'qish uchun."""
    full_name       = serializers.ReadOnlyField()
    university_name = serializers.CharField(source="university.short_name", read_only=True)
    faculty_name    = serializers.CharField(source="faculty.name",          read_only=True)
    specialty_name  = serializers.CharField(source="specialty.name",        read_only=True)
    group_name      = serializers.CharField(source="group.name",            read_only=True)

    class Meta:
        model  = User
        fields = [
            "id", "email", "first_name", "last_name", "full_name",
            "role", "language", "phone", "picture",
            "hemis_id", "student_id",
            "university", "university_name",
            "faculty", "faculty_name",
            "specialty", "specialty_name",
            "group", "group_name",
            "study_year", "gender",
            "position", "academic_degree", "academic_rank",
            "last_hemis_sync",
            "is_active", "created_at",
        ]
        read_only_fields = ["id", "hemis_id", "last_hemis_sync", "created_at"]


class UserShortSerializer(serializers.ModelSerializer):
    """Boshqa serializer larda nested ishlatish uchun qisqa variant."""
    full_name = serializers.ReadOnlyField()

    class Meta:
        model  = User
        fields = ["id", "full_name", "email", "role"]


class UserUpdateSerializer(serializers.ModelSerializer):
    """Foydalanuvchi o'z profilini yangilash uchun."""
    class Meta:
        model  = User
        fields = ["first_name", "last_name", "phone", "language"]


class RegisterSerializer(serializers.ModelSerializer):
    """Yangi foydalanuvchi ro'yxatdan o'tishi (dev/test uchun)."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ["email", "first_name", "last_name", "password", "role"]

    def create(self, validated_data):
        return User.objects.create_user(**validated_data)


class ChangePasswordSerializer(serializers.Serializer):
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, min_length=8)

    def validate_old_password(self, value):
        user = self.context["request"].user
        if not user.check_password(value):
            raise serializers.ValidationError("Joriy parol noto'g'ri.")
        return value


class HemisLoginSerializer(serializers.Serializer):
    """
    HEMIS SSO orqali student login.

    login    — talaba ID raqami (student_id_number), masalan: 22060100700600
    password — HEMIS parol
    """
    login    = serializers.CharField(help_text="HEMIS talaba ID raqami yoki login")
    password = serializers.CharField(write_only=True, help_text="HEMIS parol")


class HemisTutorLoginSerializer(serializers.Serializer):
    """
    HEMIS Tutor API orqali o'qituvchi/hodim login.

    login    — HEMIS tutor login (odatda familiya.ism yoki ID)
    password — HEMIS parol
    """
    login    = serializers.CharField(help_text="HEMIS o'qituvchi logini")
    password = serializers.CharField(write_only=True, help_text="HEMIS parol")
