if (typeof API_BASE_URL === 'undefined') {
    const API_BASE_URL = 'http://localhost:8000/api';
}

// Загрузка кабинета студента
async function loadStudentDashboard() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login/';
            return;
        }
        
        // Загружаем профиль
        const profileResponse = await fetch(`${API_BASE_URL}/me/`, {
            headers: getAuthHeaders()
        });
        
        if (profileResponse.status === 401) {
            localStorage.removeItem('auth_token');
            localStorage.removeItem('user_info');
            window.location.href = '/login/';
            return;
        }
        
        let userData = {};
        if (profileResponse.ok) {
            userData = await profileResponse.json();
            displayStudentProfile(userData);
        } else {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            userData = userInfo;
            displayStudentProfile(userData);
        }
        
        // Загружаем навыки через новый эндпоинт
        if (userData.role === 'student') {
            const skillsResponse = await fetch(`${API_BASE_URL}/student-profiles/my_skills/`, {
                headers: getAuthHeaders()
            });
            
            if (skillsResponse.ok) {
                const skills = await skillsResponse.json();
                displayStudentSkills(skills);
            } else {
                // Если эндпоинта нет, покажем заглушку
                displayStudentSkills([]);
            }
        }
        
        // Загружаем заявки
        const applicationsResponse = await fetch(`${API_BASE_URL}/applications/`, {
            headers: getAuthHeaders()
        });
        
        if (applicationsResponse.ok) {
            const applications = await applicationsResponse.json();
            displayStudentApplications(applications);
        } else if (applicationsResponse.status === 403) {
            document.getElementById('student-applications').innerHTML = `
                <div class="alert alert-warning">
                    Нет доступа к заявкам. Возможно, у вас не заполнен профиль студента.
                </div>
            `;
        } else {
            console.log('Не удалось загрузить заявки:', applicationsResponse.status);
            displayStudentApplications([]);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки кабинета:', error);
        const profileDiv = document.getElementById('student-profile') || document.getElementById('main-content');
        if (profileDiv) {
            profileDiv.innerHTML = `
                <div class="alert alert-danger">
                    Ошибка загрузки данных: ${error.message}<br>
                    <a href="/login/">Попробуйте войти снова</a>
                </div>
            `;
        }
    }
}

// Отображение профиля студента
function displayStudentProfile(user) {
    const profileDiv = document.getElementById('student-profile');
    
    if (user && user.username) {
        profileDiv.innerHTML = `
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>Роль:</strong> ${user.role === 'student' ? 'Студент' : user.role}</p>
            ${user.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ''}
        `;
        
        // Если есть дополнительные данные профиля
        if (user.student_profile) {
            const profile = user.student_profile;
            profileDiv.innerHTML += `
                <p><strong>Имя:</strong> ${profile.first_name || ''} ${profile.last_name || ''}</p>
                <p><strong>Факультет:</strong> ${profile.faculty || 'Не указан'}</p>
                <p><strong>Курс:</strong> ${profile.course || 'Не указан'}</p>
                ${profile.phone ? `<p><strong>Телефон:</strong> ${profile.phone}</p>` : ''}
                ${profile.resume_url ? `<p><strong>Резюме:</strong> <a href="${profile.resume_url}" target="_blank">Ссылка</a></p>` : ''}
            `;
        }
    } else {
        profileDiv.innerHTML = `
            <div class="alert alert-warning">
                Профиль не найден. <a href="/login/">Войдите</a> в систему.
            </div>
        `;
    }
}

// Функция для загрузки навыков студента
async function loadStudentSkills(studentProfileId) {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) return;
        
        // Пробуем получить навыки через API (если есть эндпоинт)
        // ИЛИ покажем навыки из профиля если они там есть
        
        const response = await fetch(`${API_BASE_URL}/student-profiles/${studentProfileId}/skills/`, {
            headers: {
                'Authorization': `Token ${token}`
            }
        });
        
        if (response.ok) {
            const skills = await response.json();
            displayStudentSkills(skills);
        } else {
            // Если нет специального эндпоинта, покажем заглушку
            displayStudentSkills([]);
        }
        
    } catch (error) {
        console.error('Ошибка загрузки навыков:', error);
        displayStudentSkills([]);
    }
}

