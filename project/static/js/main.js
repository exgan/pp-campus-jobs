// Загрузка вакансий
async function loadVacancies(filters = {}) {
    try {
        let url = `${API_BASE_URL}/vacancies/`;
        
        // Добавляем фильтры к URL
        const params = new URLSearchParams();
        
        if (filters.search) params.append('search', filters.search);
        if (filters.type) params.append('type', filters.type);
        if (filters.category) params.append('category', filters.category);
        if (filters.with_salary) params.append('with_salary', 'true');
        if (!filters.all) params.append('is_active', 'true'); // По умолчанию только активные
        
        if (params.toString()) {
            url += `?${params.toString()}`;
        }
        
        const response = await fetch(url);
        if (!response.ok) throw new Error('Ошибка загрузки вакансий');
        
        const vacancies = await response.json();
        displayVacancies(vacancies);
        
        // Показываем количество результатов
        const resultsInfo = document.getElementById('results-info');
        if (resultsInfo) {
            resultsInfo.textContent = `Найдено вакансий: ${vacancies.length}`;
        }
        
    } catch (error) {
        showError('Не удалось загрузить вакансии');
    }
}

document.addEventListener('DOMContentLoaded', function() {
    checkAuth();
    displaySearchFilters();
    loadVacancies();
});

// Отображение списка вакансий
function displayVacancies(vacancies) {
    const container = document.getElementById('vacancies-container');
    if (!container) return;
    
    container.innerHTML = '';
    
    if (vacancies.length === 0) {
        container.innerHTML = `
            <div class="alert alert-info">
                Вакансий не найдено. Попробуйте изменить параметры поиска.
            </div>
        `;
        return;
    }
    
    vacancies.forEach(vacancy => {
        const vacancyCard = createVacancyCard(vacancy);
        container.appendChild(vacancyCard);
    });
}

// Создание карточки вакансии
function createVacancyCard(vacancy) {
    const card = document.createElement('div');
    card.className = 'card mb-3';
    card.innerHTML = `
        <div class="card-body">
            <h5 class="card-title">${vacancy.title}</h5>
            <h6 class="card-subtitle mb-2 text-muted">
                ${vacancy.employer.company_name} • ${vacancy.location}
            </h6>
            <p class="card-text">${vacancy.description.substring(0, 150)}...</p>
            <div class="mb-2">
                <span class="badge bg-primary">${vacancy.vacancy_type === 'work' ? 'Работа' : 'Стажировка'}</span>
                ${vacancy.salary ? `<span class="badge bg-success">${vacancy.salary} ₽</span>` : ''}
                ${vacancy.skills.map(skill => `<span class="badge bg-secondary me-1">${skill.name}</span>`).join('')}
            </div>
            <a href="/vacancy/${vacancy.id}/" class="btn btn-primary">Подробнее</a>
        </div>
    `;
    return card;
}

// Инициализация при загрузке страницы
document.addEventListener('DOMContentLoaded', function() {
    // Проверяем авторизацию
    checkAuth();
    
    // Загружаем вакансии
    loadVacancies();
    
    // Обработка формы поиска
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            const searchInput = document.getElementById('search-input');
            loadVacancies({ search: searchInput.value });
        });
    }
    
    // Обработка выхода
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
    }
});


// Форму поиска
function displaySearchFilters() {
    const filtersContainer = document.getElementById('search-filters');
    if (!filtersContainer) return;
    
    filtersContainer.innerHTML = `
        <div class="card mb-4">
            <div class="card-body">
                <form id="search-form" class="row g-3">
                    <div class="col-md-6">
                        <input type="text" class="form-control" id="search-input" 
                               placeholder="Поиск по названию, описанию или требованиям...">
                    </div>
                    <div class="col-md-2">
                        <select class="form-select" id="type-filter">
                            <option value="">Все типы</option>
                            <option value="work">Работа</option>
                            <option value="internship">Стажировка</option>
                        </select>
                    </div>
                    <div class="col-md-2">
                        <select class="form-select" id="category-filter">
                            <option value="">Все категории</option>
                            <!-- Категории загрузятся динамически -->
                        </select>
                    </div>
                    <div class="col-md-2">
                        <button type="submit" class="btn btn-primary w-100">Найти</button>
                    </div>
                </form>
                
                <div class="mt-3">
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="checkbox" id="active-only" checked>
                        <label class="form-check-label" for="active-only">Только активные вакансии</label>
                    </div>
                    <div class="form-check form-check-inline">
                        <input class="form-check-input" type="checkbox" id="with-salary">
                        <label class="form-check-label" for="with-salary">Только с зарплатой</label>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Загружаем категории для фильтра
    loadCategoriesForFilter();
    
    // Настраиваем обработчик формы
    const searchForm = document.getElementById('search-form');
    if (searchForm) {
        searchForm.addEventListener('submit', function(e) {
            e.preventDefault();
            performSearch();
        });
    }
}

async function loadCategoriesForFilter() {
    try {
        const response = await fetch(`${API_BASE_URL}/categories/`);
        if (!response.ok) return;
        
        const categories = await response.json();
        const filter = document.getElementById('category-filter');
        
        categories.forEach(category => {
            const option = document.createElement('option');
            option.value = category.id;
            option.textContent = category.name;
            filter.appendChild(option);
        });
        
    } catch (error) {
        console.error('Ошибка загрузки категорий:', error);
    }
}

async function performSearch() {
    const filters = {};
    
    // Собираем параметры поиска
    const searchInput = document.getElementById('search-input');
    if (searchInput && searchInput.value) {
        filters.search = searchInput.value;
    }
    
    const typeFilter = document.getElementById('type-filter');
    if (typeFilter && typeFilter.value) {
        filters.type = typeFilter.value;
    }
    
    const categoryFilter = document.getElementById('category-filter');
    if (categoryFilter && categoryFilter.value) {
        filters.category = categoryFilter.value;
    }
    
    const activeOnly = document.getElementById('active-only');
    if (activeOnly && !activeOnly.checked) {
        filters.all = true;
    }
    
    const withSalary = document.getElementById('with-salary');
    if (withSalary && withSalary.checked) {
        filters.with_salary = true;
    }
    
    loadVacancies(filters);
}