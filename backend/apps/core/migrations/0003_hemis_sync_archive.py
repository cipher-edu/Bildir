import uuid
import django.db.models.deletion
import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_studygroup_name_max100'),
    ]

    operations = [
        # ── Faculty ──────────────────────────────────────────────
        migrations.AddField(
            model_name='faculty',
            name='synced_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Sinxronlangan vaqt'),
        ),
        migrations.AddField(
            model_name='faculty',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='Arxivlangan'),
        ),
        migrations.AddField(
            model_name='faculty',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Arxivlangan vaqt'),
        ),

        # ── Specialty ────────────────────────────────────────────
        migrations.AddField(
            model_name='specialty',
            name='synced_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Sinxronlangan vaqt'),
        ),
        migrations.AddField(
            model_name='specialty',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='Arxivlangan'),
        ),
        migrations.AddField(
            model_name='specialty',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Arxivlangan vaqt'),
        ),

        # ── StudyGroup ───────────────────────────────────────────
        migrations.AddField(
            model_name='studygroup',
            name='synced_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Sinxronlangan vaqt'),
        ),
        migrations.AddField(
            model_name='studygroup',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='Arxivlangan'),
        ),
        migrations.AddField(
            model_name='studygroup',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Arxivlangan vaqt'),
        ),

        # ── Subject ──────────────────────────────────────────────
        migrations.AddField(
            model_name='subject',
            name='synced_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Sinxronlangan vaqt'),
        ),
        migrations.AddField(
            model_name='subject',
            name='is_archived',
            field=models.BooleanField(default=False, verbose_name='Arxivlangan'),
        ),
        migrations.AddField(
            model_name='subject',
            name='archived_at',
            field=models.DateTimeField(blank=True, null=True, verbose_name='Arxivlangan vaqt'),
        ),

        # ── HemisSyncLog (yangi model) ───────────────────────────
        migrations.CreateModel(
            name='HemisSyncLog',
            fields=[
                ('id',           models.UUIDField(default=uuid.uuid4, editable=False, primary_key=True)),
                ('started_at',   models.DateTimeField(auto_now_add=True)),
                ('finished_at',  models.DateTimeField(blank=True, null=True)),
                ('started_by',   models.CharField(blank=True, max_length=200)),
                ('status',       models.CharField(
                    choices=[('running','Ishlayapti'),('success','Muvaffaqiyatli'),('failed','Xato')],
                    default='running', max_length=20
                )),
                ('options',      models.JSONField(blank=True, default=dict)),
                ('stats_before', models.JSONField(blank=True, default=dict)),
                ('stats_after',  models.JSONField(blank=True, default=dict)),
                ('archived',     models.JSONField(
                    blank=True, default=dict,
                    help_text='Arxivlangan yozuvlar soni (har model bo\'yicha)'
                )),
                ('restored',     models.JSONField(
                    blank=True, default=dict,
                    help_text='Arxivdan tiklangan yozuvlar soni'
                )),
                ('errors',       models.TextField(blank=True)),
            ],
            options={
                'verbose_name': 'HEMIS sinxronizatsiya jurnali',
                'verbose_name_plural': 'HEMIS sinxronizatsiya jurnallari',
                'db_table': 'hemis_sync_logs',
                'ordering': ['-started_at'],
            },
        ),
    ]
