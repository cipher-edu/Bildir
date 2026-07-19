"""
So'rovnoma natijalarini Excel (XLSX) ga eksport + butunlik muhri.

Foydalanuvchi ko'radi: faqat «Javoblar» varag'i (savol matnlari + javoblar).
UUID / response_id / savol ID / respondent_id chiqarilmaydi.

Himoya: varaq paroli + HMAC muhr (yashirin HIMOYA varag'i + document properties).
"""
from __future__ import annotations

import hashlib
import hmac
import io
import re
import uuid
from typing import Any

from django.conf import settings
from django.utils import timezone
from openpyxl import Workbook, load_workbook
from openpyxl.styles import Alignment, Font, PatternFill, Protection
from openpyxl.utils import get_column_letter
from openpyxl.workbook.protection import WorkbookProtection

from . import crypto
from .models import Survey
from .services import SurveyServiceError, decrypt_and_verify

EXPORT_VERSION = "1.1"

HEADER_FILL = PatternFill("solid", fgColor="1E293B")
HEADER_FONT = Font(color="F8FAFC", bold=True, size=11)
LOCKED = Protection(locked=True, hidden=False)

GENDER_LABEL = {
    "M": "Erkak",
    "F": "Ayol",
    "m": "Erkak",
    "f": "Ayol",
    "Erkak": "Erkak",
    "Ayol": "Ayol",
}


def _export_password() -> str:
    raw = getattr(settings, "SURVEY_EXPORT_SHEET_PASSWORD", None) or ""
    if raw:
        return str(raw)[:50]
    material = crypto._hmac_key() + b"|xlsx-sheet-protect-v1"
    return hashlib.sha256(material).hexdigest()[:24]


def _format_answer(item: dict, option_labels: dict[str, dict[str, str]]) -> str:
    qt = item.get("q_type") or ""
    val = item.get("value") or {}
    qid = str(item.get("question_id") or "")
    labels = option_labels.get(qid) or {}

    if qt == "single":
        oid = str(val.get("option_id") or "")
        return labels.get(oid, oid)
    if qt == "multiple":
        ids = val.get("option_ids") or []
        return "; ".join(labels.get(str(i), str(i)) for i in ids)
    if qt in ("rating", "nps", "likert"):
        v = val.get("value")
        return "" if v is None else str(v)
    if qt in ("text", "textarea"):
        return str(val.get("text") or val.get("value") or "")
    return str(val) if val else ""


def _autosize(ws, max_width: int = 42, max_cols: int = 40):
    for col_idx in range(1, min(ws.max_column or 1, max_cols) + 1):
        letter = get_column_letter(col_idx)
        best = 10
        for row in ws.iter_rows(
            min_col=col_idx, max_col=col_idx, max_row=min(ws.max_row or 1, 80)
        ):
            for cell in row:
                if cell.value is None:
                    continue
                best = max(best, min(len(str(cell.value)) + 2, max_width))
        ws.column_dimensions[letter].width = best


