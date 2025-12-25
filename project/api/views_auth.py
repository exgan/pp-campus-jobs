from rest_framework.decorators import api_view, permission_classes, authentication_classes
from rest_framework.permissions import AllowAny, IsAuthenticated
from rest_framework import generics, permissions, status
from django.views.decorators.csrf import csrf_exempt
from rest_framework.response import Response
from rest_framework.authtoken.models import Token
from rest_framework.authentication import TokenAuthentication
from django.contrib.auth import authenticate
from django.contrib.auth.models import User
from .serializers import StudentProfile, EmployerProfile, Skill


@csrf_exempt
@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def register(request):
    print("=== REGISTER REQUEST ===")
    print("Метод:", request.method)
    print("Данные:", request.data)
    print("Заголовки:", dict(request.headers))
    
    username = request.data.get('username')
    email = request.data.get('email')
    password = request.data.get('password')
    role = request.data.get('role', 'student')
    
    print(f"Полученные данные: username={username}, email={email}, role={role}")
    
    # Валидация
    if not username or not email or not password:
        print("Ошибка: не все поля заполнены")
        return Response(
            {'error': 'Все поля обязательны'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(username=username).exists():
        print(f"Ошибка: пользователь {username} уже существует")
        return Response(
            {'error': 'Пользователь с таким именем уже существует'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    if User.objects.filter(email=email).exists():
        print(f"Ошибка: email {email} уже используется")
        return Response(
            {'error': 'Пользователь с таким email уже существует'},
            status=status.HTTP_400_BAD_REQUEST
        )
    
    # Создаем пользователя
    try:
        print(f"Создаем пользователя: {username}")
        user = User.objects.create_user(
            username=username,
            email=email,
            password=password
        )
        print(f"Пользователь создан: {user.id}")
        
        # Создаем профиль в зависимости от роли
        if role == 'student':
            print("Создаем профиль студента")
            StudentProfile.objects.create(
                user=user,
                first_name=request.data.get('first_name', ''),
                last_name=request.data.get('last_name', ''),
                faculty=request.data.get('faculty', ''),
                course=int(request.data.get('course', 1))
            )
            print("Профиль студента создан")
        elif role == 'employer':
            print("Создаем профиль работодателя")
            EmployerProfile.objects.create(
                user=user,
                company_name=request.data.get('company_name', ''),
                contact_person=request.data.get('contact_person', ''),
                phone=request.data.get('phone', ''),
                first_name=request.data.get('first_name', ''),  # Добавим эти поля
                last_name=request.data.get('last_name', '')
            )
            print("Профиль работодателя создан")
        else:
            print(f"Неизвестная роль: {role}")
        
        # Создаем токен
        print("Создаем токен")
        token = Token.objects.create(user=user)
        
        response_data = {
            'message': 'Регистрация успешна',
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'email': user.email,
            'role': role
        }
        
        print(f"Успешная регистрация: {response_data}")
        return Response(response_data, status=status.HTTP_201_CREATED)
        
    except Exception as e:
        print(f"Ошибка при регистрации: {str(e)}")
        print(f"Тип ошибки: {type(e)}")
        import traceback
        traceback.print_exc()
        
        # Если ошибка, удаляем пользователя
        if 'user' in locals():
            print(f"Удаляем пользователя {user.username} из-за ошибки")
            user.delete()
        
        return Response(
            {'error': f'Ошибка регистрации: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )


@api_view(['POST'])
@permission_classes([AllowAny])
@authentication_classes([])
def login(request):
    username = request.data.get('username')
    password = request.data.get('password')
    
    user = authenticate(username=username, password=password)
    
    if user:
        # Создаем токен для API
        token, created = Token.objects.get_or_create(user=user)
        
        # Логиним пользователя в сессии Django
        login_django_user(request, user)
        
        return Response({
            'token': token.key,
            'user_id': user.id,
            'username': user.username,
            'role': get_user_role(user)
        })
    
    return Response(
        {'error': 'Неверные учетные данные'},
        status=status.HTTP_400_BAD_REQUEST
    )


# Добавьте эту функцию
def login_django_user(request, user):
    from django.contrib.auth import login as auth_login
    user.backend = 'django.contrib.auth.backends.ModelBackend'
    auth_login(request, user)


# Функция для получения роли пользователя
def get_user_role(user):
    if hasattr(user, 'student_profile'):
        return 'student'
    elif hasattr(user, 'employer_profile'):
        return 'employer'
    elif user.is_staff:
        return 'admin'
    return 'unknown'

@api_view(['GET'])
@authentication_classes([TokenAuthentication])  # Используем Token аутентификацию
@permission_classes([IsAuthenticated])  # Требуем авторизации
def current_user(request):
    user_data = {
        'id': request.user.id,
        'username': request.user.username,
        'email': request.user.email,
    }
    
    # Получаем роль
    try:
        if hasattr(request.user, 'student_profile'):
            user_data['role'] = 'student'
            user_data['student_profile'] = {
                'first_name': request.user.student_profile.first_name,
                'last_name': request.user.student_profile.last_name,
                'faculty': request.user.student_profile.faculty,
                'course': request.user.student_profile.course,
                'phone': request.user.student_profile.phone,
                'resume_url': request.user.student_profile.resume_url
            }
        elif hasattr(request.user, 'employer_profile'):
            user_data['role'] = 'employer'
            user_data['employer_profile'] = {
                'company_name': request.user.employer_profile.company_name,
                'department': request.user.employer_profile.department,
                'contact_person': request.user.employer_profile.contact_person,
                'phone': request.user.employer_profile.phone,
                'description': request.user.employer_profile.description
            }
        else:
            user_data['role'] = 'admin' if request.user.is_staff else 'unknown'
    except Exception as e:
        user_data['role'] = 'unknown'
        user_data['error'] = str(e)
    
    return Response(user_data)


@api_view(['POST'])
@authentication_classes([TokenAuthentication])
@permission_classes([IsAuthenticated])
def update_profile(request):
    try:
        user = request.user
        data = request.data
        
        if hasattr(user, 'student_profile'):
            # Обновляем профиль студента
            profile = user.student_profile
            
            # Обновляем основные поля
            profile.first_name = data.get('first_name', profile.first_name)
            profile.last_name = data.get('last_name', profile.last_name)
            profile.faculty = data.get('faculty', profile.faculty)
            profile.course = data.get('course', profile.course)
            profile.phone = data.get('phone', profile.phone)
            profile.resume_url = data.get('resume_url', profile.resume_url)
            
            # Обновляем навыки если переданы
            if 'skills' in data:
                skill_ids = data.get('skills', [])
                if isinstance(skill_ids, str):
                    skill_ids = [skill_ids]
                skills = Skill.objects.filter(id__in=skill_ids)
                profile.skills.set(skills)
            
            profile.save()
            
            return Response({
                'message': 'Профиль студента обновлен',
                'profile': {
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'faculty': profile.faculty,
                    'course': profile.course,
                    'phone': profile.phone,
                    'resume_url': profile.resume_url,
                    'skills': [{'id': s.id, 'name': s.name} for s in profile.skills.all()]
                }
            })
            
        elif hasattr(user, 'employer_profile'):
            # Обновляем профиль работодателя
            profile = user.employer_profile
            
            profile.first_name = data.get('first_name', profile.first_name)
            profile.last_name = data.get('last_name', profile.last_name)
            profile.company_name = data.get('company_name', profile.company_name)
            profile.department = data.get('department', profile.department)
            profile.contact_person = data.get('contact_person', profile.contact_person)
            profile.phone = data.get('phone', profile.phone)
            profile.description = data.get('description', profile.description)
            
            profile.save()
            
            return Response({
                'message': 'Профиль работодателя обновлен',
                'profile': {
                    'first_name': profile.first_name,
                    'last_name': profile.last_name,
                    'company_name': profile.company_name,
                    'department': profile.department,
                    'contact_person': profile.contact_person,
                    'phone': profile.phone,
                    'description': profile.description
                }
            })
            
        else:
            return Response(
                {'error': 'У вас нет профиля'},
                status=status.HTTP_400_BAD_REQUEST
            )
            
    except Exception as e:
        return Response(
            {'error': f'Ошибка обновления профиля: {str(e)}'},
            status=status.HTTP_400_BAD_REQUEST
        )