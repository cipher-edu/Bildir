"""
Surveys domain services — biznes mantiq (API dan mustaqil).
"""
from __future__ import annotations

import io
import logging
import uuid
from datetime import timedelta
from typing import Any

from django.conf import settings
from django.core.files.base import ContentFile
from django.db import transaction
from django.db.models import Q
from django.utils import timezone

from apps.users.models import User

from . import crypto
from .models import Survey, SurveyParticipation, SurveyQuestion, SurveyResponse

logger = logging.getLogger("auth_starter.surveys")

STAFF_ROLES = {
    User.Role.TEACHER,
    User.Role.METHODIST,
    User.Role.DEPARTMENT_HEAD,
    User.Role.PROCTOR,
    User.Role.ADMIN,
    User.Role.SUPERADMIN,
    User.Role.AUDIT_INSPECTOR,
}

TOKEN_TTL_MINUTES = 60


class SurveyServiceError(Exception):
    def __init__(self, detail: str, code: int = 400):
        self.detail = detail
        self.code = code
        super().__init__(detail)


# ── Targeting ─────────────────────────────────────────────────

def user_matches_audience(survey: Survey, user: User) -> bool:
    role = user.role
    if survey.audience == Survey.Audience.STUDENTS:
        return role == User.Role.STUDENT
    if survey.audience == Survey.Audience.STAFF:
        return role in STAFF_ROLES
    return True  # all


def user_matches_targeting(survey: Survey, user: User) -> bool:
    """Fakultet / yo'nalish / guruh / kurs filtrlari."""
    fac_ids = list(survey.faculties.values_list("id", flat=True))
    if fac_ids:
        if not user.faculty_id or user.faculty_id not in fac_ids:
            return False

    spec_ids = list(survey.specialties.values_list("id", flat=True))
    if spec_ids:
        if not user.specialty_id or user.specialty_id not in spec_ids:
            return False

    group_ids = list(survey.groups.values_list("id", flat=True))
    if group_ids:
        if not user.group_id or user.group_id not in group_ids:
            return False

    years = survey.study_years or []
    if years:
        if user.study_year is None or user.study_year not in years:
            return False

    return True


def user_can_take(survey: Survey, user: User) -> tuple[bool, str]:
    if survey.status != Survey.Status.PUBLISHED:
        return False, "So'rovnoma nashr qilinmagan yoki yopilgan."
    if not survey.is_within_schedule():
        return False, "So'rovnoma muddati tugagan yoki hali boshlanmagan."
    if not user_matches_audience(survey, user):
        return False, "Bu so'rovnoma sizning auditoriyangiz uchun emas."
    if not user_matches_targeting(survey, user):
        return False, "Bu so'rovnoma sizning guruh/fakultetingiz uchun emas."
    return True, ""


def build_response_meta(survey: Survey, user: User) -> dict:
    """
    Statistika snapshot (shaxs ID emas — kesimlar uchun).
    Fakultet, kurs, jins, guruh — dashboard kesimlari uchun.
    """
    if survey.stats_level == Survey.StatsLevel.NONE:
        return {}

    meta: dict[str, Any] = {}
    # Anonim qatorda barqaror id saqlanmaydi (fakultet/guruh/yo'nalish FK).
    anonymous = survey.privacy_mode == Survey.PrivacyMode.ANONYMOUS

    if user.faculty_id:
        if not anonymous:
            meta["faculty_id"] = str(user.faculty_id)
        try:
            fac = user.faculty
            if fac is not None:
                meta["faculty_name"] = fac.name
        except Exception:
            pass

    # Kurs
    if user.study_year is not None:
        meta["study_year"] = user.study_year

    # Jins
    gender = getattr(user, "gender", None)
    if gender:
        meta["gender"] = gender  # M / F

    # Guruh faqat aniq so'ralganda. coarse/detailed o'zi guruhni yozmaydi.
    if user.group_id and survey.store_group_meta:
        if not anonymous:
            meta["group_id"] = str(user.group_id)
        try:
            grp = user.group
            if grp is not None:
                meta["group_name"] = grp.name
        except Exception:
            pass

    if survey.stats_level == Survey.StatsLevel.DETAILED and user.specialty_id:
        if not anonymous:
            meta["specialty_id"] = str(user.specialty_id)
        try:
            sp = user.specialty
            if sp is not None:
                meta["specialty_name"] = sp.name
        except Exception:
            pass

    return meta


