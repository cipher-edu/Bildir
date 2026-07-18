"""
HEMIS dan katalog ma'lumotlarini import qilish:
  University, Faculty, Specialty, StudyGroup, Subject (fanlar)

Ishlatish:
  python manage.py sync_hemis_catalog
  python manage.py sync_hemis_catalog --only-subjects
  python manage.py sync_hemis_catalog --mock
"""
import requests
from django.core.management.base import BaseCommand
from django.conf import settings
from django.utils import timezone
from apps.core.models import University, Faculty, Specialty, StudyGroup, Subject, HemisSyncLog


BASE    = getattr(settings, "HEMIS_API_BASE_URL", "https://student.nspi.uz/rest")
TOKEN   = getattr(settings, "HEMIS_BACKEND_TOKEN", "")
MOCK    = getattr(settings, "HEMIS_MOCK_MODE", True)
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


MOCK_SUBJECTS = [
    ("INF101", "Informatika va axborot texnologiyalari", 4, None),
    ("MAT101", "Oliy matematika",                        5, None),
    ("FIZ101", "Fizika",                                  4, None),
    ("ENG101", "Ingliz tili",                             4, None),
    ("UZB101", "O'zbek tili va adabiyoti",                3, None),
    ("HUQ101", "Huquqshunoslik",                          2, None),
    ("TAR101", "O'zbekiston tarixi",                      2, None),
    ("FAL101", "Falsafa",                                  2, None),
    ("PED101", "Pedagogika",                              4, "педагог"),
    ("PSX101", "Psixologiya",                             4, "педагог"),
    ("MET101", "O'qitish metodikasi",                     3, "педагог"),
    ("ALG201", "Algebra va sonlar nazariyasi",            5, "матем"),
    ("GEO201", "Geometriya",                              4, "матем"),
    ("ANL201", "Matematik analiz",                        5, "матем"),
    ("PRG201", "Dasturlash asoslari",                     5, "информ"),
    ("WEB201", "Web dasturlash",                          4, "информ"),
    ("MAB201", "Ma'lumotlar bazasi",                      4, "информ"),
    ("BIO201", "Biologiya",                               4, "биол"),
    ("KIM201", "Kimyo",                                   4, "хим"),
    ("ARX201", "Arxeologiya",                             3, "тарих"),
    ("UZB201", "Qadimgi o'zbek adabiyoti",                3, "тил"),
    ("JIS201", "Jismoniy tarbiya nazariyasi",             4, "спорт"),
    ("MUS201", "Musiqa nazariyasi",                       3, "муз"),
    ("BSH201", "Boshlang'ich ta'lim metodikasi",          4, "босл"),
]


def hemis_get(path, params=None):
    params = params or {}
    params["limit"] = 200
    params["page"]  = 1
    all_items = []
    while True:
        resp = requests.get(f"{BASE}{path}", headers=HEADERS, params=params, timeout=30)
        resp.raise_for_status()
        data = resp.json()
        if not data.get("success"):
            raise Exception(f"HEMIS error: {data.get('error')}")
        items = data["data"]["items"]
        all_items.extend(items)
        pagination  = data["data"].get("pagination", {})
        total_pages = pagination.get("pageCount", 1)
        if params["page"] >= total_pages:
            break
        params["page"] += 1
    return all_items


