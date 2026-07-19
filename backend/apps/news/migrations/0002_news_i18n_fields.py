from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("news", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="newsarticle",
            name="title_i18n",
            field=models.JSONField(
                blank=True, default=dict, verbose_name="Sarlavha tarjimalari (uz/ru/en/kaa)"
            ),
        ),
        migrations.AddField(
            model_name="newsarticle",
            name="summary_i18n",
            field=models.JSONField(
                blank=True, default=dict, verbose_name="Tavsif tarjimalari"
            ),
        ),
        migrations.AddField(
            model_name="newsarticle",
            name="body_i18n",
            field=models.JSONField(
                blank=True, default=dict, verbose_name="Matn tarjimalari (HTML)"
            ),
        ),
        migrations.AddField(
            model_name="newsarticle",
            name="meta_title_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="newsarticle",
            name="meta_description_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AlterField(
            model_name="newsarticle",
            name="title",
            field=models.CharField(max_length=255, verbose_name="Sarlavha (uz default)"),
        ),
        migrations.AlterField(
            model_name="newsarticle",
            name="summary",
            field=models.TextField(
                blank=True,
                help_text="Kartochka va SEO uchun 1–2 jumla",
                max_length=600,
                verbose_name="Qisqa tavsif (uz default)",
            ),
        ),
        migrations.AlterField(
            model_name="newsarticle",
            name="body",
            field=models.TextField(
                help_text="Rich-text muharrirdan keladigan HTML",
                verbose_name="Asosiy matn HTML (uz default)",
            ),
        ),
    ]
