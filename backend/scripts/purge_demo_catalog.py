"""
Demo/mock katalog yozuvlarini tozalash.
Ishlatish:
  python manage.py shell < scripts/purge_demo_run.py
  yoki: python manage.py purge_demo_catalog  (agar command bo'lsa)
"""
from django.db import transaction

from apps.core.models import Faculty, Specialty, StudyGroup, Subject, University
from apps.surveys.models import Survey


def purge_demo_catalog():
    demo_uni_codes = {"DEMO", "DEMO_UNI"}
    demo_fac_codes = {
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

    demo_fac_qs = (
        Faculty.objects.filter(code__in=demo_fac_codes)
        | Faculty.objects.filter(university__code__in=demo_uni_codes)
        | Faculty.objects.filter(synced_at__isnull=True)
    ).distinct()

    print("Demo fakultetlar:")
    for f in demo_fac_qs.select_related("university"):
        uni = f.university.code if f.university_id else "?"
        print(f"  [{uni}] {f.code} — {f.name} (synced={f.synced_at})")

    demo_fac_ids = list(demo_fac_qs.values_list("id", flat=True))
    if not demo_fac_ids:
        print("Demo fakultet topilmadi.")
    else:
        demo_spec_ids = list(
            Specialty.objects.filter(faculty_id__in=demo_fac_ids).values_list("id", flat=True)
        )
        demo_grp_ids = list(
            StudyGroup.objects.filter(specialty_id__in=demo_spec_ids).values_list("id", flat=True)
        )

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

            u_del = 0
            for code in demo_uni_codes:
                u = University.objects.filter(code=code).first()
                if u and not Faculty.objects.filter(university=u).exists():
                    print(f"Universitet o'chirildi: {code}")
                    u.delete()
                    u_del += 1

            print(
                f"O'chirildi: groups={g_del}, specs={sp_del}, subjects={su_del}, "
                f"faculties={f_del}, unis={u_del}"
            )

    mock_specs = Specialty.objects.filter(name__endswith="yo'nalishi")
    if mock_specs.exists():
        ids = list(mock_specs.values_list("id", flat=True))
        g2, _ = StudyGroup.objects.filter(specialty_id__in=ids).delete()
        s2, _ = Specialty.objects.filter(id__in=ids).delete()
        print(f"Mock yo'nalishlar: specs={s2}, groups={g2}")

    print("\n--- Qolgan katalog ---")
    print("Universitetlar:", list(University.objects.values_list("code", "name")))
    print("Fakultetlar:", Faculty.objects.count())
    print("Yo'nalishlar:", Specialty.objects.count())
    print("Guruhlar:", StudyGroup.objects.count())
    print("Fanlar:", Subject.objects.count())
    print("Fac synced_at=None:", Faculty.objects.filter(synced_at__isnull=True).count())
    print("Spec synced_at=None:", Specialty.objects.filter(synced_at__isnull=True).count())
    print("Group synced_at=None:", StudyGroup.objects.filter(synced_at__isnull=True).count())


purge_demo_catalog()
