from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views
from . import views_auth

router = DefaultRouter()
router.register(r'vacancies', views.VacancyViewSet, basename='vacancy')
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'categories', views.CategoryViewSet)
router.register(r'skills', views.SkillViewSet)
router.register(r'student-profiles', views.StudentProfileViewSet, basename='studentprofile')
router.register(r'notifications', views.NotificationViewSet, basename='notification')

urlpatterns = [
    path('', include(router.urls)),
    path('me/', views_auth.current_user, name='current-user'),
    path('login/', views_auth.login, name='api-login'),
    path('register/', views_auth.register, name='api-register'),
    path('update-profile/', views_auth.update_profile, name='update-profile'),
]