def hour_bucket(dt=None):
    dt = dt or timezone.now()
    return dt.replace(minute=0, second=0, microsecond=0)


# ── Publish + QR ──────────────────────────────────────────────

def generate_qr_image(url: str) -> ContentFile:
    try:
        import qrcode
    except ImportError as e:
        raise SurveyServiceError(
            "qrcode paketi o'rnatilmagan. pip install qrcode[pil]", 500
        ) from e

    img = qrcode.make(url)
    buf = io.BytesIO()
    img.save(buf, format="PNG")
    buf.seek(0)
    return ContentFile(buf.read(), name="qr.png")


@transaction.atomic
def publish_survey(survey: Survey) -> Survey:
    if survey.status not in (Survey.Status.DRAFT, Survey.Status.CLOSED):
        raise SurveyServiceError("Faqat qoralama yoki yopilgan so'rovnoma nashr qilinadi.")
    if not survey.questions.exists():
        raise SurveyServiceError("Kamida bitta savol bo'lishi kerak.")

    survey.public_path = survey.public_path or f"/s/{survey.id}"
    survey.status = Survey.Status.PUBLISHED
    survey.published_at = timezone.now()
    survey.closed_at = None
    survey.save(
        update_fields=[
            "public_path", "status", "published_at", "closed_at", "updated_at",
        ]
    )

    qr_file = generate_qr_image(survey.public_url)
    survey.qr_image.save(f"{survey.id}.png", qr_file, save=True)
    return survey


@transaction.atomic
def close_survey(survey: Survey) -> Survey:
    if survey.status != Survey.Status.PUBLISHED:
        raise SurveyServiceError("Faqat nashr qilingan so'rovnoma yopiladi.")
    survey.status = Survey.Status.CLOSED
    survey.closed_at = timezone.now()
    survey.save(update_fields=["status", "closed_at", "updated_at"])
    return survey


# ── Take / Submit ─────────────────────────────────────────────

@transaction.atomic
def start_participation(survey: Survey, user: User) -> tuple[SurveyParticipation, str]:
    """
    Ishtirokni boshlash + bir martalik token.
    Returns (participation, raw_token).
    """
    ok, reason = user_can_take(survey, user)
    if not ok:
        raise SurveyServiceError(reason, 403)

    pkey = crypto.participant_key(user.id, survey.id)
    part = (
        SurveyParticipation.objects.select_for_update()
        .filter(survey=survey, participant_key=pkey)
        .first()
    )
    # Eski yozuvlar (migration oldin): user FK orqali
    if not part:
        part = (
            SurveyParticipation.objects.select_for_update()
            .filter(survey=survey, user=user)
            .first()
        )
        if part and not part.participant_key:
            part.participant_key = pkey
            part.save(update_fields=["participant_key"])

    if part and part.status == SurveyParticipation.Status.SUBMITTED:
        raise SurveyServiceError("Siz allaqachon ishtirok etgansiz.", 409)
    if part and part.token_used:
        raise SurveyServiceError("Siz allaqachon ishtirok etgansiz.", 409)

    raw = crypto.issue_participation_token()
    th = crypto.hash_participation_token(raw)
    expires = timezone.now() + timedelta(minutes=TOKEN_TTL_MINUTES)

    if part:
        part.token_hash = th
        part.token_used = False
        part.token_expires_at = expires
        part.status = SurveyParticipation.Status.STARTED
        # Seans davomida token bog'lash uchun user vaqtincha saqlanadi
        part.user = user if survey.track_participation else None
        part.participant_key = pkey
        part.save(
            update_fields=[
                "token_hash", "token_used", "token_expires_at", "status",
                "user", "participant_key",
            ]
        )
    else:
        part = SurveyParticipation.objects.create(
            survey=survey,
            user=user if survey.track_participation else None,
            participant_key=pkey,
            status=SurveyParticipation.Status.STARTED,
            token_hash=th,
            token_used=False,
            token_expires_at=expires,
        )
    return part, raw


