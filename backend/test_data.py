import os
import django
import sys

sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'core.settings')
django.setup()

from api.models import *


def create_test_data():

    # 1. Создаем пользователей
    student_user = User.objects.create_user(
        username='student_test',
        email='student@test.edu',
        password='student123',
        first_name='Иван',
        last_name='Петров'
    )

    employer_user = User.objects.create_user(
        username='employer_test',
        email='employer@test.edu',
        password='employer123',
        first_name='Анна',
        last_name='Сидорова'
    )

    # 2. Создаем профили
    student = StudentProfile.objects.create(
        user=student_user,
        role='student',
        first_name='Иван',
        last_name='Петров',
        faculty='Факультет информатики',
        course=3,
        phone='+79991234567'
    )

    employer = EmployerProfile.objects.create(
        user=employer_user,
        role='employer',
        first_name='Анна',
        last_name='Сидорова',
        company_name='IT Департамент',
        department='Разработка',
        contact_person='Анна Сидорова',
        phone='+79997654321'
    )

    # 3. Создаем навыки
    python = Skill.objects.create(name='Python')
    django_skill = Skill.objects.create(name='Django')
    javascript = Skill.objects.create(name='JavaScript')

    # 4. Создаем категории
    research = Category.objects.create(name='Исследование', slug='research')
    teaching = Category.objects.create(name='Преподавание', slug='teaching')

    # 5. Создаем вакансии от имени работодателя
    vacancy1 = Vacancy.objects.create(
        employer=employer,
        title='Ассистент разработчика Python',
        description='Помощь в разработке внутренних систем университета',
        requirements='Знание Python, основы Django',
        vacancy_type='internship',
        salary=25000,
        location='Главный корпус, каб. 305',
        category=research
    )
    vacancy1.skills.add(python, django_skill)

    vacancy2 = Vacancy.objects.create(
        employer=employer,
        title='Ассистент преподавателя по веб-разработке',
        description='Помощь в проведении практических занятий',
        requirements='HTML, CSS, JavaScript',
        vacancy_type='work',
        salary=30000,
        location='Корпус Б, каб. 412',
        category=teaching
    )
    vacancy2.skills.add(javascript)

    print("Создано")

if __name__ == '__main__':
    create_test_data()