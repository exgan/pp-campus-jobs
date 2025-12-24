from django.db import models
from django.contrib.auth.models import User
from django.core.validators import MinValueValidator, MaxValueValidator


# 1. Профиль студента
class StudentProfile(models.Model):
    ROLE_CHOICES = [
        ('student', 'Студент'),
        ('employer', 'Работодатель'),
        ('admin', 'Администратор'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='student_profile', primary_key=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='student')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    faculty = models.CharField(max_length=255)
    course = models.IntegerField()
    resume_url = models.URLField(max_length=500, blank=True, null=True)
    phone = models.CharField(max_length=20, blank=True, null=True)
    created_at = models.DateTimeField(auto_now_add=True)

    skills = models.ManyToManyField('Skill', through='StudentSkill')

    class Meta:
        db_table = 'student_profile'

    def __str__(self):
        return f"{self.first_name} {self.last_name}"


# 2. Профиль работодателя
class EmployerProfile(models.Model):
    ROLE_CHOICES = [
        ('student', 'Студент'),
        ('employer', 'Работодатель'),
        ('admin', 'Администратор'),
    ]

    user = models.OneToOneField(User, on_delete=models.CASCADE, related_name='employer_profile', primary_key=True)
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default='employer')
    first_name = models.CharField(max_length=255)
    last_name = models.CharField(max_length=255)
    company_name = models.CharField(max_length=255)
    department = models.CharField(max_length=255)
    contact_person = models.CharField(max_length=255)
    phone = models.CharField(max_length=20)
    description = models.TextField(blank=True, null=True)

    class Meta:
        db_table = 'employer_profile'

    def __str__(self):
        return f"{self.company_name} ({self.department})"


# 3. Категория
class Category(models.Model):
    name = models.CharField(max_length=255, unique=True)
    slug = models.SlugField(max_length=255, unique=True)

    class Meta:
        db_table = 'category'

    def __str__(self):
        return self.name


# 4. Навыки
class Skill(models.Model):
    name = models.CharField(max_length=255, unique=True)

    class Meta:
        db_table = 'skill'

    def __str__(self):
        return self.name


# 5. Вакансия
class Vacancy(models.Model):
    VACANCY_TYPE_CHOICES = [
        ('work', 'Работа'),
        ('internship', 'Стажировка'),
    ]

    employer = models.ForeignKey(EmployerProfile, on_delete=models.CASCADE, related_name='vacancies')
    title = models.CharField(max_length=255)
    description = models.TextField()
    requirements = models.TextField()
    vacancy_type = models.CharField(max_length=20, choices=VACANCY_TYPE_CHOICES)
    salary = models.DecimalField(max_digits=10, decimal_places=2, blank=True, null=True)
    location = models.CharField(max_length=255)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    category = models.ForeignKey(Category, on_delete=models.SET_NULL, null=True, blank=True)

    skills = models.ManyToManyField(Skill, through='VacancySkill')

    class Meta:
        db_table = 'vacancy'
        indexes = [
            models.Index(fields=['is_active']),
            models.Index(fields=['vacancy_type']),
        ]

    def __str__(self):
        return self.title


# 6. Навыки вакансии
class VacancySkill(models.Model):
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)

    class Meta:
        db_table = 'vacancy_skill'
        unique_together = ['vacancy', 'skill']

    def __str__(self):
        return f"{self.vacancy.title} - {self.skill.name}"


# 7. Навыки студента
class StudentSkill(models.Model):
    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE)
    skill = models.ForeignKey(Skill, on_delete=models.CASCADE)

    class Meta:
        db_table = 'student_skill'
        unique_together = ['student', 'skill']

    def __str__(self):
        return f"{self.student} - {self.skill.name}"


# 8. Заявка
class Application(models.Model):
    STATUS_CHOICES = [
        ('pending', 'В ожидании'),
        ('reviewed', 'Рассмотрено'),
        ('accepted', 'Принято'),
        ('rejected', 'Отклонено'),
    ]

    student = models.ForeignKey(StudentProfile, on_delete=models.CASCADE, related_name='applications')
    vacancy = models.ForeignKey(Vacancy, on_delete=models.CASCADE, related_name='applications')
    resume_url = models.URLField(max_length=500)
    cover_letter = models.TextField()
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    applied_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'application'
        unique_together = ['student', 'vacancy']
        indexes = [
            models.Index(fields=['status']),
        ]

    def __str__(self):
        return f"Заявка #{self.id}: {self.student} -> {self.vacancy}"


# 9. Собеседование
class Interview(models.Model):
    STATUS_CHOICES = [
        ('scheduled', 'Запланировано'),
        ('completed', 'Завершено'),
        ('cancelled', 'Отменено'),
    ]

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='interview')
    scheduled_at = models.DateTimeField()
    meeting_link = models.URLField(max_length=500, blank=True, null=True)
    location = models.CharField(max_length=255, blank=True, null=True)
    notes = models.TextField(blank=True, null=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='scheduled')

    class Meta:
        db_table = 'interview'

    def __str__(self):
        return f"Собеседование для заявки #{self.application.id}"


# 10. Отзыв
class Review(models.Model):
    FROM_ROLE_CHOICES = [
        ('employer', 'Работодатель'),
        ('student', 'Студент'),
    ]

    application = models.OneToOneField(Application, on_delete=models.CASCADE, related_name='review')
    rating = models.IntegerField(validators=[MinValueValidator(1), MaxValueValidator(5)])
    comment = models.TextField(blank=True, null=True)
    from_role = models.CharField(max_length=20, choices=FROM_ROLE_CHOICES)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'review'

    def __str__(self):
        return f"Отзыв {self.rating}/5 на заявку #{self.application.id}"


# 11. Уведомление
class Notification(models.Model):
    NOTIFICATION_TYPE_CHOICES = [
        ('application_update', 'Заявка обновлена'),
        ('new_vacancy', 'Новая вакансия'),
        ('system', 'Система'),
    ]

    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='notifications')
    title = models.CharField(max_length=255)
    message = models.TextField()
    notification_type = models.CharField(max_length=20, choices=NOTIFICATION_TYPE_CHOICES)
    is_read = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'notification'
        indexes = [
            models.Index(fields=['user', 'is_read']),
        ]

    def __str__(self):
        return self.title