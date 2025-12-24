from rest_framework import serializers
from .models import *


class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ['id', 'username', 'email', 'first_name', 'last_name']


class StudentProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = StudentProfile
        fields = '__all__'


class EmployerProfileSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)

    class Meta:
        model = EmployerProfile
        fields = '__all__'


class SkillSerializer(serializers.ModelSerializer):
    class Meta:
        model = Skill
        fields = ['id', 'name']


class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ['id', 'name', 'slug']


class VacancyCreateUpdateSerializer(serializers.ModelSerializer):
    category_id = serializers.PrimaryKeyRelatedField(
        queryset=Category.objects.all(),
        source='category',
        required=False,
        allow_null=True
    )
    
    skill_ids = serializers.PrimaryKeyRelatedField(
        queryset=Skill.objects.all(),
        many=True,
        required=False
    )
    
    class Meta:
        model = Vacancy
        fields = ['title', 'description', 'requirements', 'vacancy_type', 
                  'salary', 'location', 'is_active', 'category_id', 'skill_ids']
    
    def create(self, validated_data):
        # Извлекаем skill_ids
        skill_ids = validated_data.pop('skill_ids', [])
        
        # Создаем вакансию
        vacancy = Vacancy.objects.create(**validated_data)
        
        # Добавляем навыки
        if skill_ids:
            vacancy.skills.set(skill_ids)
        
        return vacancy
    
    def update(self, instance, validated_data):
        # Извлекаем skill_ids
        skill_ids = validated_data.pop('skill_ids', None)
        
        # Обновляем остальные поля
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Обновляем навыки если переданы
        if skill_ids is not None:
            instance.skills.set(skill_ids)
        
        return instance


class VacancySerializer(serializers.ModelSerializer):
    employer = EmployerProfileSerializer(read_only=True)
    category = CategorySerializer(read_only=True)
    skills = SkillSerializer(many=True, read_only=True)
    applications_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Vacancy
        fields = '__all__'
    
    def get_applications_count(self, obj):
        return obj.applications.count()


class ReviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Review
        fields = ['id', 'rating', 'comment', 'from_role', 'created_at']


class ApplicationSerializer(serializers.ModelSerializer):
    student = StudentProfileSerializer(read_only=True)
    vacancy = VacancySerializer(read_only=True)
    review = ReviewSerializer(read_only=True)

    class Meta:
        model = Application
        fields = '__all__'
        read_only_fields = ['student', 'vacancy', 'applied_at', 'updated_at']


class ApplicationCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Application
        fields = ['resume_url', 'cover_letter']


class ApplyToVacancySerializer(serializers.Serializer):
    resume_url = serializers.URLField(max_length=500, required=True)
    cover_letter = serializers.CharField(required=True, min_length=10)
    
    def validate_resume_url(self, value):
        if not value.startswith(('http://', 'https://')):
            raise serializers.ValidationError("URL должен начинаться с http:// или https://")
        return value


class InterviewSerializer(serializers.ModelSerializer):
    class Meta:
        model = Interview
        fields = '__all__'


class NotificationSerializer(serializers.ModelSerializer):
    class Meta:
        model = Notification
        fields = '__all__'