def _validate_answers(survey: Survey, answers: list[dict]) -> list[dict]:
    questions = {
        str(q.id): q
        for q in survey.questions.all()
    }
    if not answers:
        raise SurveyServiceError("Javoblar bo'sh.")

    by_qid: dict[str, dict] = {}
    for item in answers:
        qid = str(item.get("question_id", ""))
        if qid not in questions:
            raise SurveyServiceError(f"Noma'lum savol: {qid}")
        if qid in by_qid:
            raise SurveyServiceError(f"Takroriy javob: {qid}")
        by_qid[qid] = item

    normalized: list[dict] = []
    for qid, q in questions.items():
        item = by_qid.get(qid)
        if not item:
            if q.required:
                raise SurveyServiceError(f"Majburiy savol: {qid}")
            continue
        value = item.get("value")
        _validate_one(q, value)
        normalized.append({"question_id": qid, "q_type": q.q_type, "value": value})
    return normalized


def _validate_one(q: SurveyQuestion, value: Any) -> None:
    t = q.q_type
    opts = {str(o.get("id")): o for o in (q.options or []) if isinstance(o, dict)}
    settings_ = q.settings or {}

    if t == SurveyQuestion.QType.SINGLE:
        if not isinstance(value, dict) or "option_id" not in value:
            raise SurveyServiceError(f"single: option_id kerak ({q.id})")
        if str(value["option_id"]) not in opts:
            raise SurveyServiceError(f"Noto'g'ri variant ({q.id})")

    elif t == SurveyQuestion.QType.MULTIPLE:
        if not isinstance(value, dict) or "option_ids" not in value:
            raise SurveyServiceError(f"multiple: option_ids kerak ({q.id})")
        ids = value["option_ids"]
        if not isinstance(ids, list) or not ids:
            raise SurveyServiceError(f"multiple: kamida 1 variant ({q.id})")
        for oid in ids:
            if str(oid) not in opts:
                raise SurveyServiceError(f"Noto'g'ri variant ({q.id})")
        max_s = settings_.get("max_select")
        min_s = settings_.get("min_select", 1)
        if min_s and len(ids) < min_s:
            raise SurveyServiceError(f"Kamida {min_s} variant tanlang ({q.id})")
        if max_s and len(ids) > max_s:
            raise SurveyServiceError(f"Ko'pi bilan {max_s} variant ({q.id})")

    elif t in (SurveyQuestion.QType.TEXT, SurveyQuestion.QType.TEXTAREA):
        if not isinstance(value, dict) or "text" not in value:
            raise SurveyServiceError(f"text kerak ({q.id})")
        text = str(value["text"] or "")
        max_len = settings_.get(
            "max_length",
            500 if t == SurveyQuestion.QType.TEXT else 5000,
        )
        if q.required and not text.strip():
            raise SurveyServiceError(f"Matn bo'sh ({q.id})")
        if len(text) > max_len:
            raise SurveyServiceError(f"Matn juda uzun ({q.id})")

    elif t == SurveyQuestion.QType.RATING:
        if not isinstance(value, dict) or "value" not in value:
            raise SurveyServiceError(f"rating value kerak ({q.id})")
        lo = int(settings_.get("min", 1))
        hi = int(settings_.get("max", 5))
        v = value["value"]
        if not isinstance(v, (int, float)) or not (lo <= float(v) <= hi):
            raise SurveyServiceError(f"rating {lo}–{hi} oralig'ida ({q.id})")

    elif t == SurveyQuestion.QType.NPS:
        if not isinstance(value, dict) or "value" not in value:
            raise SurveyServiceError(f"nps value kerak ({q.id})")
        v = value["value"]
        if not isinstance(v, (int, float)) or not (0 <= float(v) <= 10):
            raise SurveyServiceError(f"nps 0–10 ({q.id})")

    elif t == SurveyQuestion.QType.LIKERT:
        if not isinstance(value, dict) or "value" not in value:
            raise SurveyServiceError(f"likert value kerak ({q.id})")
        v = value["value"]
        if not isinstance(v, (int, float)) or not (1 <= float(v) <= 5):
            raise SurveyServiceError(f"likert 1–5 ({q.id})")

    else:
        raise SurveyServiceError(f"Noma'lum savol turi: {t}")