// Функция для отображения навыков
function displayStudentSkills(skills) {
    const skillsDiv = document.getElementById('student-skills');
    
    if (!skills || skills.length === 0) {
        skillsDiv.innerHTML = `
            <div class="alert alert-info">
                Навыки не указаны. Вы можете добавить их в настройках профиля.
                <div class="mt-2">
                    <span class="badge bg-secondary">Python</span>
                    <span class="badge bg-secondary">Django</span>
                    <span class="badge bg-secondary">HTML/CSS</span>
                    <span class="badge bg-secondary">JavaScript</span>
                </div>
            </div>
        `;
        return;
    }
    
    let html = '<div class="d-flex flex-wrap">';
    skills.forEach(skill => {
        html += `<span class="badge bg-primary me-1 mb-1 p-2">${skill.name}</span>`;
    });
    html += '</div>';
    
    skillsDiv.innerHTML = html;
}

// Отображение заявок студента
function displayStudentApplications(applications) {
    const container = document.getElementById('student-applications');
    
    if (!applications || applications.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                У вас пока нет заявок. Найдите интересные вакансии на <a href="/">главной странице</a>.
            </div>
        `;
        return;
    }
    
    let html = '<div class="list-group">';
    
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
        
        // Добавляем отзыв если есть
        let reviewHtml = '';
        if (app.review) {
            reviewHtml = `
                <div class="mt-2 p-2 bg-light rounded">
                    <small><strong>Отзыв работодателя:</strong></small><br>
                    <small>Оценка: ${'⭐'.repeat(app.review.rating)}</small><br>
                    ${app.review.comment ? `<small>${app.review.comment}</small>` : ''}
                </div>
            `;
        }
        
        html += `
            <div class="list-group-item">
                <div class="d-flex w-100 justify-content-between">
                    <h6 class="mb-1">${app.vacancy?.title || 'Вакансия'}</h6>
                    <span class="badge bg-${statusColors[app.status] || 'secondary'}">
                        ${statusTexts[app.status] || app.status}
                    </span>
                </div>
                <p class="mb-1">${app.vacancy?.employer?.company_name || 'Работодатель'} • ${app.vacancy?.location || ''}</p>
                <small class="text-muted">
                    Отправлено: ${new Date(app.applied_at).toLocaleDateString('ru-RU')}
                    ${app.updated_at !== app.applied_at ? 
                        `<br>Обновлено: ${new Date(app.updated_at).toLocaleDateString('ru-RU')}` : ''}
                </small>
                ${reviewHtml}
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
}

// Загрузка кабинета работодателя
async function loadEmployerDashboard() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login/';
            return;
        }
        
        // Загружаем профиль
        const profileResponse = await fetch(`${API_BASE_URL}/me/`, {
            headers: getAuthHeaders()
        });
        
        let userData = {};
        if (profileResponse.ok) {
            userData = await profileResponse.json();
            displayEmployerProfile(userData);
        } else {
            const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
            userData = userInfo;
            displayEmployerProfile(userData);
        }
        
        // Загружаем ВСЕ вакансии работодателя
        const vacanciesResponse = await fetch(`${API_BASE_URL}/vacancies/?all=true&my=true`, {
            headers: getAuthHeaders()
        });
        
        if (vacanciesResponse.ok) {
            const vacancies = await vacanciesResponse.json();
            displayEmployerVacancies(vacancies);
        } else {
            // Если параметр all не работает, пробуем получить все вакансии
            const allVacanciesResponse = await fetch(`${API_BASE_URL}/vacancies/`, {
                headers: getAuthHeaders()
            });
            
            if (allVacanciesResponse.ok) {
                const allVacancies = await allVacanciesResponse.json();
                // Фильтруем вакансии текущего работодателя
                const myVacancies = allVacancies.filter(v => 
                    v.employer && 
                    (v.employer.user?.username === userData.username || 
                     v.employer.user?.id === userData.id)
                );
                displayEmployerVacancies(myVacancies);
            } else {
                displayEmployerVacancies([]);
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки кабинета:', error);
        const profileDiv = document.getElementById('employer-profile') || document.getElementById('main-content');
        if (profileDiv) {
            profileDiv.innerHTML = `
                <div class="alert alert-danger">
                    Ошибка загрузки данных: ${error.message}<br>
                    <a href="/login/">Попробуйте войти снова</a>
                </div>
            `;
        }
    }
}

