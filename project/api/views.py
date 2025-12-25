from rest_framework import viewsets, status, permissions
from rest_framework.decorators import action
from rest_framework.exceptions import PermissionDenied
from rest_framework.response import Response
from django.db.models import Q
from rest_framework.permissions import IsAuthenticated
from .serializers import *


class IsStudent(permissions.BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'student_profile')


class IsEmployer(permissions.BasePermission):
    def has_permission(self, request, view):
        return hasattr(request.user, 'employer_profile')


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
    serializer_class = VacancySerializer
    permission_classes = [permissions.IsAuthenticatedOrReadOnly, IsEmployerOrReadOnly]
    
    def get_serializer_class(self):
        if self.action in ['create', 'update', 'partial_update']:
            return VacancyCreateUpdateSerializer
        return VacancySerializer

    def get_queryset(self):
        queryset = Vacancy.objects.all()
        user = self.request.user
        
        # Параметр ?my=true для работодателей (показать только мои вакансии)
        my_vacancies = self.request.query_params.get('my')
        
        # Неавторизованные пользователи видят только активные вакансии
        if not user.is_authenticated:
            return queryset.filter(is_active=True)
        
        # Если работодатель запрашивает только свои вакансии
        if my_vacancies and hasattr(user, 'employer_profile'):
            return queryset.filter(employer=user.employer_profile)
        
        if hasattr(user, 'employer_profile'):
            # Работодатели видят все свои вакансии
            if not self.request.query_params.get('show_all'):
                return queryset.filter(
                    Q(is_active=True) | 
                    Q(employer=user.employer_profile, is_active=False)
                )
            return queryset
        elif hasattr(user, 'student_profile'):
            # Студенты видят только активные вакансии
            return queryset.filter(is_active=True)
        else:
            return queryset
    
    def get_object(self):
        # Проверки доступа к неактивным вакансиям
        obj = super().get_object()
        
        # Проверяем, может ли пользователь видеть эту вакансию
        user = self.request.user
        
        # Если вакансия активна - доступна всем
        if obj.is_active:
            return obj
        
        # Если вакансия неактивна:
        if user.is_authenticated and hasattr(user, 'employer_profile'):
            if obj.employer == user.employer_profile:
                return obj
        
        if user.is_superuser:
            return obj
        
        raise Http404("Вакансия не найдена")

    def perform_create(self, serializer):
        if hasattr(self.request.user, 'employer_profile'):
            serializer.save(employer=self.request.user.employer_profile)
        else:
            raise PermissionDenied("Только работодатели могут создавать вакансии")

    @action(
    detail=True,
    methods=['post'],
    permission_classes=[permissions.IsAuthenticated],
    serializer_class=ApplyToVacancySerializer)
    def apply(self, request, pk=None):
        vacancy = self.get_object()
        
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'Только студенты могут откликаться на вакансии'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student_profile = request.user.student_profile
        
        if Application.objects.filter(student=student_profile, vacancy=vacancy).exists():
            return Response(
                {'error': 'Вы уже откликались на эту вакансию'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Валидируем данные новым сериализатором
        serializer = ApplyToVacancySerializer(data=request.data)
        
        if serializer.is_valid():
            # Создаем заявку напрямую
            application = Application.objects.create(
                student=student_profile,
                vacancy=vacancy,
                resume_url=serializer.validated_data['resume_url'],
                cover_letter=serializer.validated_data['cover_letter'],
                status='pending'
            )
            
            return Response(
                ApplicationSerializer(application).data,
                status=status.HTTP_201_CREATED
            )
        
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)


class StudentProfileViewSet(viewsets.ReadOnlyModelViewSet):
    permission_classes = [permissions.IsAuthenticated]
    serializer_class = StudentProfileSerializer
    
    def get_queryset(self):
        if hasattr(self.request.user, 'student_profile'):
            return StudentProfile.objects.filter(user=self.request.user)
        return StudentProfile.objects.none()
    
    @action(detail=False, methods=['get'])
    def my_skills(self, request):
        if not hasattr(request.user, 'student_profile'):
            return Response(
                {'error': 'У вас нет профиля студента'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        student_profile = request.user.student_profile
        skills = student_profile.skills.all()
        serializer = SkillSerializer(skills, many=True)
        return Response(serializer.data)


class ApplicationViewSet(viewsets.ModelViewSet):
    serializer_class = ApplicationSerializer
    permission_classes = [permissions.IsAuthenticated] 
    
    def get_queryset(self):
        user = self.request.user
        queryset = Application.objects.all()
        
        # Фильтрация по вакансии (если параметр передан)
        vacancy_id = self.request.query_params.get('vacancy')
        if vacancy_id:
            try:
                vacancy_id_int = int(vacancy_id)
                queryset = queryset.filter(vacancy_id=vacancy_id_int)
            except (ValueError, TypeError):
                pass
        
        # Фильтруем по пользователю
        if hasattr(user, 'student_profile'):
            # Студент видит свои заявки
            return queryset.filter(student=user.student_profile)
        elif hasattr(user, 'employer_profile'):
            # Работодатель видит заявки на свои вакансии
            return queryset.filter(vacancy__employer=user.employer_profile)
        
        return Application.objects.none()
    
    def get_serializer_class(self):
        if self.action == 'create':
            return ApplicationCreateSerializer
        return ApplicationSerializer
    
    def perform_create(self, serializer):
        # Автоматически устанавливаем студента при создании заявки
        if hasattr(self.request.user, 'student_profile'):
            serializer.save(student=self.request.user.student_profile)
        else:
            raise permissions.PermissionDenied("Только студенты могут создавать заявки")
    
    @action(detail=True, methods=['patch'])
    def update_status(self, request, pk=None):
        application = self.get_object()
        
        # Проверяем права - только работодатель владелец вакансии
        if not hasattr(request.user, 'employer_profile'):
            return Response(
                {'error': 'Только работодатели могут изменять статус заявок'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if application.vacancy.employer != request.user.employer_profile:
            return Response(
                {'error': 'Вы не можете изменять статус этой заявки'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        new_status = request.data.get('status')
        if new_status in ['pending', 'reviewed', 'accepted', 'rejected']:
            application.status = new_status
            application.save()
            
            # Создаем уведомление для студента
            Notification.objects.create(
                user=application.student.user,
                title='Обновление статуса заявки',
                message=f'Статус вашей заявки на вакансию "{application.vacancy.title}" изменен на "{application.get_status_display()}"',
                notification_type='application_update'
            )
            
            return Response(ApplicationSerializer(application).data)
        
        return Response(
            {'error': 'Неверный статус'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    @action(detail=True, methods=['post'])
    def add_review(self, request, pk=None):
        application = self.get_object()
        
        # Проверяем права - только работодатель владелец вакансии
        if not hasattr(request.user, 'employer_profile'):
            return Response(
                {'error': 'Только работодатели могут оставлять отзывы'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        if application.vacancy.employer != request.user.employer_profile:
            return Response(
                {'error': 'Вы не можете оставить отзыв на эту заявку'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Проверяем, нет ли уже отзыва
        if hasattr(application, 'review'):
            return Response(
                {'error': 'Отзыв уже оставлен'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Создаем отзыв
        review = Review.objects.create(
            application=application,
            rating=request.data.get('rating'),
            comment=request.data.get('comment', ''),
            from_role='employer'
        )
        
        # Создаем уведомление для студента
        Notification.objects.create(
            user=application.student.user,
            title='Новый отзыв на вашу заявку',
            message=f'Работодатель оставил отзыв на вашу заявку на вакансию "{application.vacancy.title}"',
            notification_type='application_update'
        )
        
        return Response(ReviewSerializer(review).data, status=status.HTTP_201_CREATED)


class CategoryViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Category.objects.all()
    serializer_class = CategorySerializer


class SkillViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = Skill.objects.all()
    serializer_class = SkillSerializer