@transaction.atomic
def submit_response(
    survey: Survey,
    user: User,
    raw_token: str,
    answers: list[dict],
) -> SurveyResponse:
    ok, reason = user_can_take(survey, user)
    if not ok:
        raise SurveyServiceError(reason, 403)

    pkey = crypto.participant_key(user.id, survey.id)
    part = (
        SurveyParticipation.objects.select_for_update()
        .filter(survey=survey, participant_key=pkey)
        .first()
    )
    if not part:
        part = (
            SurveyParticipation.objects.select_for_update()
            .filter(survey=survey, user=user)
            .first()
        )
    if not part:
        raise SurveyServiceError("Avval so'rovnomani boshlang (token oling).", 400)
    if part.status == SurveyParticipation.Status.SUBMITTED or part.token_used:
        raise SurveyServiceError("Siz allaqachon ishtirok etgansiz.", 409)
    if not part.token_hash or not raw_token:
        raise SurveyServiceError("Token noto'g'ri.", 400)
    if part.token_expires_at and timezone.now() > part.token_expires_at:
        raise SurveyServiceError("Token muddati tugagan. Qayta boshlang.", 400)

    expected = crypto.hash_participation_token(raw_token)
    if not secrets_compare(part.token_hash, expected):
        raise SurveyServiceError("Token noto'g'ri.", 400)

    normalized = _validate_answers(survey, answers)
    meta = build_response_meta(survey, user)
    bucket = hour_bucket()

    # ── Race-safe claim: birinchi muvaffaqiyatli lock egasi yutadi ──
    # select_for_update ostida conditional UPDATE — parallel submit 409
    unlink_user = not survey.track_participation
    claim_fields: dict[str, Any] = {
        "token_used": True,
        "token_hash": "",
        "status": SurveyParticipation.Status.SUBMITTED,
        "submitted_day": timezone.localdate(),
        "participant_key": pkey,
    }
    if unlink_user:
        claim_fields["user"] = None
    claimed = SurveyParticipation.objects.filter(
        pk=part.pk,
        status=SurveyParticipation.Status.STARTED,
        token_used=False,
    ).update(**claim_fields)
    if claimed != 1:
        raise SurveyServiceError("Siz allaqachon ishtirok etgansiz.", 409)

    # Seal payload — respondent faqat open rejimda hash ichida
    seal_body: dict[str, Any] = {
        "survey_id": str(survey.id),
        "answers": normalized,
        "meta": meta,
        "submitted_bucket": bucket.isoformat(),
        "privacy_mode": survey.privacy_mode,
    }
    respondent = None
    if survey.privacy_mode == Survey.PrivacyMode.OPEN:
        respondent = user
        seal_body["respondent_id"] = str(user.id)

    chash, sig = crypto.seal_payload(seal_body)
    enc = crypto.encrypt_answers(normalized)

    response = SurveyResponse(
        survey=survey,
        respondent=respondent,
        meta=meta,
        answers_encrypted=enc,
        content_hash=chash,
        signature=sig,
        is_sealed=True,
        seal_version=1,
        submitted_bucket=bucket,
    )
    # to'g'ridan-to'g'ri insert — save() sealed check create uchun OK
    response.save()

    # Anonim: response ↔ participation FK yo'q
    logger.info(
        "survey_submit ok survey=%s privacy=%s response=%s",
        survey.id,
        survey.privacy_mode,
        response.id,
        # user_id logga yozilmaydi anonymous da — open da ham minimal
    )
    return response


def secrets_compare(a: str, b: str) -> bool:
    import hmac as _hmac
    return _hmac.compare_digest(a or "", b or "")


def user_already_submitted(survey: Survey, user: User) -> bool:
    """participant_key yoki user FK orqali topshirilganligini tekshirish."""
    pkey = crypto.participant_key(user.id, survey.id)
    return SurveyParticipation.objects.filter(
        survey=survey,
        status=SurveyParticipation.Status.SUBMITTED,
    ).filter(Q(participant_key=pkey) | Q(user=user)).exists()


def anonymize_participations(survey: Survey) -> int:
    """
    track_participation o'chirilganda: barcha ishtirokchilardan user FK ni olib tashlash.
    participant_key saqlanadi — qayta ovoz to'sig'i ishlaydi, lekin shaxs topilmaydi.
    """
    qs = SurveyParticipation.objects.filter(survey=survey).exclude(user__isnull=True)
    n = 0
    for part in qs.iterator():
        if part.user_id and not part.participant_key:
            part.participant_key = crypto.participant_key(part.user_id, survey.id)
        part.user = None
        part.save(update_fields=["user", "participant_key"])
        n += 1
    return n


