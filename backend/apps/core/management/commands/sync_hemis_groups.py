"""
HEMIS dan barcha guruhlarni to'liq sinxronlash (arxiv qo'llab-quvvatlanadi).

Nima qiladi:
  1. HEMIS dan barcha specialty'larni yuklaydi (hemis_specialty_id asosida upsert)
  2. HEMIS dan barcha guruhlarni yuklaydi (specialty ga bog'laydi)
  3. Bu syncda ko'rilmagan yozuvlarni arxivga o'tkazadi
  4. HemisSyncLog'ga yozuv qo'shadi

Ishlatish:
  python manage.py sync_hemis_groups
  python manage.py sync_hemis_groups --skip-specialties
  python manage.py sync_hemis_groups --active-only
"""
import re
import requests
from datetime import date
from django.core.management.base import BaseCommand
from django.conf import settings
from django.db import IntegrityError
from django.utils import timezone
from apps.core.models import University, Faculty, Specialty, StudyGroup, HemisSyncLog

BASE    = getattr(settings, "HEMIS_API_BASE_URL", "https://student.nspi.uz/rest")
TOKEN   = getattr(settings, "HEMIS_BACKEND_TOKEN", "")
HEADERS = {"Authorization": f"Bearer {TOKEN}"}


def hemis_fetch_all(path: str) -> list:
    items, page = [], 1
    while True:
        r = requests.get(
            f"{BASE}{path}", headers=HEADERS,
            params={"limit": 200, "page": page}, timeout=30,
        )
        r.raise_for_status()
        body = r.json()
        if not body.get("success"):
            raise RuntimeError(f"HEMIS xatosi: {body.get('error')}")
        data = body["data"]
        items.extend(data["items"])
        if page >= data["pagination"]["pageCount"]:
            break
        page += 1
    return items


