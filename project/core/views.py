from django.shortcuts import render

# Главная страница
def index_view(request):
    return render(request, 'index.html')

# Детали вакансии
def vacancy_view(request, vacancy_id):
    return render(request, 'vacancy.html', {'vacancy_id': vacancy_id})

# Личный кабинет студента
def student_dashboard_view(request):
    return render(request, 'student-dashboard.html')

# Личный кабинет работодателя
def employer_dashboard_view(request):
    return render(request, 'employer-dashboard.html')

def profile_settings_view(request):
    return render(request, 'profile-settings.html')

# Заявки работодателя
def applications_view(request):
    return render(request, 'applications.html')

# Страница входа
def login_view(request):
    return render(request, 'login.html')

# Страница регистрации
def register_view(request):
    return render(request, 'register.html')

def notifications_view(request):
    return render(request, 'notifications.html')