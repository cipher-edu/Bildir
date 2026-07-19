"""Barcha anonim so'rovnomalarni DB darajasida to'liq anonimlashtirish + hisobot."""
from apps.surveys.models import Survey, SurveyParticipation, SurveyResponse
from apps.surveys.services import anonymize_participations


def main():
    print("=== OLDIN ===")
    print("Surveys:", Survey.objects.count())
    for s in Survey.objects.all().order_by("-created_at"):
        parts = s.participations.count()
        with_user = s.participations.exclude(user__isnull=True).count()
        resps = s.responses.count()
        with_resp = s.responses.exclude(respondent__isnull=True).count()
        print(
            f"  [{s.status}] {s.title!r} "
            f"privacy={s.privacy_mode} track={s.track_participation} "
            f"part={parts}/{with_user}user resp={resps}/{with_resp}user"
        )

    # 1) Anonim privacy: track_participation o'chirish + user unlink
    unlinked = 0
    track_off = 0
    for s in Survey.objects.filter(privacy_mode="anonymous"):
        if s.track_participation:
            s.track_participation = False
            s.save(update_fields=["track_participation"])
            track_off += 1
        unlinked += anonymize_participations(s)

    # 2) track=False (har qanday privacy) — user unlink
    for s in Survey.objects.filter(track_participation=False):
        unlinked += anonymize_participations(s)

    # 3) Anonim javoblarda respondent qolgan bo'lsa — NULL
    resp_cleared = SurveyResponse.objects.filter(
        survey__privacy_mode="anonymous"
    ).exclude(respondent__isnull=True).update(respondent=None)

    # 4) track=False open rejimda ham participation user unlink (allaqachon)
    # Open mode responses keep respondent by design

    print()
    print("=== BAJARILDI ===")
    print(f"  track_participation o'chirildi (anonymous): {track_off} ta so'rovnoma")
    print(f"  participation user unlink: {unlinked} ta yozuv")
    print(f"  anonymous response respondent=NULL: {resp_cleared} ta")

    print()
    print("=== KEYIN ===")
    for s in Survey.objects.all().order_by("-created_at"):
        parts = list(s.participations.all()[:10])
        resps = list(s.responses.all()[:10])
        with_user = s.participations.exclude(user__isnull=True).count()
        with_resp = s.responses.exclude(respondent__isnull=True).count()
        print(f"  [{s.status}] {s.title!r}")
        print(f"    privacy={s.privacy_mode}  track_participation={s.track_participation}")
        print(
            f"    ishtirok: {s.participations.count()} ta "
            f"(shaxsga bog'langan: {with_user})"
        )
        print(
            f"    javoblar: {s.responses.count()} ta "
            f"(respondent bog'langan: {with_resp})"
        )
        for p in parts:
            key = (p.participant_key or "")[:16]
            print(
                f"      participation {str(p.id)[:8]}… "
                f"status={p.status} user_id={p.user_id} "
                f"key={key}… day={p.submitted_day}"
            )
        for r in resps:
            print(
                f"      response {str(r.id)[:8]}… "
                f"respondent_id={r.respondent_id} sealed={r.is_sealed} "
                f"meta={list((r.meta or {}).keys())}"
            )

    print()
    print("=== YAKUNIY XULOSA ===")
    print(
        "Participations with user_id:",
        SurveyParticipation.objects.exclude(user__isnull=True).count(),
    )
    print(
        "Responses with respondent_id (faqat open bo'lishi kerak):",
        SurveyResponse.objects.exclude(respondent__isnull=True).count(),
    )
    print(
        "Anonymous surveys still track=on:",
        Survey.objects.filter(privacy_mode="anonymous", track_participation=True).count(),
    )
    print("OK — anonim so'rovnomalarda shaxs bog'lanishi DB da yo'q.")


if __name__ == "__main__":
    main()
