// Загрузка заявок для работодателя
async function loadApplications() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login/';
            return;
        }
        
        // Получаем ID вакансии из URL
        const urlParams = new URLSearchParams(window.location.search);
        const vacancyId = urlParams.get('vacancy');
        
        // Строим URL с параметром vacancy если он есть
        let apiUrl = `${API_BASE_URL}/applications/`;
        if (vacancyId) {
            apiUrl += `?vacancy=${vacancyId}`;
            
            // Также загружаем информацию о вакансии для отображения в заголовке
            try {
                const vacancyRes = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`, {
                    headers: getAuthHeaders()
                });
                if (vacancyRes.ok) {
                    const vacancy = await vacancyRes.json();
                    const titleElement = document.querySelector('h1');
                    if (titleElement) {
                        titleElement.innerHTML = `Заявки на вакансию: <small class="text-muted">${vacancy.title}</small>`;
                    }
                }
            } catch (e) {
                console.error('Не удалось загрузить вакансию:', e);
            }
        }
        
        // Получаем заявки
        const response = await fetch(apiUrl, {
            headers: getAuthHeaders()
        });
        
        if (response.status === 403) {
            document.getElementById('applications-list').innerHTML = `
                <div class="alert alert-warning">
                    У вас нет доступа к заявкам. Возможно, вы не работодатель или у вас нет вакансий.
                </div>
            `;
            return;
        }
        
        if (!response.ok) {
            throw new Error(`Ошибка загрузки заявок: ${response.status}`);
        }
        
        const applications = await response.json();
        displayApplications(applications, vacancyId);
        
    } catch (error) {
        console.error('Ошибка загрузки заявок:', error);
        const container = document.getElementById('applications-list') || document.getElementById('main-content');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    Ошибка загрузки заявок: ${error.message}<br>
                    <a href="/employer-dashboard/">Вернуться в кабинет</a>
                </div>
            `;
        }
    }
}

