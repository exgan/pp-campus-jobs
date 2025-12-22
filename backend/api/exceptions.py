from rest_framework.views import exception_handler
from rest_framework.response import Response
from rest_framework import status
from django.core.exceptions import ValidationError


def custom_exception_handler(exc, context):
    """
    Кастомный обработчик исключений для стандартизации ошибок
    """
    # Вызываем стандартный обработчик
    response = exception_handler(exc, context)

    if response is not None:
        # Стандартизируем формат ошибок
        error_data = {
            'error': True,
            'message': 'Произошла ошибка при обработке запроса',
            'code': response.status_code,
            'detail': response.data if isinstance(response.data, dict) else {'errors': response.data}
        }
        response.data = error_data

    return response


# Кастомные исключения
class ApplicationAlreadyExistsError(Exception):
    pass


class UserNotStudentError(Exception):
    pass