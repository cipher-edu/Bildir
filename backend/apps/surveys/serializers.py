"""Surveys serializers."""
from __future__ import annotations

import uuid

from rest_framework import serializers

from .models import Survey, SurveyQuestion, SurveyParticipation
from .services import ensure_option_ids


class SurveyQuestionSerializer(serializers.ModelSerializer):
    text_i18n = serializers.JSONField(required=False)
    help_text_i18n = serializers.JSONField(required=False)

    class Meta:
        model = SurveyQuestion
        fields = [
            "id", "order", "q_type", "text", "text_i18n",
            "help_text", "help_text_i18n",
            "required", "options", "settings", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate_q_type(self, value):
        allowed = {c.value for c in SurveyQuestion.QType}
        if value not in allowed:
            raise serializers.ValidationError(f"q_type: {sorted(allowed)}")
        return value

    def validate(self, attrs):
        q_type = attrs.get("q_type") or getattr(self.instance, "q_type", None)
        options = attrs.get("options", getattr(self.instance, "options", None) or [])
        if q_type in (
            SurveyQuestion.QType.SINGLE,
            SurveyQuestion.QType.MULTIPLE,
        ):
            if not options:
                raise serializers.ValidationError(
                    {"options": "single/multiple uchun kamida 1 variant kerak."}
                )
            attrs["options"] = ensure_option_ids(options)
        elif "options" in attrs:
            attrs["options"] = ensure_option_ids(options) if options else []
        return attrs

    def to_representation(self, instance):
        from utils.i18n_fields import (
            ensure_i18n_bucket,
            locale_from_request,
            localize_options,
            pick_i18n,
        )

        data = super().to_representation(instance)
        req = self.context.get("request")
        loc = locale_from_request(req) if req is not None else "uz"
        data["text"] = pick_i18n(instance.text, instance.text_i18n, loc)
        data["help_text"] = pick_i18n(instance.help_text, instance.help_text_i18n, loc)
        data["text_i18n"] = ensure_i18n_bucket(instance.text, instance.text_i18n)
        data["help_text_i18n"] = ensure_i18n_bucket(
            instance.help_text, instance.help_text_i18n
        )
        data["options"] = localize_options(instance.options, loc)
        data["locale"] = loc
        return data


class SurveyListSerializer(serializers.ModelSerializer):
    question_count = serializers.IntegerField(read_only=True, required=False)
    response_count = serializers.IntegerField(read_only=True, required=False)
    public_url = serializers.CharField(read_only=True)
    qr_image = serializers.SerializerMethodField()
    created_by_name = serializers.SerializerMethodField()
    title_i18n = serializers.JSONField(required=False)
    description_i18n = serializers.JSONField(required=False)

    class Meta:
        model = Survey
        fields = [
            "id", "title", "title_i18n", "description", "description_i18n",
            "status", "audience",
            "privacy_mode", "stats_level", "min_n_for_breakdown",
            "store_group_meta", "track_participation",
            "start_at", "end_at",
            "study_years", "public_path", "public_url",
            "qr_image", "published_at", "closed_at",
            "created_at", "updated_at",
            "question_count", "response_count", "created_by_name",
        ]
        read_only_fields = [
            "id", "status", "qr_image", "published_at", "closed_at",
            "created_at", "updated_at", "public_url",
        ]

    def get_created_by_name(self, obj):
        u = obj.created_by
        if not u:
            return None
        return u.full_name or u.email

    def get_qr_image(self, obj):
        """Relative /media/... — frontend MEDIA host bilan yig'adi (Docker ichki host chiqmasin)."""
        if not obj.qr_image:
            return None
        try:
            return obj.qr_image.url
        except Exception:
            return None

    def to_representation(self, instance):
        data = super().to_representation(instance)
        from utils.i18n_fields import ensure_i18n_bucket, locale_from_request, pick_i18n

        req = self.context.get("request")
        loc = locale_from_request(req) if req is not None else "uz"
        data["title"] = pick_i18n(instance.title, instance.title_i18n, loc)
        data["description"] = pick_i18n(
            instance.description, instance.description_i18n, loc
        )
        data["title_i18n"] = ensure_i18n_bucket(instance.title, instance.title_i18n)
        data["description_i18n"] = ensure_i18n_bucket(
            instance.description, instance.description_i18n
        )
        data["locale"] = loc
        return data



class SurveyDetailSerializer(SurveyListSerializer):
    questions = SurveyQuestionSerializer(many=True, read_only=True)
    faculties = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    specialties = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    groups = serializers.PrimaryKeyRelatedField(many=True, read_only=True)
    faculty_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    specialty_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )
    group_ids = serializers.ListField(
        child=serializers.UUIDField(), write_only=True, required=False
    )

    class Meta(SurveyListSerializer.Meta):
        fields = SurveyListSerializer.Meta.fields + [
            "questions",
            "faculties", "specialties", "groups",
            "faculty_ids", "specialty_ids", "group_ids",
            "university", "created_by",
        ]
        read_only_fields = SurveyListSerializer.Meta.read_only_fields + [
            "questions", "faculties", "specialties", "groups",
            "created_by",
        ]

    def _set_m2m(self, survey, validated):
        from apps.core.models import Faculty, Specialty, StudyGroup

        if "faculty_ids" in validated:
            ids = validated.pop("faculty_ids")
            survey.faculties.set(Faculty.objects.filter(id__in=ids))
        if "specialty_ids" in validated:
            ids = validated.pop("specialty_ids")
            survey.specialties.set(Specialty.objects.filter(id__in=ids))
        if "group_ids" in validated:
            ids = validated.pop("group_ids")
            survey.groups.set(StudyGroup.objects.filter(id__in=ids))

    def create(self, validated_data):
        faculty_ids = validated_data.pop("faculty_ids", None)
        specialty_ids = validated_data.pop("specialty_ids", None)
        group_ids = validated_data.pop("group_ids", None)
        request = self.context.get("request")
        user = request.user if request else None
        if user and not validated_data.get("university") and getattr(user, "university_id", None):
            validated_data["university_id"] = user.university_id
        validated_data["created_by"] = user
        validated_data["public_path"] = ""  # publish da to'ldiriladi
        survey = Survey.objects.create(**validated_data)
        # re-pack for m2m
        pack = {}
        if faculty_ids is not None:
            pack["faculty_ids"] = faculty_ids
        if specialty_ids is not None:
            pack["specialty_ids"] = specialty_ids
        if group_ids is not None:
            pack["group_ids"] = group_ids
        if pack:
            self._set_m2m(survey, pack)
        survey.public_path = f"/s/{survey.id}"
        survey.save(update_fields=["public_path"])
        return survey

    def update(self, instance, validated_data):
        if instance.status == Survey.Status.PUBLISHED:
            # published: muddat/tavsif + ishtirokchilar ro'yxatini yashirish
            allowed = {
                "title", "description", "end_at", "start_at",
                "track_participation",  # admin ro'yxatni o'chirish (DB yozuvlari saqlanadi)
            }
            validated_data = {k: v for k, v in validated_data.items() if k in allowed}
        elif instance.status != Survey.Status.DRAFT:
            raise serializers.ValidationError("Faqat qoralama to'liq tahrirlanadi.")

        # privacy_mode publish dan keyin o'zgarmaydi (published yuqorida filter)
        faculty_ids = validated_data.pop("faculty_ids", None)
        specialty_ids = validated_data.pop("specialty_ids", None)
        group_ids = validated_data.pop("group_ids", None)

        track_was = instance.track_participation
        for k, v in validated_data.items():
            setattr(instance, k, v)
        instance.save()

        # Ishtirok kuzatish o'chirilsa — DB da ham user bog'lanishini uzish
        if track_was and not instance.track_participation:
            from .services import anonymize_participations
            anonymize_participations(instance)

        pack = {}
        if faculty_ids is not None:
            pack["faculty_ids"] = faculty_ids
        if specialty_ids is not None:
            pack["specialty_ids"] = specialty_ids
        if group_ids is not None:
            pack["group_ids"] = group_ids
        if pack and instance.status == Survey.Status.DRAFT:
            self._set_m2m(instance, pack)
        return instance


