from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from .serializers import *


class IsEmployerOrReadOnly(permissions.BasePermission):
    def has_permission(self, request, view):
        if request.method in permissions.SAFE_METHODS:
            return True

        return hasattr(request.user, 'employer_profile')

    def has_object_permission(self, request, view, obj):
        if request.method in permissions.SAFE_METHODS:
            return True

        return obj.employer.user == request.user


class VacancyViewSet(viewsets.ModelViewSet):
    queryset = Vacancy.objects.filter(is_active=True)
    serializer_class = VacancySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsEmployerOrReadOnly]

    def get_queryset(self):
        queryset = Vacancy.objects.filter(is_active=True)

        # Фильтрация
        vacancy_type = self.request.query_params.get('type')
        category = self.request.query_params.get('category')
        search = self.request.query_params.get('search')

        if vacancy_type:
            queryset = queryset.filter(vacancy_type=vacancy_type)
        if category:
            queryset = queryset.filter(category_id=category)
        if search:
            queryset = queryset.filter(title__icontains=search)

        return queryset

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'employer_profile'):
            serializer.save(employer=self.request.user.employer_profile)
        else:
            raise PermissionDenied("Только работодатели могут создавать вакансии")

    @action(
        detail=True,
        methods=['post'],
        permission_classes=[permissions.IsAuthenticated],
        serializer_class=ApplicationCreateSerializer
    )
    def apply(self, request, pk=None):
        vacancy = self.get_object()

        # Проверяем, что пользователь - студент
        try:
            student_profile = request.user.student_profile
        except StudentProfile.DoesNotExist:
            return Response(
                {'error': 'Только студенты могут откликаться на вакансии'},
                status=status.HTTP_403_FORBIDDEN
            )

        # Проверяем, не откликался ли уже
        if Application.objects.filter(student=student_profile, vacancy=vacancy).exists():
            return Response(
                {'error': 'Вы уже откликались на эту вакансию'},
                status=status.HTTP_400_BAD_REQUEST
            )

        # Создаем отклик
        serializer = self.get_serializer(data=request.data)
        if serializer.is_valid():
            application = serializer.save(
                student=student_profile,
                vacancy=vacancy,
                status='pending'
            )
            from .serializers import ApplicationSerializer
            return Response(
                ApplicationSerializer(application).data,
                status=status.HTTP_201_CREATED
            )

        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class ApplicationViewSet(viewsets.ModelViewSet):
    permission_classes = [IsAuthenticated]
    serializer_class = ApplicationSerializer

    def get_queryset(self):
        # Студенты видят свои заявки
        # Работодатели видят заявки на свои вакансии
        user = self.request.user

        if hasattr(user, 'student_profile'):
            return Application.objects.filter(student=user.student_profile)
        elif hasattr(user, 'employer_profile'):
            return Application.objects.filter(vacancy__employer=user.employer_profile)

        return Application.objects.none()


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer