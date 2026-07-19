"""
Faqat ANIQ demo/mock katalog yozuvlarini tozalash.

XAVFSIZLIK:
  - synced_at bor (HEMIS dan kelgan) fakultetlar O'CHIRILMAYDI
  - HEMIS kodlari (masalan 353-*) O'CHIRILMAYDI
  - Faqat seed/mock identifikatorlar (FIT, FIZ, FAK01–09) va DEMO universiteti
"""
from django.core.management.base import BaseCommand
from django.db import transaction
from django.db.models import Q


# Aniq demo/mock fakultet kodlari (seed va mock sync)
DEMO_FACULTY_CODES = {
    "FIT",
    "FIZ",
    "FAK01",
    "FAK02",
    "FAK03",
    "FAK04",
    "FAK05",
    "FAK06",
    "FAK07",
    "FAK08",
    "FAK09",
}

# Faqat shu kodli universitetlar (agar ichida real data bo'lmasa)
DEMO_UNI_CODES = {"DEMO", "DEMO_UNI"}


class Command(BaseCommand):
    help = "Faqat demo/mock katalog yozuvlarini tozalaydi (HEMIS real ma'lumot saqlanadi)."

    def add_arguments(self, parser):
        parser.add_argument("--dry-run", action="store_true")

    def handle(self, *args, **options):
        from apps.core.models import Faculty, Specialty, StudyGroup, Subject, University
        from apps.surveys.models import Survey

        dry = options["dry_run"]

        # 1) Aniq demo kodli + hech qachon sinxronlanmagan seed
        demo_fac_qs = Faculty.objects.filter(
            Q(code__in=DEMO_FACULTY_CODES)
            | Q(code__in=DEMO_FACULTY_CODES, synced_at__isnull=True)
        )
        # Seed: FIT/FIZ style, synced_at null, NOT hemis-looking codes
        seed_fac_qs = Faculty.objects.filter(
            synced_at__isnull=True,
            code__in=DEMO_FACULTY_CODES,
        )
        demo_fac_qs = (demo_fac_qs | seed_fac_qs).distinct()

        # 2) DEMO universiteti ostidagi barcha (faqat DEMO*)
        demo_uni_fac = Faculty.objects.filter(university__code__in=DEMO_UNI_CODES)
        demo_fac_qs = (demo_fac_qs | demo_uni_fac).distinct()

        self.stdout.write("O'chiriladigan demo fakultetlar:")
        for f in demo_fac_qs.select_related("university"):
            uni = f.university.code if f.university_id else "?"
            self.stdout.write(f"  [{uni}] {f.code} — {f.name} (synced={f.synced_at})")

        if not demo_fac_qs.exists():
            self.stdout.write(self.style.SUCCESS("Demo fakultet topilmadi — hech narsa o'chirilmadi."))
        else:
            demo_fac_ids = list(demo_fac_qs.values_list("id", flat=True))
            demo_spec_ids = list(
                Specialty.objects.filter(faculty_id__in=demo_fac_ids).values_list("id", flat=True)
            )
            demo_grp_ids = list(
                StudyGroup.objects.filter(specialty_id__in=demo_spec_ids).values_list("id", flat=True)
            )
            demo_subj_n = Subject.objects.filter(faculty_id__in=demo_fac_ids).count()

            self.stdout.write(
                f"Reja: fac={len(demo_fac_ids)} spec={len(demo_spec_ids)} "
                f"grp={len(demo_grp_ids)} subj={demo_subj_n}"
            )

            if dry:
                self.stdout.write(self.style.WARNING("DRY RUN"))
            else:
                with transaction.atomic():
                    for s in Survey.objects.all():
                        if demo_fac_ids:
                            s.faculties.remove(*demo_fac_ids)
                        if demo_spec_ids:
                            s.specialties.remove(*demo_spec_ids)
                        if demo_grp_ids:
                            s.groups.remove(*demo_grp_ids)
                    g_del, _ = StudyGroup.objects.filter(id__in=demo_grp_ids).delete()
                    sp_del, _ = Specialty.objects.filter(id__in=demo_spec_ids).delete()
                    su_del, _ = Subject.objects.filter(faculty_id__in=demo_fac_ids).delete()
                    f_del, _ = Faculty.objects.filter(id__in=demo_fac_ids).delete()
                    self.stdout.write(
                        self.style.SUCCESS(
                            f"O'chirildi: groups={g_del}, specs={sp_del}, "
                            f"subjects={su_del}, faculties={f_del}"
                        )
                    )

        # 3) Mock "… yo'nalishi" — faqat synced_at null specialty
        mock_specs = Specialty.objects.filter(
            name__endswith="yo'nalishi",
            synced_at__isnull=True,
        )
        if mock_specs.exists():
            ids = list(mock_specs.values_list("id", flat=True))
            self.stdout.write(f"Mock yo'nalishlar: {len(ids)}")
            if not dry:
                g2, _ = StudyGroup.objects.filter(specialty_id__in=ids).delete()
                s2, _ = Specialty.objects.filter(id__in=ids).delete()
                self.stdout.write(self.style.SUCCESS(f"Mock: specs={s2}, groups={g2}"))

        # 4) Bo'sh DEMO universitetlar (NDU real — o'chirilmaydi)
        if not dry:
            for code in DEMO_UNI_CODES:
                u = University.objects.filter(code=code).first()
                if u and not Faculty.objects.filter(university=u).exists():
                    u.delete()
                    self.stdout.write(self.style.SUCCESS(f"Bo'sh universitet o'chirildi: {code}"))

        self.stdout.write("\n--- Qolgan katalog ---")
        self.stdout.write(f"Universitetlar: {list(University.objects.values_list('code', 'name'))}")
        self.stdout.write(f"Fakultetlar:    {Faculty.objects.count()}")
        self.stdout.write(f"Yo'nalishlar:   {Specialty.objects.count()}")
        self.stdout.write(f"Guruhlar:       {StudyGroup.objects.count()}")
        self.stdout.write(f"Fanlar:         {Subject.objects.count()}")