// Отображение заявок
function displayApplications(applications, vacancyId) {
    const container = document.getElementById('applications-list');
    
    if (!applications || applications.length === 0) {
        let message = 'Заявок пока нет.';
        if (vacancyId) {
            message = `На эту вакансию пока нет заявок.`;
        }
        
        container.innerHTML = `
            <div class="alert alert-info">
                ${message}
                <div class="mt-2">
                    <a href="/employer-dashboard/" class="btn btn-sm btn-outline-primary">← Вернуться к вакансиям</a>
                </div>
            </div>
        `;
        return;
    }
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div>
                <span class="badge bg-primary">${applications.length} заявок</span>
                ${vacancyId ? '<span class="badge bg-info ms-2">Фильтр по вакансии</span>' : ''}
            </div>
            <a href="/employer-dashboard/" class="btn btn-sm btn-outline-secondary">
                ← Все вакансии
            </a>
        </div>
        <div class="table-responsive">
            <table class="table table-hover">
                <thead>
                    <tr>
                        <th>Студент</th>
                        <th>Вакансия</th>
                        <th>Статус</th>
                        <th>Дата</th>
                        <th>Действия</th>
                    </tr>
                </thead>
                <tbody>
    `;
    
    applications.forEach(app => {
        const statusColors = {
            'pending': 'warning',
            'reviewed': 'info',
            'accepted': 'success',
            'rejected': 'danger'
        };
        
        const statusTexts = {
            'pending': 'На рассмотрении',
            'reviewed': 'Просмотрено',
            'accepted': 'Принято',
            'rejected': 'Отклонено'
        };
        
        html += `
            <tr>
                <td>
                    <strong>${app.student?.first_name || 'Неизвестно'} ${app.student?.last_name || ''}</strong><br>
                    <small>${app.student?.faculty || ''}${app.student?.course ? `, ${app.student.course} курс` : ''}</small>
                </td>
                <td>
                    ${app.vacancy?.title || 'Вакансия удалена'}
                    ${!vacancyId ? `<br><small class="text-muted">${app.vacancy?.employer?.company_name || ''}</small>` : ''}
                </td>
                <td>
                    <span class="badge bg-${statusColors[app.status] || 'secondary'}">
                        ${statusTexts[app.status] || app.status}
                    </span>
                </td>
                <td>${new Date(app.applied_at).toLocaleDateString('ru-RU')}</td>
                <td>
                    <button class="btn btn-sm btn-outline-primary" onclick="viewApplicationDetails(${app.id})">
                        Подробнее
                    </button>
                </td>
            </tr>
        `;
    });
    
    html += '</tbody></table></div>';
    container.innerHTML = html;
}

// Просмотр деталей заявки
async function viewApplicationDetails(applicationId) {
    try {
        // Загружаем данные заявки
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            alert('Не удалось загрузить данные заявки');
            return;
        }
        
        const application = await response.json();
        
        // Создаем модальное окно с деталями
        const modalHtml = `
            <div class="modal fade" id="applicationDetailsModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Детали заявки #${application.id}</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <div class="row">
                                <div class="col-md-6">
                                    <h6>Студент:</h6>
                                    <p><strong>${application.student?.first_name || ''} ${application.student?.last_name || ''}</strong></p>
                                    <p>${application.student?.faculty || ''}, ${application.student?.course || ''} курс</p>
                                    ${application.student?.phone ? `<p>${application.student.phone}</p>` : ''}
                                    ${application.student?.resume_url ? `<p><a href="${application.student.resume_url}" target="_blank">Резюме</a></p>` : ''}
                                </div>
                                
                                <div class="col-md-6">
                                    <h6>Вакансия:</h6>
                                    <p><strong>${application.vacancy?.title || ''}</strong></p>
                                    <p>${application.vacancy?.employer?.company_name || ''}</p>
                                    <p>${application.vacancy?.location || ''}</p>
                                    <p>Статус: <span class="badge bg-${getStatusColor(application.status)}">${getStatusText(application.status)}</span></p>
                                </div>
                            </div>
                            
                            <hr>
                            
                            <h6>Ссылка на резюме</h6>
                            <div class="card bg-light">
                                <div class="card-body">
                                    ${application.resume_url || 'Без ссылки на резюме'}
                                </div>
                            </div>
                            <h6>Сопроводительное письмо:</h6>
                            <div class="card bg-light">
                                <div class="card-body">
                                    ${application.cover_letter || 'Без сопроводительного письма'}
                                </div>
                            </div>
                            
                            <div class="mt-4">
                                <h6>Изменить статус:</h6>
                                <div class="btn-group" role="group">
                                    <button type="button" class="btn btn-outline-info" 
                                            onclick="updateApplicationStatus(${application.id}, 'reviewed')">
                                        Просмотрено
                                    </button>
                                    <button type="button" class="btn btn-outline-success" 
                                            onclick="updateApplicationStatus(${application.id}, 'accepted')">
                                        Принять
                                    </button>
                                    <button type="button" class="btn btn-outline-danger" 
                                            onclick="updateApplicationStatus(${application.id}, 'rejected')">
                                        Отклонить
                                    </button>
                                </div>
                            </div>
                            
                            ${application.review ? `
                                <hr>
                                <h6>Ваш отзыв:</h6>
                                <div class="card">
                                    <div class="card-body">
                                        <p>Оценка: ${'⭐'.repeat(application.review.rating)}</p>
                                        <p>${application.review.comment || 'Без комментария'}</p>
                                    </div>
                                </div>
                            ` : `
                                <hr>
                                <h6>Оставить отзыв:</h6>
                                <form id="review-form-${application.id}">
                                    <div class="mb-3">
                                        <label class="form-label">Оценка (1-5):</label>
                                        <select class="form-select" name="rating">
                                            <option value="5">5 - Отлично</option>
                                            <option value="4">4 - Хорошо</option>
                                            <option value="3">3 - Удовлетворительно</option>
                                            <option value="2">2 - Плохо</option>
                                            <option value="1">1 - Очень плохо</option>
                                        </select>
                                    </div>
                                    <div class="mb-3">
                                        <label class="form-label">Комментарий:</label>
                                        <textarea class="form-control" name="comment" rows="3"></textarea>
                                    </div>
                                    <button type="button" class="btn btn-primary" 
                                            onclick="submitReview(${application.id})">
                                        Сохранить отзыв
                                    </button>
                                </form>
                            `}
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Закрыть</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно
        if (!document.getElementById('applicationDetailsModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('applicationDetailsModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось загрузить детали заявки');
    }
}

// Вспомогательные функции
function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'reviewed': 'info',
        'accepted': 'success',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'pending': 'На рассмотрении',
        'reviewed': 'Просмотрено',
        'accepted': 'Принято',
        'rejected': 'Отклонено'
    };
    return texts[status] || status;
}