class SurveyQuestionWriteSerializer(serializers.ModelSerializer):
    class Meta:
        model = SurveyQuestion
        fields = [
            "id", "order", "q_type", "text", "help_text",
            "required", "options", "settings",
        ]
        read_only_fields = ["id"]

    def validate(self, attrs):
        ser = SurveyQuestionSerializer()
        return ser.validate(attrs)


class TakeQuestionSerializer(serializers.ModelSerializer):
    """Ishtirokchi ko'radi — ortiqcha meta yo'q."""

    class Meta:
        model = SurveyQuestion
        fields = [
            "id", "order", "q_type", "text", "help_text",
            "required", "options", "settings",
        ]


class SurveyTakeSerializer(serializers.ModelSerializer):
    questions = TakeQuestionSerializer(many=True, read_only=True)
    public_url = serializers.CharField(read_only=True)
    already_submitted = serializers.SerializerMethodField()

    class Meta:
        model = Survey
        fields = [
            "id", "title", "description", "privacy_mode",
            "start_at", "end_at", "status", "public_url",
            "questions", "already_submitted",
        ]

    def get_already_submitted(self, obj):
        user = self.context.get("request") and self.context["request"].user
        if not user or not user.is_authenticated:
            return False
        from .services import user_already_submitted
        return user_already_submitted(obj, user)


class SubmitAnswersSerializer(serializers.Serializer):
    token = serializers.CharField(max_length=128)
    answers = serializers.ListField(
        child=serializers.DictField(),
        allow_empty=False,
    )


class ParticipationSerializer(serializers.ModelSerializer):
    user_email = serializers.SerializerMethodField()
    user_name = serializers.SerializerMethodField()

    class Meta:
        model = SurveyParticipation
        fields = [
            "id", "user", "user_email", "user_name",
            "status", "started_at", "submitted_day",
        ]

    def get_user_email(self, obj):
        return obj.user.email if obj.user_id else None

    def get_user_name(self, obj):
        if not obj.user_id:
            return None
        return obj.user.full_name if hasattr(obj.user, "full_name") else None
