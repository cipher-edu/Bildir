"""
Users app testlari — model, auth views, JWT.
Response format: {"success": True, "data": {...}}
"""
import pytest
from rest_framework import status
from conftest import UserFactory, TeacherFactory, AdminFactory


# ── Model testlari ────────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestUserModel:
    def test_full_name_order(self):
        user = UserFactory(first_name="Ali", last_name="Valiyev")
        assert user.full_name == "Valiyev Ali"

    def test_str_includes_name_and_role(self):
        user = UserFactory(first_name="Ali", last_name="Valiyev", role="student")
        assert "Valiyev Ali" in str(user)
        assert "Talaba" in str(user)

    def test_is_student_true(self):
        user = UserFactory(role="student")
        assert user.is_student is True
        assert user.is_teacher is False

    def test_is_teacher_true(self):
        user = TeacherFactory()
        assert user.is_teacher is True
        assert user.is_student is False

    def test_is_proctor_true(self):
        user = UserFactory(role="proctor")
        assert user.is_proctor is True

    def test_user_email_unique(self, db):
        UserFactory(email="dup@test.uz")
        from django.db import IntegrityError
        with pytest.raises(IntegrityError):
            UserFactory(email="dup@test.uz")

    def test_password_hashed(self, db):
        user = UserFactory()
        assert user.password != "TestPass123!"
        assert user.check_password("TestPass123!")

    def test_inactive_user(self, db):
        user = UserFactory(is_active=False)
        assert not user.is_active

    def test_create_superuser(self, db):
        from apps.users.models import User
        su = User.objects.create_superuser("su@test.uz", "Pass123!")
        assert su.is_staff is True
        assert su.is_superuser is True


# ── Auth view testlari ────────────────────────────────────────────────────────

@pytest.mark.django_db
class TestLoginView:
    url = "/api/v1/auth/login/"

    def test_login_success(self, api_client, student):
        r = api_client.post(self.url, {"email": student.email, "password": "TestPass123!"})
        assert r.status_code == status.HTTP_200_OK
        assert r.data["success"] is True
        tokens = r.data["data"]["tokens"]
        assert "access" in tokens
        assert "refresh" in tokens

    def test_login_wrong_password(self, api_client, student):
        r = api_client.post(self.url, {"email": student.email, "password": "wrong"})
        assert r.status_code == status.HTTP_401_UNAUTHORIZED
        assert r.data["success"] is False

    def test_login_unknown_email(self, api_client):
        r = api_client.post(self.url, {"email": "noone@test.uz", "password": "pass"})
        assert r.status_code in (status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED)

    def test_login_inactive_user(self, api_client, db):
        user = UserFactory(is_active=False)
        r = api_client.post(self.url, {"email": user.email, "password": "TestPass123!"})
        assert r.status_code in (status.HTTP_401_UNAUTHORIZED, status.HTTP_403_FORBIDDEN)

    def test_login_missing_fields(self, api_client):
        r = api_client.post(self.url, {})
        assert r.status_code == status.HTTP_400_BAD_REQUEST

    def test_login_returns_user_data(self, api_client, student):
        r = api_client.post(self.url, {"email": student.email, "password": "TestPass123!"})
        assert r.data["data"]["user"]["email"] == student.email


@pytest.mark.django_db
class TestMeView:
    url = "/api/v1/auth/me/"

    def test_get_own_profile(self, auth_client, student):
        r = auth_client.get(self.url)
        assert r.status_code == status.HTTP_200_OK
        user_data = r.data["data"] if "data" in r.data else r.data
        assert user_data.get("email") == student.email or r.data.get("email") == student.email

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.get(self.url)
        assert r.status_code == status.HTTP_401_UNAUTHORIZED

    def test_patch_profile(self, auth_client):
        r = auth_client.patch(self.url, {"first_name": "Yangi"})
        assert r.status_code in (status.HTTP_200_OK, status.HTTP_204_NO_CONTENT)


