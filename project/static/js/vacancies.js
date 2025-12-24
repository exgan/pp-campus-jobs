// Загрузка деталей вакансии
async function loadVacancyDetails(vacancyId) {
    try {
        const response = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`);
        
        if (response.status === 404) {
            // Пробуем загрузить с авторизацией (для неактивных вакансий владельца)
            const token = localStorage.getItem('auth_token');
            if (token) {
                const authResponse = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`, {
                    headers: getAuthHeaders()
                });
                
                if (authResponse.ok) {
                    const vacancy = await authResponse.json();
                    displayVacancyDetails(vacancy);
                    return;
                }
            }
            
            throw new Error('Вакансия не найдена или у вас нет доступа');
        }
        
        if (!response.ok) {
            throw new Error('Ошибка загрузки вакансии');
        }
        
        const vacancy = await response.json();
        displayVacancyDetails(vacancy);
        
    } catch (error) {
        console.error('Ошибка загрузки вакансии:', error);
        showError(error.message);
        
        // Показываем кнопку возврата
        const container = document.getElementById('vacancy-details') || document.getElementById('main-content');
        if (container) {
            container.innerHTML = `
                <div class="alert alert-danger">
                    ${error.message}
                    <div class="mt-3">
                        <a href="/" class="btn btn-primary">← На главную</a>
                        <a href="/employer-dashboard/" class="btn btn-outline-secondary ms-2">В кабинет работодателя</a>
                    </div>
                </div>
            `;
        }
    }
}