// Функция для обновления статуса
async function updateApplicationStatus(applicationId, newStatus) {
    const statusTexts = {
        'pending': 'На рассмотрении',
        'reviewed': 'Просмотрено',
        'accepted': 'Принято',
        'rejected': 'Отклонено'
    };
    
    if (!confirm(`Изменить статус на "${statusTexts[newStatus]}"?`)) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/update_status/`, {
            method: 'PATCH',
            headers: getAuthHeaders(),
            body: JSON.stringify({ status: newStatus })
        });
        
        if (response.ok) {
            // Обновляем данные в модальном окне
            const statusBadge = document.querySelector('#applicationDetailsModal .badge');
            if (statusBadge) {
                statusBadge.className = `badge bg-${getStatusColor(newStatus)}`;
                statusBadge.textContent = statusTexts[newStatus];
            }
            
            // Обновляем список заявок на странице
            loadApplications();
            
            alert('Статус обновлен!');
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail || 'Не удалось обновить статус'}`);
        }
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Функция для отправки отзыва
async function submitReview(applicationId) {
    const form = document.getElementById(`review-form-${applicationId}`);
    const formData = new FormData(form);
    
    const data = {
        rating: parseInt(formData.get('rating')),
        comment: formData.get('comment'),
        from_role: 'employer'
    };
    
    if (!data.rating || data.rating < 1 || data.rating > 5) {
        alert('Пожалуйста, выберите оценку от 1 до 5');
        return;
    }
    
    try {
        const response = await fetch(`${API_BASE_URL}/applications/${applicationId}/add_review/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('Отзыв сохранен!');
            
            // Обновляем модальное окно - показываем сохраненный отзыв
            const reviewSection = document.querySelector('#applicationDetailsModal hr:nth-of-type(2)');
            if (reviewSection) {
                reviewSection.insertAdjacentHTML('afterend', `
                    <hr>
                    <h6>Ваш отзыв:</h6>
                    <div class="card">
                        <div class="card-body">
                            <p><strong>Оценка:</strong> ${'⭐'.repeat(data.rating)}</p>
                            <p><strong>Комментарий:</strong> ${data.comment || 'Без комментария'}</p>
                        </div>
                    </div>
                `);
                
                // Удаляем форму
                const reviewForm = document.getElementById(`review-form-${applicationId}`);
                if (reviewForm) {
                    reviewForm.remove();
                }
            }
            
        } else {
            const error = await response.json();
            alert(`Ошибка: ${error.detail || 'Не удалось сохранить отзыв'}`);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером');
    }
}

// Вспомогательные функции для статусов
function getStatusColor(status) {
    const colors = {
        'pending': 'warning',
        'reviewed': 'info',
        'accepted': 'success',
        'rejected': 'danger'
    };
    return colors[status] || 'secondary';
}

function getStatusText(status) {
    const texts = {
        'pending': 'На рассмотрении',
        'reviewed': 'Просмотрено',
        'accepted': 'Принято',
        'rejected': 'Отклонено'
    };
    return texts[status] || status;
}