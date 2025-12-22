from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'vacancies', views.VacancyViewSet, basename='vacancy')
router.register(r'applications', views.ApplicationViewSet, basename='application')
router.register(r'categories', views.CategoryViewSet)
router.register(r'skills', views.SkillViewSet)

urlpatterns = [
    path('', include(router.urls)),
]