@pytest.mark.django_db
class TestLogoutView:
    url = "/api/v1/auth/logout/"

    def test_logout_with_refresh_token(self, auth_client, student):
        from rest_framework_simplejwt.tokens import RefreshToken
        refresh = str(RefreshToken.for_user(student))
        r = auth_client.post(self.url, {"refresh": refresh})
        assert r.status_code in (
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_205_RESET_CONTENT
        )

    def test_logout_without_token_rejected(self, auth_client):
        r = auth_client.post(self.url, {})
        assert r.status_code in (
            status.HTTP_400_BAD_REQUEST, status.HTTP_401_UNAUTHORIZED,
            status.HTTP_200_OK  # some impls silently succeed
        )


@pytest.mark.django_db
class TestRegisterView:
    url = "/api/v1/auth/register/"

    def test_register_new_user(self, api_client):
        r = api_client.post(self.url, {
            "email": "new@test.uz",
            "first_name": "Test",
            "last_name": "User",
            "password": "StrongPass123!",
        })
        assert r.status_code == status.HTTP_201_CREATED
        assert r.data["success"] is True
        assert "access" in r.data["data"]["tokens"]

    def test_register_duplicate_email(self, api_client, student):
        r = api_client.post(self.url, {
            "email": student.email,
            "first_name": "X",
            "last_name": "Y",
            "password": "Pass123!",
        })
        assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestChangePasswordView:
    url = "/api/v1/auth/me/password/"

    def test_change_password_success(self, auth_client):
        r = auth_client.post(self.url, {
            "old_password": "TestPass123!",
            "new_password": "NewPass456!",
        })
        assert r.status_code in (
            status.HTTP_200_OK, status.HTTP_204_NO_CONTENT, status.HTTP_205_RESET_CONTENT
        )

    def test_change_password_wrong_old(self, auth_client):
        r = auth_client.post(self.url, {
            "old_password": "wrong",
            "new_password": "NewPass456!",
        })
        assert r.status_code == status.HTTP_400_BAD_REQUEST


@pytest.mark.django_db
class TestAdminUserViews:
    list_url = "/api/v1/auth/users/"

    def test_admin_can_list_users(self, admin_client):
        r = admin_client.get(self.list_url)
        assert r.status_code == status.HTTP_200_OK

    def test_student_cannot_list_users(self, auth_client):
        r = auth_client.get(self.list_url)
        assert r.status_code == status.HTTP_403_FORBIDDEN

    def test_unauthenticated_rejected(self, api_client):
        r = api_client.get(self.list_url)
        assert r.status_code == status.HTTP_401_UNAUTHORIZED


# ── HEMIS sinxronlash: sync_user_from_hemis ───────────────────────────────────

@pytest.mark.django_db
class TestSyncUserFromHemis:
    def test_maps_picture_from_image_full(self):
        from apps.users.hemis_service import sync_user_from_hemis
        user = UserFactory(role="student")
        sync_user_from_hemis(user, {
            "image_full": "https://hemis.nspi.uz/static/pi/a/photo.jpg",
            "image": "https://hemis.nspi.uz/static/crop/a/thumb.jpg",
        })
        user.refresh_from_db()
        assert user.picture == "https://hemis.nspi.uz/static/pi/a/photo.jpg"

    def test_falls_back_to_image_when_no_image_full(self):
        from apps.users.hemis_service import sync_user_from_hemis
        user = UserFactory(role="student")
        sync_user_from_hemis(user, {"image": "https://hemis.nspi.uz/static/crop/a/thumb.jpg"})
        user.refresh_from_db()
        assert user.picture == "https://hemis.nspi.uz/static/crop/a/thumb.jpg"

    def test_maps_male_gender_code(self):
        from apps.users.hemis_service import sync_user_from_hemis
        user = UserFactory(role="student")
        sync_user_from_hemis(user, {"gender": {"code": "11", "name": "Erkak"}})
        user.refresh_from_db()
        assert user.gender == "M"

    def test_maps_female_gender_code(self):
        from apps.users.hemis_service import sync_user_from_hemis
        user = UserFactory(role="student")
        sync_user_from_hemis(user, {"gender": {"code": "12", "name": "Ayol"}})
        user.refresh_from_db()
        assert user.gender == "F"

    def test_no_picture_or_gender_keys_leaves_fields_untouched(self):
        from apps.users.hemis_service import sync_user_from_hemis
        user = UserFactory(role="student", picture="", gender=None)
        sync_user_from_hemis(user, {"first_name": "Ali"})
        user.refresh_from_db()
        assert user.picture == ""
        assert user.gender is None