def _style_header_row(ws, row: int = 1, cols: int = 1):
    for c in range(1, cols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = HEADER_FONT
        cell.alignment = Alignment(wrap_text=True, vertical="center")


def _lock_all(ws):
    for row in ws.iter_rows():
        for cell in row:
            cell.protection = LOCKED
    pwd = _export_password()
    ws.protection.sheet = True
    ws.protection.password = pwd
    ws.protection.enable()


def _question_header(index: int, text: str) -> str:
    """Savol matni ustun sarlavhasi — UUID yo'q."""
    clean = re.sub(r"\s+", " ", (text or "").strip())
    if len(clean) > 80:
        clean = clean[:77] + "…"
    return f"{index}. {clean}" if clean else f"Savol {index}"


def _meta_display(meta: dict) -> dict[str, str]:
    """Faqat o'qiladigan meta (ID emas)."""
    fac = meta.get("faculty_name") or ""
    year = meta.get("study_year")
    if year is not None and year != "":
        year_s = f"{year}-kurs"
    else:
        year_s = ""
    g_raw = meta.get("gender") or ""
    gender = GENDER_LABEL.get(str(g_raw), str(g_raw) if g_raw else "")
    group = meta.get("group_name") or ""
    specialty = meta.get("specialty_name") or ""
    return {
        "Fakultet": str(fac) if fac else "",
        "Kurs": year_s,
        "Jins": gender,
        "Guruh": str(group) if group else "",
        "Yo'nalish": str(specialty) if specialty else "",
    }


def _collect_answer_rows(
    survey: Survey, questions: list, option_labels: dict
) -> list[dict[str, Any]]:
    """
    Har qator: inson o'qiydigan meta + savollarga javoblar.
    Hech qanday UUID/ID maydoni yo'q.
    """
    is_open = survey.privacy_mode == Survey.PrivacyMode.OPEN
    rows: list[dict[str, Any]] = []
    qs = survey.responses.select_related("respondent").order_by(
        "submitted_bucket", "created_at"
    )
    for resp in qs.iterator():
        try:
            answers = decrypt_and_verify(resp)
        except SurveyServiceError:
            answers = None

        ans_map: dict[str, str] = {}
        if answers:
            for item in answers:
                qid = str(item.get("question_id") or "")
                ans_map[qid] = _format_answer(item, option_labels)

        meta = _meta_display(resp.meta or {})
        row: dict[str, Any] = {
            "№": 0,  # keyin to'ldiriladi
            "Topshirilgan": (
                resp.submitted_bucket.strftime("%d.%m.%Y %H:%M")
                if resp.submitted_bucket
                else (
                    resp.created_at.strftime("%d.%m.%Y %H:%M")
                    if resp.created_at
                    else ""
                )
            ),
            **meta,
        }
        if is_open:
            try:
                row["Email"] = (
                    resp.respondent.email
                    if resp.respondent_id and resp.respondent
                    else ""
                )
            except Exception:
                row["Email"] = ""

        for i, q in enumerate(questions, 1):
            row[_question_header(i, q.text)] = ans_map.get(str(q.id), "")

        rows.append(row)

    for i, row in enumerate(rows, 1):
        row["№"] = i
    return rows


def build_results_xlsx(survey: Survey, exporter=None) -> tuple[bytes, dict]:
    """
    Returns (xlsx_bytes, meta).
    Excel: asosan «Javoblar» — faqat javoblar (ID larsiz).
    """
    questions = list(survey.questions.order_by("order", "created_at"))
    option_labels: dict[str, dict[str, str]] = {}
    for q in questions:
        labels: dict[str, str] = {}
        for opt in q.options or []:
            if isinstance(opt, dict) and opt.get("id"):
                labels[str(opt["id"])] = str(opt.get("text") or opt["id"])
        option_labels[str(q.id)] = labels

    answer_rows = _collect_answer_rows(survey, questions, option_labels)

    now = timezone.now()
    export_id = str(uuid.uuid4())
    export_meta = {
        "export_id": export_id,
        "exported_at": now.isoformat(),
        "exported_by": (
            getattr(exporter, "email", None)
            or str(getattr(exporter, "id", "") or "")
            or "system"
        ),
    }

    # Imzo: faqat javob matnlari (ID yo'q)
    seal_rows = []
    for row in answer_rows:
        seal_rows.append({k: v for k, v in row.items()})
    payload = {
        "v": EXPORT_VERSION,
        "export_id": export_id,
        "exported_at": export_meta["exported_at"],
        "survey_title": survey.title,
        "privacy_mode": survey.privacy_mode,
        "response_count": len(answer_rows),
        "answers": seal_rows,
    }
    content_hash, signature = crypto.seal_payload(payload)

    wb = Workbook()

    # ── Asosiy: Javoblar (ID larsiz) ───────────────────────────
    ws = wb.active
    ws.title = "Javoblar"

    is_open = survey.privacy_mode == Survey.PrivacyMode.OPEN
    base_headers = ["№", "Topshirilgan", "Fakultet", "Kurs", "Jins", "Guruh", "Yo'nalish"]
    if is_open:
        base_headers.append("Email")

    q_headers = [_question_header(i, q.text) for i, q in enumerate(questions, 1)]
    headers = base_headers + q_headers

    for c, h in enumerate(headers, 1):
        ws.cell(row=1, column=c, value=h)
    _style_header_row(ws, 1, len(headers))
    ws.row_dimensions[1].height = 36
    ws.freeze_panes = "A2"

    for ri, row in enumerate(answer_rows, start=2):
        for c, h in enumerate(headers, 1):
            ws.cell(row=ri, column=c, value=row.get(h, ""))

    _autosize(ws, max_width=40, max_cols=min(len(headers), 25))
    _lock_all(ws)

    # ── Yashirin HIMOYA (foydalanuvchiga kerak emas, verify uchun) ─
    ws_h = wb.create_sheet("HIMOYA")
    ws_h.sheet_state = "hidden"
    seal_kv = [
        ("Eksport ID", export_id),
        ("Versiya", EXPORT_VERSION),
        ("So'rovnoma ID", str(survey.id)),
        ("Sarlavha", survey.title),
        ("Eksport vaqti", export_meta["exported_at"]),
        ("Eksport qilgan", export_meta["exported_by"]),
        ("Javoblar soni", len(answer_rows)),
        ("Content SHA-256", content_hash),
        ("HMAC imzo", signature),
    ]
    for i, (k, v) in enumerate(seal_kv, start=1):
        ws_h.cell(row=i, column=1, value=k)
        ws_h.cell(row=i, column=2, value=v)
    _lock_all(ws_h)

    pwd = _export_password()
    wb.security = WorkbookProtection(
        workbookPassword=pwd,
        lockStructure=True,
        lockWindows=False,
    )

    wb.properties.title = f"Javoblar — {survey.title}"[:200]
    wb.properties.subject = f"export_id={export_id}"
    wb.properties.keywords = f"ndu-export;v={EXPORT_VERSION};hash={content_hash[:16]}"
    wb.properties.creator = "NDU Survey Export"
    wb.properties.description = (
        f"HMAC={signature};SHA256={content_hash};export_id={export_id}"
    )

    buf = io.BytesIO()
    wb.save(buf)
    data = buf.getvalue()

    safe_title = (
        re.sub(r"[^\w\-]+", "_", survey.title, flags=re.UNICODE)[:40].strip("_")
        or "survey"
    )
    stamp = now.strftime("%Y%m%d_%H%M")
    filename = f"javoblar_{safe_title}_{stamp}.xlsx"

    meta = {
        "export_id": export_id,
        "content_hash": content_hash,
        "signature": signature,
        "filename": filename,
        "bytes": len(data),
        "response_count": len(answer_rows),
        "exported_at": export_meta["exported_at"],
    }
    return data, meta


def verify_results_xlsx(survey: Survey, file_bytes: bytes) -> dict:
    """Yashirin HIMOYA varag'idagi hash/imzo juftligini tekshiradi."""
    try:
        wb = load_workbook(io.BytesIO(file_bytes), read_only=True, data_only=True)
    except Exception as e:
        raise SurveyServiceError(f"Excel o'qilmadi: {e}", 400)

    if "HIMOYA" not in wb.sheetnames:
        raise SurveyServiceError(
            "Himoya muhri topilmadi — fayl eksport formati emas yoki buzilgan.",
            400,
        )

    ws = wb["HIMOYA"]
    kv: dict[str, str] = {}
    for row in ws.iter_rows(min_row=1, max_col=2, values_only=True):
        if not row or not row[0]:
            continue
        kv[str(row[0]).strip()] = "" if row[1] is None else str(row[1]).strip()

    survey_id = kv.get("So'rovnoma ID") or kv.get("So‘rovnoma ID") or ""
    content_hash = kv.get("Content SHA-256") or ""
    signature = kv.get("HMAC imzo") or ""
    export_id = kv.get("Eksport ID") or ""

    if survey_id and survey_id != str(survey.id):
        return {
            "valid": False,
            "reason": "Fayl boshqa so'rovnomaga tegishli.",
            "export_id": export_id,
            "content_hash": content_hash,
        }

    if not content_hash or not signature:
        return {
            "valid": False,
            "reason": "Hash yoki imzo topilmadi.",
            "export_id": export_id,
        }

    expected_sig = hmac.new(
        crypto._hmac_key(),
        content_hash.encode("ascii"),
        hashlib.sha256,
    ).hexdigest()
    sig_ok = hmac.compare_digest(expected_sig, signature)

    if not sig_ok:
        return {
            "valid": False,
            "reason": "HMAC imzo yaroqsiz — fayl tahrirlangan bo'lishi mumkin.",
            "export_id": export_id,
            "content_hash": content_hash,
            "signature_ok": False,
        }

    return {
        "valid": True,
        "reason": "Imzo server kaliti bilan mos.",
        "export_id": export_id,
        "content_hash": content_hash,
        "signature_ok": True,
        "survey_id_match": True,
    }
