from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("compliance", "0001_initial"),
    ]

    operations = [
        migrations.AlterField(
            model_name="whistlereport",
            name="tracking_code",
            field=models.CharField(db_index=True, max_length=64, unique=True),
        ),
    ]