class Command(BaseCommand):
    help = "HEMIS dan barcha specialty va guruhlarni sinxronlash (arxiv bilan)"

    def add_arguments(self, parser):
        parser.add_argument("--skip-specialties", action="store_true")
        parser.add_argument("--active-only", action="store_true")

    def handle(self, *args, **options):
        self.stdout.write(self.style.MIGRATE_HEADING(
            "HEMIS → To'liq guruh sinxronlash boshlanmoqda...\n"
        ))

        uni = University.objects.first()
        if not uni:
            self.stdout.write(self.style.ERROR(
                "❌ Universitet topilmadi. Avval sync_hemis_catalog ni ishlatib katalogni yuklang."
            ))
            return

        sync_log = HemisSyncLog.objects.create(
            started_by="management_command:sync_hemis_groups",
            options={
                "skip_specialties": options["skip_specialties"],
                "active_only":      options["active_only"],
            },
            stats_before={
                "specialties": Specialty.objects.count(),
                "groups":      StudyGroup.objects.count(),
            },
        )

        now = timezone.now()
        archived = {"specialties": 0, "groups": 0}
        restored = {"specialties": 0, "groups": 0}

        try:
            if not options["skip_specialties"]:
                a, r = self._sync_specialties(uni, now)
                archived["specialties"] = a
                restored["specialties"] = r

            a, r = self._sync_groups(options["active_only"], now)
            archived["groups"] = a
            restored["groups"] = r

            sync_log.archived    = archived
            sync_log.restored    = restored
            sync_log.stats_after = {
                "specialties": Specialty.objects.filter(is_archived=False).count(),
                "groups":      StudyGroup.objects.filter(is_archived=False).count(),
            }
            sync_log.save(update_fields=["archived", "restored", "stats_after"])
            sync_log.finish(success=True)

            self.stdout.write(self.style.SUCCESS(
                f"\n{'='*55}\n"
                f"✓ Sinxronlash yakunlandi:\n"
                f"  Specialtylar:  {Specialty.objects.filter(is_archived=False).count():>6} ta"
                f"  (arxiv: {Specialty.objects.filter(is_archived=True).count()})\n"
                f"  Guruhlar:      {StudyGroup.objects.filter(is_archived=False).count():>6} ta\n"
                f"    (aktiv):     {StudyGroup.objects.filter(is_archived=False, is_active=True).count():>6} ta\n"
                f"    (nofaol):    {StudyGroup.objects.filter(is_archived=False, is_active=False).count():>6} ta\n"
                f"    (arxiv):     {StudyGroup.objects.filter(is_archived=True).count():>6} ta\n"
                f"  Arxivlandi: {archived}\n"
                f"  Tiklandi:   {restored}\n"
                f"{'='*55}"
            ))

        except Exception as exc:
            sync_log.finish(success=False, errors=str(exc))
            raise

    # ── Specialty sinxron ─────────────────────────────────────────

    def _sync_specialties(self, uni, now):
        self.stdout.write(self.style.MIGRATE_HEADING("1. Specialtylar yuklanmoqda..."))

        try:
            raw_specs = hemis_fetch_all("/v1/data/specialty-list")
            raw_depts = hemis_fetch_all("/v1/data/department-list")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ HEMIS API xatosi: {e}"))
            return 0, 0

        self.stdout.write(f"   HEMIS dan {len(raw_specs)} ta specialty, "
                          f"{len(raw_depts)} ta department yuklandi")

        fac_by_code = {f.code: f for f in Faculty.objects.filter(
            university=uni, is_archived=False
        )}
        fac_hemis_map = {}
        for d in raw_depts:
            if d.get("structureType", {}).get("code") == "11" and d.get("active"):
                fac = fac_by_code.get(d["code"])
                if fac:
                    fac_hemis_map[int(d["id"])] = fac

        default_fac = list(fac_by_code.values())[0] if fac_by_code else None
        if not default_fac:
            self.stdout.write(self.style.ERROR("   ❌ Hech qanday fakultet topilmadi."))
            return 0, 0

        created_count = updated_count = skipped_count = restored_count = 0
        synced_hemis_ids = set()

        for s in raw_specs:
            if not s.get("active"):
                skipped_count += 1
                continue

            hemis_id = str(s["id"])
            synced_hemis_ids.add(hemis_id)
            raw_code = str(s.get("code") or hemis_id)[:20]
            name     = (s.get("name") or "").strip()[:200]
            if not name:
                skipped_count += 1
                continue

            dept_id = (s.get("department") or {}).get("id")
            fac = fac_hemis_map.get(int(dept_id)) if dept_id else None
            if not fac:
                fac = default_fac

            existing = Specialty.objects.filter(hemis_specialty_id=hemis_id).first()
            if existing:
                update_fields = ["synced_at"]
                if existing.name != name:
                    existing.name = name
                    update_fields.append("name")
                if existing.faculty_id != fac.pk:
                    existing.faculty = fac
                    update_fields.append("faculty")
                if existing.is_archived:
                    existing.is_archived = False
                    existing.archived_at = None
                    update_fields += ["is_archived", "archived_at"]
                    restored_count += 1
                existing.synced_at = now
                existing.save(update_fields=update_fields)
                updated_count += 1
                continue

            code = raw_code
            if Specialty.objects.filter(faculty=fac, code=code).exists():
                code = f"{raw_code[:14]}_{hemis_id}"[:20]
            try:
                Specialty.objects.create(
                    faculty=fac, code=code, name=name,
                    hemis_specialty_id=hemis_id, is_active=True,
                    synced_at=now,
                )
                created_count += 1
            except IntegrityError:
                try:
                    Specialty.objects.create(
                        faculty=fac, code=f"HS{hemis_id}"[:20], name=name,
                        hemis_specialty_id=hemis_id, is_active=True,
                        synced_at=now,
                    )
                    created_count += 1
                except IntegrityError:
                    skipped_count += 1

        # Arxivlash
        archived_qs = Specialty.objects.filter(is_archived=False).exclude(
            hemis_specialty_id__in=synced_hemis_ids
        ).exclude(hemis_specialty_id="")
        archived_count = archived_qs.count()
        if archived_count:
            archived_qs.update(is_archived=True, archived_at=now)

        self.stdout.write(self.style.SUCCESS(
            f"   ✓ Yaratildi: {created_count} | Yangilandi: {updated_count} | "
            f"Tiklandi: {restored_count} | Arxiv: {archived_count} | "
            f"O'tkazildi: {skipped_count}\n"
            f"   Jami aktiv: {Specialty.objects.filter(is_archived=False).count()} ta"
        ))
        return archived_count, restored_count

    # ── Guruh sinxron ─────────────────────────────────────────────

    def _sync_groups(self, active_only: bool, now):
        self.stdout.write(self.style.MIGRATE_HEADING("\n2. Guruhlar yuklanmoqda..."))

        try:
            raw_groups = hemis_fetch_all("/v1/data/group-list")
        except Exception as e:
            self.stdout.write(self.style.ERROR(f"   ❌ HEMIS API xatosi: {e}"))
            return 0, 0

        self.stdout.write(f"   HEMIS dan {len(raw_groups)} ta guruh yuklandi")

        spec_map = {
            s.hemis_specialty_id: s
            for s in Specialty.objects.filter(is_archived=False).exclude(hemis_specialty_id="")
        }

        created_count = updated_count = skipped_count = no_spec_count = restored_count = 0
        synced_keys = set()  # (specialty_id, name)

        for g in raw_groups:
            is_active = bool(g.get("active"))
            if active_only and not is_active:
                skipped_count += 1
                continue

            spec_hemis_id = str((g.get("specialty") or {}).get("id", ""))
            spec = spec_map.get(spec_hemis_id)
            if not spec:
                no_spec_count += 1
                continue

            name = (g.get("name") or "").strip()[:100]
            if not name:
                skipped_count += 1
                continue

            key = (spec.pk, name)
            synced_keys.add(key)
            study_year = self._extract_study_year(name)

            existing = StudyGroup.objects.filter(specialty=spec, name=name).first()
            if existing:
                update_fields = ["synced_at"]
                if existing.is_active != is_active:
                    existing.is_active = is_active
                    update_fields.append("is_active")
                if existing.is_archived:
                    existing.is_archived = False
                    existing.archived_at = None
                    update_fields += ["is_archived", "archived_at"]
                    restored_count += 1
                existing.synced_at = now
                existing.save(update_fields=update_fields)
                updated_count += 1
            else:
                StudyGroup.objects.create(
                    specialty=spec, name=name,
                    study_year=study_year, is_active=is_active,
                    synced_at=now,
                )
                created_count += 1

        # Arxivlash — bu syncda ko'rilmagan aktiv guruhlar
        all_active = StudyGroup.objects.filter(is_archived=False).select_related("specialty")
        to_archive = [g.pk for g in all_active if (g.specialty_id, g.name) not in synced_keys]
        archived_count = len(to_archive)
        if to_archive:
            StudyGroup.objects.filter(pk__in=to_archive).update(
                is_archived=True, archived_at=now
            )

        total_active  = sum(1 for g in raw_groups if g.get("active"))
        total_passive = len(raw_groups) - total_active

        self.stdout.write(self.style.SUCCESS(
            f"   ✓ Yaratildi: {created_count} | Yangilandi: {updated_count} | "
            f"Tiklandi: {restored_count} | Arxiv: {archived_count} | "
            f"Specialty topilmadi: {no_spec_count}\n"
            f"   HEMIS: aktiv={total_active}, nofaol={total_passive}"
        ))
        return archived_count, restored_count

    @staticmethod
    def _extract_study_year(group_name: str) -> int:
        current_year = date.today().year % 100
        m = re.search(r"-(\d{2})\b", group_name)
        if m:
            entry_year = int(m.group(1))
            year = current_year - entry_year
            if 1 <= year <= 6:
                return year
        return 1
