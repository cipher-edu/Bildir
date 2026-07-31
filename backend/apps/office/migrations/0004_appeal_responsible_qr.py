# Generated manually — responsible_person + unique_code + qr_code_image

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ("office", "0003_person_i18n_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="appeal",
            name="responsible_person",
            field=models.ForeignKey(
                blank=True,
                null=True,
                on_delete=django.db.models.deletion.SET_NULL,
                related_name="appeals",
                to="office.responsibleperson",
                verbose_name="Mas'ul shaxs",
            ),
        ),
        migrations.AddField(
            model_name="appeal",
            name="unique_code",
            field=models.CharField(
                blank=True,
                default="",
                editable=False,
                max_length=8,
                verbose_name="Murojaat ID",
            ),
        ),
        migrations.AddField(
            model_name="appeal",
            name="qr_code_image",
            field=models.ImageField(
                blank=True,
                null=True,
                upload_to="office/appeals/qr/%Y/%m/",
                verbose_name="QR kod",
            ),
        ),
        # unique_code unique constraint — bo'sh default dan keyin data fill, keyin unique
        migrations.RunPython(
            code=lambda apps, schema: _backfill_codes(apps),
            reverse_code=migrations.RunPython.noop,
        ),
        migrations.AlterField(
            model_name="appeal",
            name="unique_code",
            field=models.CharField(
                blank=True,
                default="",
                editable=False,
                max_length=8,
                unique=True,
                verbose_name="Murojaat ID",
            ),
        ),
    ]


def _backfill_codes(apps):
    import random
    import uuid

    Appeal = apps.get_model("office", "Appeal")
    used = set(
        Appeal.objects.exclude(unique_code="")
        .exclude(unique_code__isnull=True)
        .values_list("unique_code", flat=True)
    )
    for appeal in Appeal.objects.all():
        if appeal.unique_code:
            continue
        for _ in range(20):
            code = "".join(str(random.randint(0, 9)) for _ in range(8))
            if code not in used:
                used.add(code)
                appeal.unique_code = code
                appeal.save(update_fields=["unique_code"])
                break
        else:
            code = uuid.uuid4().hex[:8].upper()
            used.add(code)
            appeal.unique_code = code
            appeal.save(update_fields=["unique_code"])