def decrypt_and_verify(response: SurveyResponse) -> list | None:
    """Admin agregatsiya uchun. Muhr buzilgan bo'lsa None / raise."""
    answers = crypto.decrypt_answers(response.answers_encrypted)
    seal_body = {
        "survey_id": str(response.survey_id),
        "answers": answers,
        "meta": response.meta or {},
        "submitted_bucket": response.submitted_bucket.isoformat(),
        "privacy_mode": response.survey.privacy_mode,
    }
    if response.respondent_id:
        seal_body["respondent_id"] = str(response.respondent_id)
    if not crypto.verify_seal(seal_body, response.content_hash, response.signature):
        logger.error("survey response seal broken id=%s", response.id)
        raise SurveyServiceError("Javob muhrı buzilgan — ma'lumot ishonchsiz.", 500)
    return answers


def aggregate_results(survey: Survey) -> dict:
    """Savol bo'yicha agregatsiya + vaqt bo'yicha chiziq (dashboard)."""
    from collections import Counter, defaultdict

    questions = list(survey.questions.order_by("order", "created_at"))
    # option_id → matn
    option_labels: dict[str, dict[str, str]] = {}
    q_stats: dict[str, Any] = {}
    for q in questions:
        labels: dict[str, str] = {}
        for o in q.options or []:
            if isinstance(o, dict) and o.get("id") is not None:
                labels[str(o["id"])] = str(o.get("text") or o["id"])
        option_labels[str(q.id)] = labels
        q_stats[str(q.id)] = {
            "question_id": str(q.id),
            "text": q.text,
            "q_type": q.q_type,
            "count": 0,
            "distribution": {},
            "distribution_labeled": [],  # [{label, value, pct}] chart uchun
            "average": None,
            "texts_sample": [],
        }

    total = 0
    meta_breakdown: dict[str, Counter] = defaultdict(Counter)
    timeline: Counter = Counter()  # day -> count
    # Kesim bo'yicha javob soni + raqamli o'rtacha (rating/nps/likert)
    dim_counts: dict[str, Counter] = {
        "faculty": Counter(),
        "study_year": Counter(),
        "gender": Counter(),
        "group": Counter(),
    }
    dim_score_sum: dict[str, Counter] = {
        "faculty": Counter(),
        "study_year": Counter(),
        "gender": Counter(),
        "group": Counter(),
    }
    dim_score_n: dict[str, Counter] = {
        "faculty": Counter(),
        "study_year": Counter(),
        "gender": Counter(),
        "group": Counter(),
    }
    # Kun × kesim qiymati → son (line chart multi-series)
    dim_day: dict[str, dict[str, Counter]] = {
        "faculty": defaultdict(Counter),
        "study_year": defaultdict(Counter),
        "gender": defaultdict(Counter),
        "group": defaultdict(Counter),
    }

    GENDER_LABEL = {"M": "Erkak", "F": "Ayol", "m": "Erkak", "f": "Ayol"}

    def _dim_keys(meta: dict) -> dict[str, str]:
        """meta -> o'qiladigan kesim kalitlari."""
        out: dict[str, str] = {}
        fac = meta.get("faculty_name") or meta.get("faculty_id")
        if fac:
            out["faculty"] = str(fac)
        if meta.get("study_year") is not None and meta.get("study_year") != "":
            out["study_year"] = str(meta["study_year"])
        g = meta.get("gender")
        if g:
            out["gender"] = GENDER_LABEL.get(str(g), str(g))
        grp = meta.get("group_name") or meta.get("group_id")
        if grp:
            out["group"] = str(grp)
        return out

    for resp in survey.responses.iterator():
        try:
            answers = decrypt_and_verify(resp)
        except SurveyServiceError:
            continue
        total += 1
        # Vaqt chizig'i (kun bo'yicha)
        try:
            day = resp.submitted_bucket.date().isoformat()
        except Exception:
            day = resp.created_at.date().isoformat() if resp.created_at else "unknown"
        timeline[day] += 1

        meta = resp.meta or {}
        for mkey, mval in meta.items():
            # id+name juftligini alohida hisoblashda chalkashtirmaslik
            if mkey.endswith("_id") and mkey.replace("_id", "_name") in meta:
                continue
            if mkey.endswith("_name"):
                continue
            meta_breakdown[mkey][str(mval)] += 1

        dims = _dim_keys(meta)
        for dname, dlabel in dims.items():
            dim_counts[dname][dlabel] += 1
            dim_day[dname][day][dlabel] += 1

        # Raqamli o'rtacha kesim bo'yicha
        numeric_vals = []
        for item in answers or []:
            qt = item.get("q_type")
            val = item.get("value") or {}
            if qt in ("rating", "nps", "likert"):
                try:
                    numeric_vals.append(float(val.get("value")))
                except (TypeError, ValueError):
                    pass
        if numeric_vals:
            avg_one = sum(numeric_vals) / len(numeric_vals)
            for dname, dlabel in dims.items():
                dim_score_sum[dname][dlabel] += avg_one
                dim_score_n[dname][dlabel] += 1

        for item in answers or []:
            qid = str(item.get("question_id"))
            if qid not in q_stats:
                continue
            st = q_stats[qid]
            st["count"] += 1
            val = item.get("value") or {}
            qt = item.get("q_type") or st["q_type"]

            if qt == "single":
                oid = str(val.get("option_id"))
                st["distribution"][oid] = st["distribution"].get(oid, 0) + 1
            elif qt == "multiple":
                for oid in val.get("option_ids") or []:
                    oid = str(oid)
                    st["distribution"][oid] = st["distribution"].get(oid, 0) + 1
            elif qt in ("rating", "nps", "likert"):
                try:
                    num = float(val.get("value"))
                except (TypeError, ValueError):
                    continue
                st["distribution"]["_sum"] = st["distribution"].get("_sum", 0) + num
                st["distribution"]["_n"] = st["distribution"].get("_n", 0) + 1
                key = str(int(num)) if num == int(num) else str(num)
                st["distribution"][key] = st["distribution"].get(key, 0) + 1
            elif qt in ("text", "textarea"):
                st["distribution"]["responses"] = st["distribution"].get("responses", 0) + 1

    for qid, st in q_stats.items():
        d = st["distribution"]
        if "_n" in d and d["_n"]:
            st["average"] = round(d["_sum"] / d["_n"], 3)
            del d["_sum"]
            del d["_n"]
        labels = option_labels.get(qid, {})
        labeled = []
        n = st["count"] or 1
        for k, v in d.items():
            if k.startswith("_"):
                continue
            label = labels.get(k, k)
            if k == "responses":
                label = "Yozma javoblar"
            labeled.append({
                "key": k,
                "label": label,
                "value": v,
                "pct": round(100 * v / n, 1) if st["count"] else 0,
            })
        # raqamli shkala bo'lsa tartiblash
        if st["q_type"] in ("rating", "nps", "likert"):
            labeled.sort(key=lambda x: float(x["key"]) if str(x["key"]).replace(".", "", 1).isdigit() else 0)
        else:
            labeled.sort(key=lambda x: -x["value"])
        st["distribution_labeled"] = labeled

    # K-anonimlik: kesimda n < k bo'lsa yashiriladi (de-anonymization himoyasi).
    # Anonim so'rovnomada minimal k majburiy; open rejimda ham sozlama qo'llanadi.
    configured = int(survey.min_n_for_breakdown or 10)
    if survey.privacy_mode == Survey.PrivacyMode.ANONYMOUS:
        display_min = max(5, configured)
    else:
        display_min = max(1, configured)
    min_n = display_min

    def _counter_to_labeled(counter: Counter, min_count: int, score_sum=None, score_n=None):
        items = []
        hidden = 0
        for k, v in counter.most_common():
            if v < min_count:
                hidden += v
                continue
            row = {
                "key": k,
                "label": k,
                "value": v,
                "pct": round(100 * v / total, 1) if total else 0,
            }
            if score_sum is not None and score_n is not None and score_n.get(k):
                row["average"] = round(score_sum[k] / score_n[k], 2)
            items.append(row)
        if hidden:
            items.append({
                "key": "_other",
                "label": f"Boshqa / yashirilgan (n<{min_count})",
                "value": hidden,
                "pct": round(100 * hidden / total, 1) if total else 0,
            })
        return items

    def _dim_timeline(dname: str, label_map=None, top_n: int = 8):
        """
        Multi-series line: top N qiymatlar + kunlik sonlar.
        label_map: raw key -> display label (masalan study_year "1" -> "1-kurs")
        """
        # top series by total count
        top = [k for k, _ in dim_counts[dname].most_common(top_n)]
        if label_map:
            series_keys = [label_map(k) for k in top]
            key_to_label = {k: label_map(k) for k in top}
        else:
            series_keys = list(top)
            key_to_label = {k: k for k in top}

        all_days = sorted(dim_day[dname].keys())
        if not all_days and timeline:
            all_days = sorted(timeline.keys())
        # fill continuous days if any
        if all_days:
            from datetime import datetime, timedelta
            try:
                d0 = datetime.strptime(all_days[0], "%Y-%m-%d").date()
                d1 = datetime.strptime(all_days[-1], "%Y-%m-%d").date()
                filled = []
                cur = d0
                while cur <= d1 and len(filled) < 400:
                    filled.append(cur.isoformat())
                    cur += timedelta(days=1)
                all_days = filled
            except Exception:
                pass

        points = []
        for day in all_days:
            row = {"date": day, "values": {}}
            day_c = dim_day[dname].get(day) or Counter()
            for raw_k in top:
                lab = key_to_label[raw_k]
                row["values"][lab] = int(day_c.get(raw_k, 0))
            points.append(row)
        return {"series_keys": series_keys, "points": points}

    def _year_label(k: str) -> str:
        return f"{k}-kurs"

    dimensions = {}
    if survey.stats_level != Survey.StatsLevel.NONE:
        dimensions = {
            "faculty": {
                "label": "Fakultet",
                "items": _counter_to_labeled(
                    dim_counts["faculty"], display_min,
                    dim_score_sum["faculty"], dim_score_n["faculty"],
                ),
                "timeline": _dim_timeline("faculty", top_n=8),
            },
            "study_year": {
                "label": "Kurs",
                "items": _counter_to_labeled(
                    Counter({f"{k}-kurs": v for k, v in dim_counts["study_year"].items()}),
                    display_min,
                    Counter({f"{k}-kurs": v for k, v in dim_score_sum["study_year"].items()}),
                    Counter({f"{k}-kurs": v for k, v in dim_score_n["study_year"].items()}),
                ),
                "timeline": _dim_timeline("study_year", label_map=_year_label, top_n=8),
            },
            "gender": {
                "label": "Jins",
                "items": _counter_to_labeled(
                    dim_counts["gender"], display_min,
                    dim_score_sum["gender"], dim_score_n["gender"],
                ),
                "timeline": _dim_timeline("gender", top_n=4),
            },
            "group": {
                "label": "Guruh",
                "items": _counter_to_labeled(
                    dim_counts["group"], display_min,
                    dim_score_sum["group"], dim_score_n["group"],
                ),
                "timeline": _dim_timeline("group", top_n=10),
            },
        }

    safe_meta = {}
    for mkey, counter in meta_breakdown.items():
        filtered = {k: v for k, v in counter.items() if v >= display_min}
        if filtered:
            safe_meta[mkey] = filtered

    timeline_series = [
        {"date": d, "count": c}
        for d, c in sorted(timeline.items(), key=lambda x: x[0])
    ]

    return {
        "survey_id": str(survey.id),
        "title": survey.title,
        "status": survey.status,
        "privacy_mode": survey.privacy_mode,
        "track_participation": survey.track_participation,
        "stats_level": survey.stats_level,
        "response_count": total,
        "participation_submitted": survey.participations.filter(
            status=SurveyParticipation.Status.SUBMITTED
        ).count(),
        "participation_started": survey.participations.filter(
            status=SurveyParticipation.Status.STARTED
        ).count(),
        "question_count": len(questions),
        "questions": list(q_stats.values()),
        "meta_breakdown": safe_meta,
        "dimensions": dimensions,
        "min_n_for_breakdown": display_min,
        "timeline": timeline_series,
    }


def ensure_option_ids(options: list) -> list:
    """Admin savol yaratganda option.id yo'q bo'lsa UUID qo'shadi."""
    out = []
    for i, opt in enumerate(options or []):
        if not isinstance(opt, dict):
            continue
        o = dict(opt)
        if not o.get("id"):
            o["id"] = str(uuid.uuid4())
        o.setdefault("order", i)
        o.setdefault("text", "")
        out.append(o)
    return out
