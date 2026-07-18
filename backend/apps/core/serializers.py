"""
OsiyoNigohi — Core Serializers
"""
from rest_framework import serializers
from .models import University, Faculty, Specialty, StudyGroup, Subject


class UniversitySerializer(serializers.ModelSerializer):
    class Meta:
        model  = University
        fields = ["id", "name", "short_name", "code", "city", "domain", "is_active"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "short_name": {"required": False, "allow_blank": True},
            "domain": {"required": False, "allow_blank": True},
            "city":   {"required": False, "allow_blank": True},
        }


class FacultySerializer(serializers.ModelSerializer):
    university_name = serializers.CharField(source="university.short_name", read_only=True)

    class Meta:
        model  = Faculty
        fields = ["id", "name", "code", "university", "university_name"]
        read_only_fields = ["id"]


class SpecialtySerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.name", read_only=True)

    class Meta:
        model  = Specialty
        fields = ["id", "name", "code", "faculty", "faculty_name", "hemis_specialty_id"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "code":               {"required": False, "allow_blank": True},
            "hemis_specialty_id": {"required": False, "allow_blank": True},
        }


class StudyGroupSerializer(serializers.ModelSerializer):
    specialty_name = serializers.CharField(source="specialty.name", read_only=True)

    class Meta:
        model  = StudyGroup
        fields = ["id", "name", "study_year", "degree", "specialty", "specialty_name"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "study_year": {"required": False},
            "degree":     {"required": False, "allow_blank": True},
        }


class SubjectSerializer(serializers.ModelSerializer):
    faculty_name = serializers.CharField(source="faculty.name", read_only=True)

    class Meta:
        model  = Subject
        fields = ["id", "name", "code", "faculty", "faculty_name", "credit_hours", "hemis_course_id"]
        read_only_fields = ["id"]
        extra_kwargs = {
            "code":           {"required": False, "allow_blank": True},
            "faculty":        {"required": False, "allow_null": True},
            "credit_hours":   {"required": False},
            "hemis_course_id":{"required": False, "allow_blank": True},
        }


class SubjectShortSerializer(serializers.ModelSerializer):
    """Boshqa serializer larda nested ishlatish uchun qisqa variant."""
    class Meta:
        model  = Subject
        fields = ["id", "name", "code"]
