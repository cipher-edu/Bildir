from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("surveys", "0002_participation_anonymize"),
    ]

    operations = [
        migrations.AddField(
            model_name="survey",
            name="title_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="survey",
            name="description_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
