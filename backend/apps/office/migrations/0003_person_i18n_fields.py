from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("office", "0002_appeal_attachment_kind"),
    ]

    operations = [
        migrations.AddField(
            model_name="responsibleperson",
            name="position_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="department_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="academic_title_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="reception_hours_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="biography_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="responsibilities_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="responsibleperson",
            name="extra_info_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
