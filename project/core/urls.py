from django.contrib import admin
from django.urls import path, include
from django.conf import settings
from django.conf.urls.static import static
from . import views

urlpatterns = [
    path('admin/', admin.site.urls),
    path('api/', include('api.urls')),
    path('api-auth/', include('rest_framework.urls')),
    path('', views.index_view, name='index'),
    path('vacancy/<int:vacancy_id>/', views.vacancy_view, name='vacancy'),
    path('student-dashboard/', views.student_dashboard_view, name='student_dashboard'),
    path('employer-dashboard/', views.employer_dashboard_view, name='employer_dashboard'),
    path('profile-settings/', views.profile_settings_view, name='profile_settings'),
    path('applications/', views.applications_view, name='applications'),
    path('login/', views.login_view, name='login'),
    path('register/', views.register_view, name='register'),
    path('notifications/', views.notifications_view, name='notifications'),
]

if settings.DEBUG:
    urlpatterns += static(settings.STATIC_URL, document_root=settings.STATIC_ROOT)
    urlpatterns += static(settings.MEDIA_URL, document_root=settings.MEDIA_ROOT)