"""Surveys — asosiy xavfsizlik va oqim testlari."""
from django.test import TestCase
from django.utils import timezone
from rest_framework.test import APIClient

from apps.users.models import User
from apps.surveys.models import Survey, SurveyQuestion, SurveyParticipation, SurveyResponse
from apps.surveys import crypto, services


class SurveyCryptoTests(TestCase):
    def test_encrypt_decrypt_roundtrip(self):
        data = [{"question_id": "a", "value": {"option_id": "1"}}]
        blob = crypto.encrypt_answers(data)
        self.assertNotEqual(blob, str(data))
        self.assertEqual(crypto.decrypt_answers(blob), data)

    def test_seal_verify(self):
        payload = {"survey_id": "x", "answers": [1]}
        h, sig = crypto.seal_payload(payload)
        self.assertTrue(crypto.verify_seal(payload, h, sig))
        self.assertFalse(crypto.verify_seal({"survey_id": "y", "answers": [1]}, h, sig))


class SurveyFlowTests(TestCase):
    def setUp(self):
        self.admin = User.objects.create_user(
            email="admin@test.uz",
            password="TestPass123!",
            first_name="Admin",
            last_name="User",
            role=User.Role.ADMIN,
            is_staff=True,
        )
        self.student = User.objects.create_user(
            email="student@test.uz",
            password="TestPass123!",
            first_name="Talaba",
            last_name="Bir",
            role=User.Role.STUDENT,
            study_year=2,
        )
        self.client = APIClient()

    def _create_published_anonymous(self):
        survey = Survey.objects.create(
            title="Test anonim",
            audience=Survey.Audience.STUDENTS,
            privacy_mode=Survey.PrivacyMode.ANONYMOUS,
            status=Survey.Status.DRAFT,
            created_by=self.admin,
        )
        SurveyQuestion.objects.create(
            survey=survey,
            order=0,
            q_type=SurveyQuestion.QType.RATING,
            text="Qoniqish?",
            required=True,
            settings={"min": 1, "max": 5},
        )
        return services.publish_survey(survey)

    def test_anonymous_response_has_no_respondent(self):
        survey = self._create_published_anonymous()
        part, token = services.start_participation(survey, self.student)
        q = survey.questions.first()
        resp = services.submit_response(
            survey,
            self.student,
            token,
            [{"question_id": str(q.id), "value": {"value": 5}}],
        )
        self.assertIsNone(resp.respondent_id)
        self.assertTrue(resp.is_sealed)
        part.refresh_from_db()
        self.assertEqual(part.status, SurveyParticipation.Status.SUBMITTED)
        # Double submit
        with self.assertRaises(services.SurveyServiceError):
            services.start_participation(survey, self.student)

    def test_sealed_response_cannot_update(self):
        survey = self._create_published_anonymous()
        _, token = services.start_participation(survey, self.student)
        q = survey.questions.first()
        resp = services.submit_response(
            survey,
            self.student,
            token,
            [{"question_id": str(q.id), "value": {"value": 4}}],
        )
        resp.meta = {"hacked": True}
        from django.core.exceptions import ValidationError
        with self.assertRaises(ValidationError):
            resp.save()

    def test_api_available_and_submit(self):
        survey = self._create_published_anonymous()
        self.client.force_authenticate(user=self.student)
        r = self.client.get("/api/v1/surveys/available/")
        self.assertEqual(r.status_code, 200)
        self.assertTrue(r.data["success"])

        r = self.client.post(f"/api/v1/surveys/{survey.id}/start/")
        self.assertEqual(r.status_code, 200)
        token = r.data["data"]["token"]
        q = survey.questions.first()
        r = self.client.post(
            f"/api/v1/surveys/{survey.id}/submit/",
            {
                "token": token,
                "answers": [{"question_id": str(q.id), "value": {"value": 3}}],
            },
            format="json",
        )
        self.assertEqual(r.status_code, 201)
        self.assertEqual(SurveyResponse.objects.filter(survey=survey).count(), 1)
        self.assertIsNone(SurveyResponse.objects.first().respondent_id)