// Отображение деталей вакансии
function displayVacancyDetails(vacancy) {
    const container = document.getElementById('vacancy-details');
    if (!container) return;
    
    // Получаем информацию о текущем пользователе
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    const isAuthenticated = !!localStorage.getItem('auth_token');
    const isStudent = userInfo.role === 'student';
    const isEmployer = userInfo.role === 'employer';
    
    // Проверяем, является ли пользователь владельцем вакансии
    let isVacancyOwner = false;
    if (isEmployer && vacancy.employer) {
        isVacancyOwner = vacancy.employer.user?.username === userInfo.username ||
                        vacancy.employer.user?.id === userInfo.id;
    }
    
    // Определяем какую кнопку показывать
    let actionButton = '';
    
    if (isStudent) {
        // Студент видит кнопку отклика
        actionButton = `<button id="apply-btn" class="btn btn-success btn-lg">Откликнуться</button>`;
    } else if (isEmployer && isVacancyOwner) {
        // Владелец вакансии видит кнопку редактирования
        actionButton = `
            
        `;
    } else if (isEmployer) {
        // Работодатель (не владелец) не видит кнопку отклика
        actionButton = `<span class="text-muted">Доступно только для студентов</span>`;
    } else if (!isAuthenticated) {
        // Неавторизованный пользователь
        actionButton = `<a href="/login/?redirect=/vacancy/?id=${vacancy.id}" class="btn btn-success btn-lg">Войти для отклика</a>`;
    } else {
        // Другие роли
        actionButton = `<span class="text-muted">Отклик доступен только студентам</span>`;
    }
    
    container.innerHTML = `
        <div class="card">
            <div class="card-body">
                <h2 class="card-title">${vacancy.title}</h2>
                <h5 class="card-subtitle mb-3 text-muted">
                    ${vacancy.employer?.company_name || 'Работодатель'} • ${vacancy.location}
                    ${isVacancyOwner ? '<span class="badge bg-info ms-2">Ваша вакансия</span>' : ''}
                </h5>
                
                <div class="mb-4">
                    <span class="badge bg-primary fs-6">${vacancy.vacancy_type === 'work' ? 'Работа' : 'Стажировка'}</span>
                    ${vacancy.salary ? `<span class="badge bg-success fs-6">${vacancy.salary} ₽</span>` : ''}
                    <span class="badge bg-info fs-6">${vacancy.category?.name || 'Без категории'}</span>
                </div>
                
                <h4>Описание</h4>
                <p class="card-text">${vacancy.description}</p>
                
                <h4>Требования</h4>
                <p class="card-text">${vacancy.requirements}</p>
                
                <h4>Навыки</h4>
                <div class="mb-4">
                    ${vacancy.skills?.map(skill => `<span class="badge bg-secondary me-1 fs-6">${skill.name}</span>`).join('') || 'Не указаны'}
                </div>
                
                <div class="d-flex justify-content-between align-items-center">
                    <small class="text-muted">
                        Опубликовано: ${new Date(vacancy.created_at).toLocaleDateString('ru-RU')}<br>
                        Обновлено: ${new Date(vacancy.updated_at).toLocaleDateString('ru-RU')}
                    </small>
                    <div>
                        ${actionButton}
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем обработчик кнопки отклика только если пользователь студент
    const applyBtn = document.getElementById('apply-btn');
    if (applyBtn && isStudent) {
        applyBtn.addEventListener('click', function() {
            showApplyModal(vacancy.id);
        });
    }
}


// Редактирование вакансии
async function editVacancy(vacancyId) {
    try {
        // Загружаем данные вакансии
        const vacancyRes = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`, {
            headers: getAuthHeaders()
        });
        
        if (!vacancyRes.ok) {
            alert('Не удалось загрузить данные вакансии');
            return;
        }
        
        const vacancy = await vacancyRes.json();
        
        // Создаем модальное окно редактирования
        const modalHtml = `
            <div class="modal fade" id="editVacancyModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Редактирование вакансии</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="edit-vacancy-form">
                                <!-- Форма заполнится ниже -->
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="saveVacancyChanges(${vacancyId})">Сохранить</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно
        if (!document.getElementById('editVacancyModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Загружаем категории и навыки
        await loadCategoriesAndSkillsForEdit(vacancy);
        
        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('editVacancyModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Не удалось загрузить форму редактирования');
    }
}


async function loadCategoriesAndSkillsForEdit(vacancy) {
    try {
        // Загружаем категории и навыки
        const [categoriesRes, skillsRes] = await Promise.all([
            fetch(`${API_BASE_URL}/categories/`),
            fetch(`${API_BASE_URL}/skills/`)
        ]);
        
        const categories = await categoriesRes.json();
        const allSkills = await skillsRes.json();
        
        // Текущие навыки вакансии
        const currentSkillIds = vacancy.skills ? vacancy.skills.map(s => s.id) : [];
        
        // Формируем форму с правильными именами полей
        const form = document.getElementById('edit-vacancy-form');
        form.innerHTML = `
            <div class="mb-3">
                <label class="form-label">Название вакансии *</label>
                <input type="text" class="form-control" name="title" value="${vacancy.title || ''}" required>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Описание *</label>
                <textarea class="form-control" name="description" rows="4" required>${vacancy.description || ''}</textarea>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Требования *</label>
                <textarea class="form-control" name="requirements" rows="3" required>${vacancy.requirements || ''}</textarea>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Тип вакансии *</label>
                    <select class="form-select" name="vacancy_type" required>
                        <option value="work" ${vacancy.vacancy_type === 'work' ? 'selected' : ''}>Работа</option>
                        <option value="internship" ${vacancy.vacancy_type === 'internship' ? 'selected' : ''}>Стажировка</option>
                    </select>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Зарплата (₽)</label>
                    <input type="number" class="form-control" name="salary" 
                           value="${vacancy.salary || ''}" min="0" placeholder="Не указана">
                </div>
            </div>
            
            <div class="row mb-3">
                <div class="col-md-6">
                    <label class="form-label">Локация *</label>
                    <input type="text" class="form-control" name="location" 
                           value="${vacancy.location || ''}" required>
                </div>
                <div class="col-md-6">
                    <label class="form-label">Статус</label>
                    <select class="form-select" name="is_active">
                        <option value="true" ${vacancy.is_active ? 'selected' : ''}>Активна</option>
                        <option value="false" ${!vacancy.is_active ? 'selected' : ''}>Не активна</option>
                    </select>
                </div>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Категория</label>
                <select class="form-select" name="category">
                    <option value="">Без категории</option>
                    ${categories.map(cat => `
                        <option value="${cat.id}" ${vacancy.category?.id === cat.id ? 'selected' : ''}>
                            ${cat.name}
                        </option>
                    `).join('')}
                </select>
            </div>
            
            <div class="mb-3">
                <label class="form-label">Навыки (выберите нужные)</label>
                <div class="border p-2 rounded" style="max-height: 200px; overflow-y: auto;">
                    <div class="row">
                        ${allSkills.map(skill => `
                            <div class="col-md-6 mb-2">
                                <div class="form-check">
                                    <input class="form-check-input" type="checkbox" 
                                           name="skills" value="${skill.id}" 
                                           id="edit-skill-${skill.id}"
                                           ${currentSkillIds.includes(skill.id) ? 'checked' : ''}>
                                    <label class="form-check-label" for="edit-skill-${skill.id}">
                                        ${skill.name}
                                    </label>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
        document.getElementById('edit-vacancy-form').innerHTML = `
            <div class="alert alert-danger">
                Не удалось загрузить форму: ${error.message}
            </div>
        `;
    }
}


async function saveVacancyChanges(vacancyId) {
    const form = document.getElementById('edit-vacancy-form');
    const formData = new FormData(form);
    
    // Собираем данные в правильном формате
    const data = {
        title: formData.get('title'),
        description: formData.get('description'),
        requirements: formData.get('requirements'),
        vacancy_type: formData.get('vacancy_type'),
        location: formData.get('location'),
        is_active: formData.get('is_active') === 'true'
    };
    
    // Зарплата
    const salary = formData.get('salary');
    if (salary && salary.trim() !== '') {
        data.salary = parseFloat(salary);
    } else if (salary === '') {
        data.salary = null; // Очищаем зарплату если поле пустое
    }
    
    // Категория - отправляем как category_id
    const category = formData.get('category');
    if (category && category.trim() !== '') {
        data.category_id = parseInt(category);
    } else {
        data.category_id = null; // Очищаем категорию
    }
    
    // Навыки - отправляем как skill_ids массив
    const skillCheckboxes = form.querySelectorAll('input[name="skills"]:checked');
    data.skill_ids = Array.from(skillCheckboxes).map(cb => parseInt(cb.value));
    
    console.log('Данные для обновления:', data); // Для отладки
    
    // Показываем индикатор загрузки
    const submitBtn = document.querySelector('#editVacancyModal .btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Сохранение...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`, {
            method: 'PUT',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        console.log('Ответ сервера:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Обновленная вакансия:', result);
            alert('Вакансия успешно обновлена!');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('editVacancyModal'));
            if (modal) modal.hide();
            
            // Удаляем модальное окно из DOM
            setTimeout(() => {
                const modalEl = document.getElementById('editVacancyModal');
                if (modalEl) modalEl.remove();
            }, 300);
            
            // Обновляем список вакансий
            setTimeout(() => {
                if (typeof loadEmployerDashboard === 'function') {
                    loadEmployerDashboard();
                }
            }, 500);
            
        } else {
            let errorMessage = 'Не удалось обновить вакансию';
            try {
                const errorData = await response.json();
                console.error('Ошибка API:', errorData);
                
                // Форматируем ошибки
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else {
                    const fieldErrors = [];
                    for (const field in errorData) {
                        if (Array.isArray(errorData[field])) {
                            fieldErrors.push(`${field}: ${errorData[field].join(', ')}`);
                        }
                    }
                    if (fieldErrors.length > 0) {
                        errorMessage = fieldErrors.join('\n');
                    }
                }
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(`Ошибка:\n${errorMessage}`);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером: ' + error.message);
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}


function viewApplications(vacancyId) {
    window.location.href = `/applications/?vacancy=${vacancyId}`;
}

// Модальное окно для отклика
function showApplyModal(vacancyId) {
    const modalHTML = `
        <div class="modal fade" id="applyModal" tabindex="-1">
            <div class="modal-dialog">
                <div class="modal-content">
                    <div class="modal-header">
                        <h5 class="modal-title">Отклик на вакансию</h5>
                        <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                    </div>
                    <div class="modal-body">
                        <form id="apply-form">
                            <div class="mb-3">
                                <label for="resume-url" class="form-label">Ссылка на резюме</label>
                                <input type="url" class="form-control" id="resume-url" required>
                                <div class="form-text">Укажите URL вашего резюме (PDF, Google Docs и т.д.)</div>
                            </div>
                            <div class="mb-3">
                                <label for="cover-letter" class="form-label">Сопроводительное письмо</label>
                                <textarea class="form-control" id="cover-letter" rows="4" required></textarea>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                        <button type="button" class="btn btn-primary" id="submit-apply">Отправить</button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Добавляем модальное окно в DOM
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    
    // Показываем модальное окно
    const modal = new bootstrap.Modal(document.getElementById('applyModal'));
    modal.show();
    
    // Обработка отправки формы
    document.getElementById('submit-apply').addEventListener('click', function() {
        submitApplication(vacancyId);
    });
    
    // Удаляем модальное окно после закрытия
    document.getElementById('applyModal').addEventListener('hidden.bs.modal', function() {
        this.remove();
    });
}

// Отправка заявки
async function submitApplication(vacancyId) {
    try {
        const resumeUrl = document.getElementById('resume-url').value;
        const coverLetter = document.getElementById('cover-letter').value;
        
        // Показываем индикатор загрузки
        const submitBtn = document.getElementById('submit-apply');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Отправка...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/apply/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify({
                resume_url: resumeUrl,
                cover_letter: coverLetter
            })
        });
        
        const data = await response.json();
        
        if (!response.ok) {
            // Показываем детальные ошибки валидации
            let errorMessage = 'Ошибка отправки заявки';
            
            if (data.detail) {
                errorMessage = data.detail;
            } else if (data.non_field_errors) {
                errorMessage = data.non_field_errors.join(', ');
            } else if (typeof data === 'object') {
                // Собираем все ошибки полей
                const fieldErrors = [];
                for (const field in data) {
                    if (Array.isArray(data[field])) {
                        fieldErrors.push(`${field}: ${data[field].join(', ')}`);
                    }
                }
                if (fieldErrors.length > 0) {
                    errorMessage = fieldErrors.join('; ');
                }
            }
            
            throw new Error(errorMessage);
        }
        
        // Закрываем модальное окно
        bootstrap.Modal.getInstance(document.getElementById('applyModal')).hide();
        
        showSuccess('Заявка успешно отправлена!');
        
        setTimeout(() => {
            window.location.href = '/student-dashboard/';
        }, 1500);
        
    } catch (error) {
        showError(error.message);
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = document.getElementById('submit-apply');
        if (submitBtn) {
            submitBtn.textContent = 'Отправить';
            submitBtn.disabled = false;
        }
    }
}