from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("office", "0004_appeal_responsible_qr"),
    ]

    operations = [
        migrations.AlterField(
            model_name="appeal",
            name="unique_code",
            field=models.CharField(
                blank=True,
                default="",
                editable=False,
                max_length=32,
                unique=True,
                verbose_name="Murojaat ID",
            ),
        ),
    ]
