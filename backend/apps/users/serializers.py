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
    """Ochiq ro'yxatdan o'tish. Rol har doim talaba. is_staff berilmaydi."""
    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model  = User
        fields = ["email", "first_name", "last_name", "password"]

    def create(self, validated_data):
        return User.objects.create_user(
            **validated_data,
            role=User.Role.STUDENT,
            is_staff=False,
            is_superuser=False,
        )


class AdminCreateUserSerializer(RegisterSerializer):
    """Superadmin yangi hisob ochadi. Superadmin rolini faqat superadmin beradi."""
    role = serializers.ChoiceField(choices=User.Role.choices, default=User.Role.STUDENT)

    class Meta(RegisterSerializer.Meta):
        fields = ["email", "first_name", "last_name", "password", "role"]

    def create(self, validated_data):
        role = validated_data.get("role") or User.Role.STUDENT
        request = self.context.get("request")
        actor = getattr(request, "user", None)
        if role == User.Role.SUPERADMIN and getattr(actor, "role", None) != User.Role.SUPERADMIN:
            raise serializers.ValidationError(
                {"role": "Superadmin rolini faqat superadmin bera oladi."}
            )
        return User.objects.create_user(
            email=validated_data["email"],
            password=validated_data["password"],
            first_name=validated_data.get("first_name") or "",
            last_name=validated_data.get("last_name") or "",
            role=role,
            is_staff=False,
            is_superuser=False,
        )


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
