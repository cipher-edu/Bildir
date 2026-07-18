"""
OsiyoNigohi — users app initial migration
User model — core app ga FK bog'lanishlar bilan
"""
import uuid
import django.contrib.auth.models
import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    initial = True

    dependencies = [
        ("auth",  "0012_alter_user_first_name_max_length"),
        ("core",  "0001_initial"),
    ]

    operations = [
        migrations.CreateModel(
            name="User",
            fields=[
                ("id",              models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True, serialize=False)),
                ("password",        models.CharField(max_length=128, verbose_name="password")),
                ("last_login",      models.DateTimeField(blank=True, null=True, verbose_name="last login")),
                ("is_superuser",    models.BooleanField(default=False)),
                ("email",           models.EmailField(max_length=254, unique=True, verbose_name="Email")),
                ("first_name",      models.CharField(max_length=100, verbose_name="Ism")),
                ("last_name",       models.CharField(max_length=100, verbose_name="Familiya")),
                ("role",            models.CharField(
                    choices=[
                        ("student",         "Talaba"),
                        ("teacher",         "O'qituvchi"),
                        ("methodist",       "Metodist"),
                        ("department_head", "Kafedra mudiri"),
                        ("proctor",         "Proktor"),
                        ("admin",           "Admin"),
                        ("superadmin",      "Superadmin"),
                        ("audit_inspector", "Audit inspektor"),
                    ],
                    default="student", max_length=30, verbose_name="Rol"
                )),
                ("hemis_id",        models.CharField(blank=True, max_length=50, null=True, unique=True, verbose_name="HEMIS ID")),
                ("student_id",      models.CharField(blank=True, max_length=50, null=True, verbose_name="Talaba guvohnomasi raqami")),
                ("last_hemis_sync", models.DateTimeField(blank=True, null=True, verbose_name="Oxirgi HEMIS sinxronlash")),
                ("university",      models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users",    to="core.university", verbose_name="Universitet")),
                ("faculty",         models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users",    to="core.faculty",    verbose_name="Fakultet")),
                ("specialty",       models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="users",    to="core.specialty",  verbose_name="Yo'nalish")),
                ("group",           models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.SET_NULL, related_name="students", to="core.studygroup", verbose_name="Guruh")),
                ("study_year",      models.PositiveSmallIntegerField(blank=True, null=True, verbose_name="O'qish kursi")),
                ("phone",           models.CharField(blank=True, max_length=20, verbose_name="Telefon raqami")),
                ("language",        models.CharField(choices=[("uz","O'zbek"),("ru","Rus")], default="uz", max_length=5, verbose_name="Interfeys tili")),
                ("is_active",       models.BooleanField(default=True)),
                ("is_staff",        models.BooleanField(default=False)),
                ("created_at",      models.DateTimeField(auto_now_add=True)),
                ("updated_at",      models.DateTimeField(auto_now=True)),
                ("groups",          models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.group", verbose_name="groups")),
                ("user_permissions",models.ManyToManyField(blank=True, related_name="user_set", related_query_name="user", to="auth.permission", verbose_name="user permissions")),
            ],
            options={
                "db_table": "users",
                "verbose_name": "Foydalanuvchi",
                "verbose_name_plural": "Foydalanuvchilar",
            },
            managers=[("objects", django.contrib.auth.models.BaseUserManager())],
        ),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["hemis_id"],           name="users_hemis_idx")),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["role"],               name="users_role_idx")),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["university","faculty"],name="users_uni_fac_idx")),
        migrations.AddIndex(model_name="user", index=models.Index(fields=["group"],              name="users_group_idx")),
    ]
