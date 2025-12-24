from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import *

admin.site.register(StudentProfile)
admin.site.register(EmployerProfile)
admin.site.register(Category)
admin.site.register(Skill)
admin.site.register(Vacancy)
admin.site.register(VacancySkill)
admin.site.register(StudentSkill)
admin.site.register(Application)
admin.site.register(Interview)
admin.site.register(Review)
admin.site.register(Notification)


class UserProfileInline(admin.StackedInline):
    model = StudentProfile
    can_delete = False
    verbose_name_plural = 'Student Profile'
    fk_name = 'user'


class UserAdminWithProfile(UserAdmin):
    inlines = (UserProfileInline,)

    def get_inline_instances(self, request, obj=None):
        if not obj:
            return list()
        return super().get_inline_instances(request, obj)


admin.site.unregister(User)
admin.site.register(User, UserAdminWithProfile)
