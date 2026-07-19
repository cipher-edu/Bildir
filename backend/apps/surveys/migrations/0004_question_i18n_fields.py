from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("surveys", "0003_survey_i18n_fields"),
    ]

    operations = [
        migrations.AddField(
            model_name="surveyquestion",
            name="text_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
        migrations.AddField(
            model_name="surveyquestion",
            name="help_text_i18n",
            field=models.JSONField(blank=True, default=dict),
        ),
    ]