// Отображение профиля работодателя
function displayEmployerProfile(user) {
    const profileDiv = document.getElementById('employer-profile');
    
    if (user && user.username) {
        profileDiv.innerHTML = `
            <p><strong>Имя пользователя:</strong> ${user.username}</p>
            <p><strong>Роль:</strong> ${user.role === 'employer' ? 'Работодатель' : user.role}</p>
            ${user.email ? `<p><strong>Email:</strong> ${user.email}</p>` : ''}
        `;
        
        if (user.employer_profile) {
            const profile = user.employer_profile;
            profileDiv.innerHTML += `
                <p><strong>Компания:</strong> ${profile.company_name || ''}</p>
                <p><strong>Отдел:</strong> ${profile.department || ''}</p>
                <p><strong>Контактное лицо:</strong> ${profile.contact_person || ''}</p>
                <p><strong>Телефон:</strong> ${profile.phone || ''}</p>
                ${profile.description ? `<p><strong>Описание:</strong> ${profile.description}</p>` : ''}
            `;
        }
    } else {
        profileDiv.innerHTML = '<p>Профиль работодателя не найден</p>';
    }
}

// Отображение вакансий работодателя
function displayEmployerVacancies(vacancies) {
    const container = document.getElementById('employer-vacancies');
    
    if (!vacancies || vacancies.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                У вас пока нет вакансий. Создайте первую вакансию.
            </div>
        `;
        return;
    }
    
    // Сортируем: сначала активные, потом неактивные
    const sortedVacancies = [...vacancies].sort((a, b) => {
        if (a.is_active === b.is_active) return 0;
        return a.is_active ? -1 : 1;
    });
    
    let html = `
        <div class="d-flex justify-content-between align-items-center mb-3">
            <div class="form-check">
                <input class="form-check-input" type="checkbox" id="show-inactive">
                <label class="form-check-label" for="show-inactive">
                    Показать неактивные
                </label>
            </div>
        </div>
        <div class="list-group" id="vacancies-list">
    `;
    
    sortedVacancies.forEach(vacancy => {
        const statusClass = vacancy.is_active ? 'success' : 'secondary';
        const statusText = vacancy.is_active ? 'Активна' : 'Не активна';
        const applicationsCount = vacancy.applications_count || vacancy.applications?.length || 0;
        
        html += `
            <div class="list-group-item ${!vacancy.is_active ? 'list-group-item-light' : ''}" 
                 style="${!vacancy.is_active ? 'display: none;' : ''}" 
                 data-active="${vacancy.is_active}">
                <div class="d-flex w-100 justify-content-between">
                    <div>
                        <h6 class="mb-1">${vacancy.title}</h6>
                        ${!vacancy.is_active ? '<small class="text-muted"><em>Неактивна</em></small>' : ''}
                    </div>
                    <span class="badge bg-${statusClass}">${statusText}</span>
                </div>
                <p class="mb-1 text-muted">${vacancy.description?.substring(0, 100) || ''}...</p>
                <small class="text-muted d-block">
                    ${vacancy.location} | 
                    ${vacancy.salary ? vacancy.salary + ' ₽' : 'З/п не указана'} | 
                    ${applicationsCount} заявок
                </small>
                <div class="mt-2">
                    <a href="/vacancy/${vacancy.id}/" class="btn btn-sm btn-outline-primary me-1">
                        Просмотр
                    </a>
                    <a href="/applications/?vacancy=${vacancy.id}" class="btn btn-sm btn-outline-success me-1">
                        Заявки (${applicationsCount})
                    </a>
                    <button class="btn btn-sm btn-outline-warning me-1" onclick="editVacancy(${vacancy.id})">
                        Редактировать
                    </button>
                    <button class="btn btn-sm btn-outline-danger" onclick="deleteVacancy(${vacancy.id}, '${vacancy.title.replace(/'/g, "\\'")}')">
                        Удалить
                    </button>
                </div>
            </div>
        `;
    });
    
    html += '</div>';
    container.innerHTML = html;
    
    // Добавляем обработчик для чекбокса показа неактивных
    const showInactiveCheckbox = document.getElementById('show-inactive');
    if (showInactiveCheckbox) {
        showInactiveCheckbox.addEventListener('change', function() {
            const inactiveItems = document.querySelectorAll('#vacancies-list .list-group-item[data-active="false"]');
            inactiveItems.forEach(item => {
                item.style.display = this.checked ? 'block' : 'none';
            });
        });
    }
}

// Создание вакансии
async function createVacancy() {
    try {
        // Создаем модальное окно с формой
        const modalHtml = `
            <div class="modal fade" id="createVacancyModal" tabindex="-1">
                <div class="modal-dialog modal-lg">
                    <div class="modal-content">
                        <div class="modal-header">
                            <h5 class="modal-title">Создание новой вакансии</h5>
                            <button type="button" class="btn-close" data-bs-dismiss="modal"></button>
                        </div>
                        <div class="modal-body">
                            <form id="create-vacancy-form">
                                <div class="mb-3">
                                    <label class="form-label">Название вакансии *</label>
                                    <input type="text" class="form-control" name="title" required>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Описание *</label>
                                    <textarea class="form-control" name="description" rows="4" required></textarea>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Требования *</label>
                                    <textarea class="form-control" name="requirements" rows="3" required></textarea>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Тип вакансии *</label>
                                        <select class="form-select" name="vacancy_type" required>
                                            <option value="work">Работа</option>
                                            <option value="internship">Стажировка</option>
                                        </select>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Зарплата (₽)</label>
                                        <input type="number" class="form-control" name="salary" min="0">
                                    </div>
                                </div>
                                
                                <div class="row mb-3">
                                    <div class="col-md-6">
                                        <label class="form-label">Локация *</label>
                                        <input type="text" class="form-control" name="location" required>
                                    </div>
                                    <div class="col-md-6">
                                        <label class="form-label">Статус</label>
                                        <select class="form-select" name="is_active">
                                            <option value="true" selected>Активна</option>
                                            <option value="false">Не активна</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Категория</label>
                                    <select class="form-select" name="category" id="category-select">
                                        <option value="">Без категории</option>
                                    </select>
                                </div>
                                
                                <div class="mb-3">
                                    <label class="form-label">Навыки</label>
                                    <div id="skills-checkboxes" class="border p-2 rounded">
                                        <div class="spinner-border spinner-border-sm"></div> Загрузка навыков...
                                    </div>
                                </div>
                            </form>
                        </div>
                        <div class="modal-footer">
                            <button type="button" class="btn btn-secondary" data-bs-dismiss="modal">Отмена</button>
                            <button type="button" class="btn btn-primary" onclick="submitVacancyForm()">Создать вакансию</button>
                        </div>
                    </div>
                </div>
            </div>
        `;
        
        // Добавляем модальное окно в DOM
        if (!document.getElementById('createVacancyModal')) {
            document.body.insertAdjacentHTML('beforeend', modalHtml);
        }
        
        // Загружаем категории и навыки
        await loadCategoriesAndSkills();
        
        // Показываем модальное окно
        const modal = new bootstrap.Modal(document.getElementById('createVacancyModal'));
        modal.show();
        
    } catch (error) {
        console.error('Ошибка создания вакансии:', error);
        alert('Не удалось загрузить форму создания вакансии');
    }
}

async function loadCategoriesAndSkills() {
    try {
        // Загружаем категории
        const categoriesRes = await fetch(`${API_BASE_URL}/categories/`);
        if (categoriesRes.ok) {
            const categories = await categoriesRes.json();
            const categorySelect = document.getElementById('category-select');
            if (categorySelect) {
                categories.forEach(cat => {
                    const option = document.createElement('option');
                    option.value = cat.id;
                    option.textContent = cat.name;
                    categorySelect.appendChild(option);
                });
            }
        }
        
        // Загружаем навыки
        const skillsRes = await fetch(`${API_BASE_URL}/skills/`);
        if (skillsRes.ok) {
            const skills = await skillsRes.json();
            const skillsContainer = document.getElementById('skills-checkboxes');
            if (skillsContainer) {
                let skillsHtml = '<div class="row">';
                skills.forEach(skill => {
                    skillsHtml += `
                        <div class="col-md-6 mb-2">
                            <div class="form-check">
                                <input class="form-check-input" type="checkbox" 
                                       name="skills" value="${skill.id}" id="skill-${skill.id}">
                                <label class="form-check-label" for="skill-${skill.id}">
                                    ${skill.name}
                                </label>
                            </div>
                        </div>
                    `;
                });
                skillsHtml += '</div>';
                skillsContainer.innerHTML = skillsHtml;
            }
        }
        
    } catch (error) {
        console.error('Ошибка загрузки данных:', error);
    }
}


// Подача заявки на создание вакансии
async function submitVacancyForm() {
    const form = document.getElementById('create-vacancy-form');
    const formData = new FormData(form);
    
    // Валидация
    const title = formData.get('title');
    const description = formData.get('description');
    const requirements = formData.get('requirements');
    const location = formData.get('location');
    
    if (!title || !description || !requirements || !location) {
        alert('Пожалуйста, заполните все обязательные поля (помечены *)');
        return;
    }
    
    // Собираем данные в правильном формате для API
    const data = {
        title: title,
        description: description,
        requirements: requirements,
        vacancy_type: formData.get('vacancy_type'),
        location: location,
        is_active: formData.get('is_active') === 'true'
    };
    
    // Зарплата
    const salary = formData.get('salary');
    if (salary && salary.trim() !== '') {
        data.salary = parseFloat(salary);
    }
    
    // Категория
    const category = formData.get('category');
    if (category && category.trim() !== '') {
        data.category_id = parseInt(category);
    }
    
    // Навыки
    const skillCheckboxes = form.querySelectorAll('input[name="skills"]:checked');
    if (skillCheckboxes.length > 0) {
        data.skill_ids = Array.from(skillCheckboxes).map(cb => parseInt(cb.value));
    } else {
        data.skill_ids = []; // Отправляем пустой массив если ничего не выбрано
    }
    
    console.log('Отправляемые данные:', data); // Для отладки
    
    // Показываем индикатор загрузки
    const submitBtn = document.querySelector('#createVacancyModal .btn-primary');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Создание...';
    submitBtn.disabled = true;
    
    try {
        const response = await fetch(`${API_BASE_URL}/vacancies/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        console.log('Ответ сервера:', response.status);
        
        if (response.ok) {
            const result = await response.json();
            console.log('Созданная вакансия:', result);
            alert('Вакансия успешно создана!');
            
            // Закрываем модальное окно
            const modal = bootstrap.Modal.getInstance(document.getElementById('createVacancyModal'));
            if (modal) modal.hide();
            
            // Обновляем список вакансий
            setTimeout(() => {
                if (typeof loadEmployerDashboard === 'function') {
                    loadEmployerDashboard();
                }
            }, 500);
            
        } else {
            let errorMessage = 'Не удалось создать вакансию';
            try {
                const errorData = await response.json();
                console.error('Ошибка API:', errorData);
                
                // Форматируем ошибки
                if (errorData.detail) {
                    errorMessage = errorData.detail;
                } else if (errorData.non_field_errors) {
                    errorMessage = errorData.non_field_errors.join(', ');
                } else {
                    // Собираем все ошибки полей
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
        console.error('Ошибка сети:', error);
        alert('Ошибка соединения с сервером: ' + error.message);
    } finally {
        // Восстанавливаем кнопку
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
    }
}

// Удаление вакансии
async function deleteVacancy(vacancyId, vacancyTitle) {
    const confirmed = confirm(`Вы уверены, что хотите удалить вакансию "${vacancyTitle}"?\n\nЭто действие нельзя отменить.`);
    
    if (!confirmed) {
        return;
    }
    
    try {
        // Показываем загрузку
        const deleteBtns = document.querySelectorAll(`[onclick*="deleteVacancy(${vacancyId}"]`);
        deleteBtns.forEach(btn => {
            btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
            btn.disabled = true;
        });
        
        const response = await fetch(`${API_BASE_URL}/vacancies/${vacancyId}/`, {
            method: 'DELETE',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            alert('Вакансия успешно удалена!');
            
            // Перезагружаем страницу для обновления списка
            setTimeout(() => {
                location.reload();
            }, 1000);
            
        } else if (response.status === 404) {
            alert('Вакансия не найдена. Возможно, она уже была удалена.');
            location.reload();
        } else {
            const errorData = await response.json();
            const errorMessage = errorData.detail || `Ошибка ${response.status}`;
            alert(`Ошибка удаления: ${errorMessage}`);
            
            // Восстанавливаем кнопки
            deleteBtns.forEach(btn => {
                btn.innerHTML = '🗑️ Удалить';
                btn.disabled = false;
            });
        }
        
    } catch (error) {
        console.error('Ошибка удаления вакансии:', error);
        alert('Ошибка соединения с сервером');
        
        // Восстанавливаем кнопки
        const deleteBtns = document.querySelectorAll(`[onclick*="deleteVacancy(${vacancyId}"]`);
        deleteBtns.forEach(btn => {
            btn.innerHTML = '🗑️ Удалить';
            btn.disabled = false;
        });
    }
}