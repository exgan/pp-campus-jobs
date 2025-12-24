async function loadProfileSettings() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            window.location.href = '/login/';
            return;
        }
        
        // Загружаем данные пользователя
        const response = await fetch(`${API_BASE_URL}/me/`, {
            headers: getAuthHeaders()
        });
        
        if (!response.ok) {
            throw new Error('Не удалось загрузить профиль');
        }
        
        const userData = await response.json();
        displayProfileForm(userData);
        
    } catch (error) {
        console.error('Ошибка:', error);
        document.getElementById('profile-form-container').innerHTML = `
            <div class="alert alert-danger">
                Ошибка загрузки профиля: ${error.message}
            </div>
        `;
    }
}

function displayProfileForm(user) {
    const container = document.getElementById('profile-form-container');
    
    let formHtml = '';
    
    if (user.role === 'student' && user.student_profile) {
        const profile = user.student_profile;
        formHtml = `
            <form id="profile-form" onsubmit="saveProfile(event)">
                <h4>Основная информация</h4>
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Имя</label>
                        <input type="text" class="form-control" name="first_name" value="${profile.first_name || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Фамилия</label>
                        <input type="text" class="form-control" name="last_name" value="${profile.last_name || ''}">
                    </div>
                </div>
                
                <div class="row mb-3">
                    <div class="col-md-6">
                        <label class="form-label">Факультет</label>
                        <input type="text" class="form-control" name="faculty" value="${profile.faculty || ''}">
                    </div>
                    <div class="col-md-6">
                        <label class="form-label">Курс</label>
                        <input type="number" class="form-control" name="course" min="1" max="6" value="${profile.course || 1}">
                    </div>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Телефон</label>
                    <input type="tel" class="form-control" name="phone" value="${profile.phone || ''}">
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Ссылка на резюме</label>
                    <input type="url" class="form-control" name="resume_url" value="${profile.resume_url || ''}">
                </div>
                
                <h4 class="mt-4">Навыки</h4>
                <div class="mb-3">
                    <label class="form-label">Выберите навыки</label>
                    <div id="skills-container" class="mb-3">
                        <!-- Навыки загрузятся отдельно -->
                        <div class="spinner-border spinner-border-sm"></div>
                    </div>
                </div>
                
                <button type="submit" class="btn btn-primary">Сохранить изменения</button>
            </form>
        `;
        
        // Загружаем навыки
        loadSkillsForProfile();
        
    } else if (user.role === 'employer' && user.employer_profile) {
        const profile = user.employer_profile;
        formHtml = `
            <form id="profile-form" onsubmit="saveProfile(event)">
                <h4>Информация о компании</h4>
                
                <div class="mb-3">
                    <label class="form-label">Название компании/отдела</label>
                    <input type="text" class="form-control" name="company_name" value="${profile.company_name || ''}" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Отдел</label>
                    <input type="text" class="form-control" name="department" value="${profile.department || ''}">
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Контактное лицо</label>
                    <input type="text" class="form-control" name="contact_person" value="${profile.contact_person || ''}" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Телефон</label>
                    <input type="tel" class="form-control" name="phone" value="${profile.phone || ''}" required>
                </div>
                
                <div class="mb-3">
                    <label class="form-label">Описание</label>
                    <textarea class="form-control" name="description" rows="4">${profile.description || ''}</textarea>
                </div>
                
                <button type="submit" class="btn btn-primary">Сохранить изменения</button>
            </form>
        `;
    }
    
    container.innerHTML = formHtml;
}

async function loadSkillsForProfile() {
    try {
        // Загружаем все доступные навыки
        const response = await fetch(`${API_BASE_URL}/skills/`);
        if (!response.ok) return;
        
        const allSkills = await response.json();
        const container = document.getElementById('skills-container');
        
        let html = '<div class="row">';
        allSkills.forEach(skill => {
            html += `
                <div class="col-md-3 mb-2">
                    <div class="form-check">
                        <input class="form-check-input" type="checkbox" name="skills" value="${skill.id}" id="skill-${skill.id}">
                        <label class="form-check-label" for="skill-${skill.id}">
                            ${skill.name}
                        </label>
                    </div>
                </div>
            `;
        });
        html += '</div>';
        
        container.innerHTML = html;
        
    } catch (error) {
        console.error('Ошибка загрузки навыков:', error);
    }
}

async function saveProfile(event) {
    event.preventDefault();
    
    const form = event.target;
    const formData = new FormData(form);
    
    // Собираем данные из формы
    const data = {};
    for (let [key, value] of formData.entries()) {
        // Для чекбоксов (навыков) собираем массив
        if (key === 'skills') {
            if (!data[key]) data[key] = [];
            data[key].push(value);
        } else {
            data[key] = value;
        }
    }
    
    // Преобразуем курс в число если есть
    if (data.course) {
        data.course = parseInt(data.course);
    }
    
    try {
        // Показываем индикатор загрузки
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Сохранение...';
        submitBtn.disabled = true;
        
        const response = await fetch(`${API_BASE_URL}/update-profile/`, {
            method: 'POST',
            headers: getAuthHeaders(),
            body: JSON.stringify(data)
        });
        
        if (response.ok) {
            const result = await response.json();
            alert('Профиль успешно обновлен!');
            
            // Обновляем информацию о пользователе в localStorage если нужно
            setTimeout(() => {
                window.location.reload();
            }, 1000);
            
        } else {
            // Пробуем получить детальную ошибку
            let errorMessage = 'Не удалось обновить профиль';
            try {
                const errorData = await response.json();
                errorMessage = errorData.error || errorData.detail || JSON.stringify(errorData);
            } catch (e) {
                errorMessage = `HTTP ${response.status}: ${response.statusText}`;
            }
            alert(`Ошибка: ${errorMessage}`);
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка соединения с сервером: ' + error.message);
    } finally {
        // Восстанавливаем кнопку
        const submitBtn = form.querySelector('button[type="submit"]');
        if (submitBtn) {
            submitBtn.textContent = 'Сохранить изменения';
            submitBtn.disabled = false;
        }
    }
}