class Command(BaseCommand):
    help = "HEMIS dan barcha katalog ma'lumotlari + fanlarni import qiladi (arxiv qo'llab-quvvatlanadi)"

    def add_arguments(self, parser):
        parser.add_argument("--university-code", default="NDU")
        parser.add_argument("--university-name", default="Navoiy Davlat Universiteti")
        parser.add_argument("--only-subjects", action="store_true")
        parser.add_argument("--mock", action="store_true")

    def handle(self, *args, **options):
        use_mock = options["mock"] or MOCK or not TOKEN

        # ── Sync log yozuvi yaratish ─────────────────────────────
        sync_log = HemisSyncLog.objects.create(
            started_by="management_command",
            options={
                "only_subjects": options["only_subjects"],
                "mock": use_mock,
                "university_code": options["university_code"],
            },
            stats_before={
                "faculties":    Faculty.objects.count(),
                "specialties":  Specialty.objects.count(),
                "groups":       StudyGroup.objects.count(),
                "subjects":     Subject.objects.count(),
            },
        )

        if use_mock:
            self.stdout.write(self.style.WARNING("⚠  MOCK MODE aktiv"))

        self.stdout.write(self.style.MIGRATE_HEADING("HEMIS Katalog Sinxronlash boshlanmoqda..."))

        try:
            # ── Arxiv statistikasi ──────────────────────────────
            archived = {"faculties": 0, "specialties": 0, "groups": 0, "subjects": 0}
            restored = {"faculties": 0, "specialties": 0, "groups": 0, "subjects": 0}

            # ── University ──────────────────────────────────────
            uni, created = University.objects.get_or_create(
                code=options["university_code"],
                defaults={
                    "name":       options["university_name"],
                    "short_name": options["university_code"],
                    "domain":     "student.nspi.uz",
                    "city":       "Navoiy",
                },
            )
            self.stdout.write(f"  Universitet {'yaratildi' if created else 'mavjud'}: {uni}")

            if not options["only_subjects"]:
                a, r = self._sync_faculties(uni, use_mock)
                archived["faculties"] += a
                restored["faculties"] += r

                a, r = self._sync_specialties(uni, use_mock)
                archived["specialties"] += a
                restored["specialties"] += r

                a, r = self._sync_groups(use_mock)
                archived["groups"] += a
                restored["groups"] += r

            a, r = self._sync_subjects(uni, use_mock)
            archived["subjects"] += a
            restored["subjects"] += r

            # ── Sync log yakunlash ──────────────────────────────
            sync_log.archived     = archived
            sync_log.restored     = restored
            sync_log.stats_after  = {
                "faculties":   Faculty.objects.filter(is_archived=False).count(),
                "specialties": Specialty.objects.filter(is_archived=False).count(),
                "groups":      StudyGroup.objects.filter(is_archived=False).count(),
                "subjects":    Subject.objects.filter(is_archived=False).count(),
            }
            sync_log.save(update_fields=["archived", "restored", "stats_after"])
            sync_log.finish(success=True)

            self.stdout.write(self.style.SUCCESS(
                f"\n✓ Sinxronlash yakunlandi:\n"
                f"  Universitetlar:    {University.objects.count()}\n"
                f"  Fakultetlar:       {Faculty.objects.filter(is_archived=False).count()} "
                f"(arxiv: {Faculty.objects.filter(is_archived=True).count()})\n"
                f"  Mutaxassisliklar:  {Specialty.objects.filter(is_archived=False).count()} "
                f"(arxiv: {Specialty.objects.filter(is_archived=True).count()})\n"
                f"  Guruhlar:          {StudyGroup.objects.filter(is_archived=False).count()} "
                f"(arxiv: {StudyGroup.objects.filter(is_archived=True).count()})\n"
                f"  Fanlar (Subject):  {Subject.objects.filter(is_archived=False).count()} "
                f"(arxiv: {Subject.objects.filter(is_archived=True).count()})\n"
                f"  Arxivlandi:  {archived}\n"
                f"  Tiklandi:    {restored}"
            ))

        except Exception as exc:
            sync_log.finish(success=False, errors=str(exc))
            raise

    # ── Helpers ───────────────────────────────────────────────────

    def _sync_faculties(self, uni, use_mock):
        self.stdout.write(self.style.MIGRATE_HEADING("\nFakultetlar yuklanmoqda..."))
        now = timezone.now()

        if use_mock:
            faculties_data = [
                {"code": "FAK01", "name": "Pedagogika fakulteti",           "active": True},
                {"code": "FAK02", "name": "Matematika va fizika fakulteti", "active": True},
                {"code": "FAK03", "name": "Informatika fakulteti",          "active": True},
                {"code": "FAK04", "name": "Til va adabiyot fakulteti",      "active": True},
                {"code": "FAK05", "name": "Tarix va ijtimoiy fanlar",       "active": True},
                {"code": "FAK06", "name": "Biologiya va kimyo",             "active": True},
                {"code": "FAK07", "name": "Jismoniy tarbiya",               "active": True},
                {"code": "FAK08", "name": "Boshlang'ich ta'lim",            "active": True},
                {"code": "FAK09", "name": "Musiqa va san'at",               "active": True},
            ]
        else:
            departments    = hemis_get("/v1/data/department-list")
            faculties_data = [
                d for d in departments
                if d.get("structureType", {}).get("code") == "11" and d.get("active")
            ]

        self.stdout.write(f"  Topildi: {len(faculties_data)} ta fakultet")

        synced_codes = set()
        for d in faculties_data:
            code = d["code"]
            synced_codes.add(code)
            fac, created = Faculty.objects.get_or_create(
                university=uni, code=code,
                defaults={"name": d["name"]},
            )
            # Yangilash
            update_fields = ["synced_at"]
            if fac.name != d["name"]:
                fac.name = d["name"]
                update_fields.append("name")
            # Arxivdan tiklash
            if fac.is_archived:
                fac.is_archived = False
                fac.archived_at = None
                update_fields += ["is_archived", "archived_at"]
            fac.synced_at = now
            fac.save(update_fields=update_fields)
            self.stdout.write(f"  {'✓' if created else '~'} {fac.name}")

        # Arxivlash — bu syncda ko'rilmagan aktiv fakultetlar
        archived_qs = Faculty.objects.filter(
            university=uni, is_archived=False
        ).exclude(code__in=synced_codes)
        archived_count = archived_qs.count()
        if archived_count:
            archived_qs.update(is_archived=True, archived_at=now)
            self.stdout.write(self.style.WARNING(
                f"  ⚠ Arxivlandi: {archived_count} ta fakultet (HEMIS da yo'q)"
            ))

        # Tiklangan (avval arxivda edi, endi topildi)
        restored_count = Faculty.objects.filter(
            university=uni, is_archived=False, synced_at=now
        ).count() - (len(faculties_data) - Faculty.objects.filter(
            university=uni, code__in=synced_codes
        ).count())
        restored_count = max(0, restored_count)

        return archived_count, restored_count

    def _sync_specialties(self, uni, use_mock):
        self.stdout.write(self.style.MIGRATE_HEADING("\nMutaxassisliklar yuklanmoqda..."))
        now = timezone.now()
        fac_map = {f.code: f for f in Faculty.objects.filter(university=uni, is_archived=False)}

        if use_mock:
            specialties_data = []
            for idx, fac_obj in enumerate(fac_map.values(), start=1):
                specialties_data.append({
                    "id": idx * 100, "code": f"60110{idx}",
                    "name": f"{fac_obj.name} yo'nalishi",
                    "department": {"id": idx}, "active": True,
                    "_faculty_obj": fac_obj,
                })
            fac_hemis_id_map = {}
        else:
            specialties_data = hemis_get("/v1/data/specialty-list")
            try:
                all_depts = hemis_get("/v1/data/department-list")
                fac_hemis_id_map = {}
                for d in all_depts:
                    if d.get("structureType", {}).get("code") == "11" and d.get("active"):
                        fac_obj = fac_map.get(d["code"])
                        if fac_obj:
                            fac_hemis_id_map[int(d["id"])] = fac_obj
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠ Department ro'yxati yuklanmadi: {e}"))
                fac_hemis_id_map = {}

        default_fac = list(fac_map.values())[0] if fac_map else None
        synced_hemis_ids = set()
        saved = updated = restored = 0

        for s in specialties_data:
            if not s.get("active"):
                continue

            if "_faculty_obj" in s:
                fac = s["_faculty_obj"]
            else:
                dept_id = (s.get("department") or {}).get("id")
                fac = None
                if dept_id:
                    fac = fac_hemis_id_map.get(int(dept_id))
                    if not fac:
                        dept_parent = (s.get("department") or {}).get("parent")
                        if dept_parent:
                            fac = fac_hemis_id_map.get(int(dept_parent))
                if not fac:
                    fac = default_fac
            if not fac:
                continue

            hemis_id = str(s["id"])
            synced_hemis_ids.add(hemis_id)
            raw_code = str(s.get("code") or hemis_id)[:20]
            name     = (s.get("name") or "").strip()[:200]
            if not name:
                continue

            existing = Specialty.objects.filter(hemis_specialty_id=hemis_id).first()
            if existing:
                update_fields = ["synced_at"]
                if existing.name != name or existing.faculty_id != fac.pk:
                    existing.name    = name
                    existing.faculty = fac
                    update_fields   += ["name", "faculty"]
                if existing.is_archived:
                    existing.is_archived = False
                    existing.archived_at = None
                    update_fields += ["is_archived", "archived_at"]
                    restored += 1
                existing.synced_at = now
                existing.save(update_fields=update_fields)
                updated += 1
                continue

            code = raw_code
            if Specialty.objects.filter(faculty=fac, code=code).exists():
                code = f"{raw_code[:14]}_{hemis_id}"[:20]

            from django.db import IntegrityError
            try:
                Specialty.objects.create(
                    faculty=fac, code=code, name=name,
                    hemis_specialty_id=hemis_id, is_active=True,
                    synced_at=now,
                )
                saved += 1
            except IntegrityError:
                try:
                    Specialty.objects.create(
                        faculty=fac, code=f"HS{hemis_id}"[:20], name=name,
                        hemis_specialty_id=hemis_id, is_active=True,
                        synced_at=now,
                    )
                    saved += 1
                except IntegrityError:
                    pass

        # Arxivlash
        archived_qs = Specialty.objects.filter(is_archived=False).exclude(
            hemis_specialty_id__in=synced_hemis_ids
        ).exclude(hemis_specialty_id="")
        archived_count = archived_qs.count()
        if archived_count:
            archived_qs.update(is_archived=True, archived_at=now)
            self.stdout.write(self.style.WARNING(
                f"  ⚠ Arxivlandi: {archived_count} ta mutaxassislik"
            ))

        self.stdout.write(self.style.SUCCESS(
            f"  Yangi: {saved} | Yangilandi: {updated} | "
            f"Tiklandi: {restored} | Arxiv: {archived_count}"
        ))
        return archived_count, restored

    def _sync_groups(self, use_mock):
        self.stdout.write(self.style.MIGRATE_HEADING("\nGuruhlar yuklanmoqda..."))
        now = timezone.now()
        specs = list(Specialty.objects.filter(is_archived=False))

        if not specs:
            self.stdout.write(self.style.WARNING("  ⚠ Mutaxassisliklar topilmadi"))
            return 0, 0

        if use_mock:
            groups_data = []
            for i, spec in enumerate(specs):
                for year in range(1, 5):
                    groups_data.append({
                        "name": f"{spec.code[:6]}-{24 + year}",
                        "_spec_obj": spec, "_study_year": year, "active": True,
                    })
            spec_by_hemis = {}
        else:
            groups_data = hemis_get("/v1/data/group-list")
            spec_by_hemis = {s.hemis_specialty_id: s for s in specs}

        synced_keys = set()  # (specialty_id, name)
        saved = restored = 0

        for g in groups_data:
            if not g.get("active"):
                continue
            if "_spec_obj" in g:
                spec = g["_spec_obj"]
                study_year = g["_study_year"]
            else:
                spec_id = (g.get("specialty") or {}).get("id")
                spec = spec_by_hemis.get(str(spec_id))
                study_year = 1

            name = g["name"]
            if not spec:
                continue

            key = (spec.pk, name)
            synced_keys.add(key)

            grp, created = StudyGroup.objects.get_or_create(
                specialty=spec, name=name,
                defaults={"study_year": study_year, "synced_at": now},
            )
            update_fields = ["synced_at"]
            if grp.is_archived:
                grp.is_archived = False
                grp.archived_at = None
                update_fields  += ["is_archived", "archived_at"]
                restored += 1
            grp.synced_at = now
            grp.save(update_fields=update_fields)
            if created:
                saved += 1

        # Arxivlash
        all_active = StudyGroup.objects.filter(is_archived=False).select_related("specialty")
        to_archive = [g.pk for g in all_active if (g.specialty_id, g.name) not in synced_keys]
        archived_count = len(to_archive)
        if to_archive:
            StudyGroup.objects.filter(pk__in=to_archive).update(
                is_archived=True, archived_at=now
            )
            self.stdout.write(self.style.WARNING(f"  ⚠ Arxivlandi: {archived_count} ta guruh"))

        self.stdout.write(self.style.SUCCESS(
            f"  Yangi: {saved} | Tiklandi: {restored} | Arxiv: {archived_count}"
        ))
        return archived_count, restored

    def _sync_subjects(self, uni, use_mock):
        self.stdout.write(self.style.MIGRATE_HEADING("\nFanlar (Subject) yuklanmoqda..."))
        now = timezone.now()
        faculties_by_code = {f.code: f for f in Faculty.objects.filter(
            university=uni, is_archived=False
        )}

        if not faculties_by_code:
            self.stdout.write(self.style.WARNING("  ⚠ Avval fakultetlarni yuklang"))
            return 0, 0

        if use_mock:
            subjects_data = self._build_mock_subjects(faculties_by_code)
        else:
            try:
                raw_items = hemis_get("/v1/data/subject-list")
                self.stdout.write(f"  HEMIS dan {len(raw_items)} ta yozuv topildi")
            except Exception as e:
                self.stdout.write(self.style.WARNING(f"  ⚠ HEMIS API xatosi: {e}\n  Mock ishlatilmoqda..."))
                subjects_data = self._build_mock_subjects(faculties_by_code)
                return self._save_subjects(subjects_data, faculties_by_code, now)

            try:
                all_depts = hemis_get("/v1/data/department-list")
                fac_hemis_id_map = {}
                for d in all_depts:
                    if d.get("structureType", {}).get("code") == "11" and d.get("active"):
                        fac_obj = faculties_by_code.get(d["code"])
                        if fac_obj:
                            fac_hemis_id_map[int(d["id"])] = fac_obj
            except Exception:
                fac_hemis_id_map = {}

            default_fac = list(faculties_by_code.values())[0]
            seen_ids = set()
            subjects_data = []
            for item in raw_items:
                if not item.get("active"):
                    continue
                subj_info = item.get("subject") or {}
                subj_id   = subj_info.get("id")
                if not subj_id or subj_id in seen_ids:
                    continue
                seen_ids.add(subj_id)
                dept      = item.get("department") or {}
                parent_id = dept.get("parent")
                fac       = fac_hemis_id_map.get(int(parent_id)) if parent_id else None
                subjects_data.append({
                    "_faculty_obj": fac or default_fac,
                    "id":           subj_id,
                    "code":         str(subj_info.get("code") or subj_id)[:20],
                    "name":         subj_info.get("name") or "Nomsiz fan",
                    "credit_hours": int(item.get("credit") or 3),
                    "active":       True,
                })
            self.stdout.write(f"  Noyob fanlar: {len(subjects_data)} ta")

        return self._save_subjects(subjects_data, faculties_by_code, now)

    def _save_subjects(self, subjects_data, faculties_by_code, now):
        saved = updated = restored = 0
        synced_codes = set()
        default_fac = list(faculties_by_code.values())[0]

        for s in subjects_data:
            if not s.get("active", True):
                continue
            fac  = s.get("_faculty_obj") or default_fac
            code = str(s.get("code") or s.get("id") or "")[:20]
            name = (s.get("name") or "").strip()[:200]
            if not code or not name:
                continue

            synced_codes.add((fac.pk, code))

            subj, created = Subject.objects.update_or_create(
                faculty=fac, code=code,
                defaults={
                    "name":            name,
                    "hemis_course_id": str(s.get("id") or ""),
                    "credit_hours":    int(s.get("credit_hours") or 3),
                    "is_active":       True,
                    "synced_at":       now,
                    "is_archived":     False,
                    "archived_at":     None,
                },
            )
            if created:
                saved += 1
            else:
                updated += 1
                if subj.is_archived:
                    restored += 1

        # Arxivlash — bu syncda ko'rilmagan aktiv fanlar (faqat shu university)
        fac_ids = set(faculties_by_code[c].pk for c in faculties_by_code)
        all_active = Subject.objects.filter(
            is_archived=False, faculty_id__in=fac_ids
        ).values_list("pk", "faculty_id", "code")
        to_archive = [pk for pk, fac_id, code in all_active if (fac_id, code) not in synced_codes]
        archived_count = len(to_archive)
        if to_archive:
            Subject.objects.filter(pk__in=to_archive).update(
                is_archived=True, archived_at=now
            )

        self.stdout.write(self.style.SUCCESS(
            f"  Yangi: {saved} | Yangilandi: {updated} | "
            f"Tiklandi: {restored} | Arxiv: {archived_count} | "
            f"Aktiv jami: {Subject.objects.filter(is_archived=False).count()} ta"
        ))
        return archived_count, restored

    def _build_mock_subjects(self, faculties):
        result = []
        fac_list = list(faculties.values())
        for code, name, credits, keyword in MOCK_SUBJECTS:
            target_fac = fac_list[0]
            if keyword:
                for fac in fac_list:
                    if keyword.lower() in fac.name.lower():
                        target_fac = fac
                        break
            result.append({
                "id": code, "code": code, "name": name,
                "credit_hours": credits, "active": True, "_faculty_obj": target_fac,
            })
        for i, fac in enumerate(fac_list):
            for j in range(1, 4):
                result.append({
                    "id": f"F{i+1}S{j:02d}", "code": f"F{i+1}S{j:02d}",
                    "name": f"{fac.name} — maxsus kurs {j}",
                    "credit_hours": 3, "active": True, "_faculty_obj": fac,
                })
        return result
