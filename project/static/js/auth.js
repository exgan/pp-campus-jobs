const API_BASE_URL = 'http://localhost:8000/api';
const TOKEN_KEY = 'auth_token';

// Вспомогательные функции для показа сообщений
function showError(message) {
    // Если есть элемент для ошибок
    const errorDiv = document.getElementById('error-message') || document.getElementById('login-error');
    if (errorDiv) {
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';
        setTimeout(() => {
            errorDiv.style.display = 'none';
        }, 5000);
    } else {
        alert('Ошибка: ' + message);
    }
    console.error('Error:', message);
}

function showSuccess(message) {
    const successDiv = document.getElementById('success-message');
    if (successDiv) {
        successDiv.textContent = message;
        successDiv.style.display = 'block';
        setTimeout(() => {
            successDiv.style.display = 'none';
        }, 3000);
    } else {
        alert('Успех: ' + message);
    }
}

// Функция для входа
async function login(username, password) {
    try {
        const response = await fetch(`${API_BASE_URL}/login/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ username, password })
        });
        
        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || 'Ошибка авторизации');
        }
        
        const data = await response.json();
        localStorage.setItem(TOKEN_KEY, data.token);
        
        // Сохраняем информацию о пользователе
        localStorage.setItem('user_info', JSON.stringify({
            id: data.user_id,
            username: data.username,
            role: data.role
        }));
        
        showSuccess('Вход выполнен успешно!');
        return data;
        
    } catch (error) {
        showError(error.message);
        throw error;
    }
}

function updateNavigation() {
    const role = getUserRole();
    const isAuth = isAuthenticated();
    
    // Элементы навигации
    const studentDashboardLink = document.getElementById('student-dashboard-link');
    const employerDashboardLink = document.getElementById('employer-dashboard-link');
    const applicationsLink = document.getElementById('applications-link');
    const loginBtn = document.getElementById('login-btn');
    const logoutBtn = document.getElementById('logout-btn');
    const userInfo = document.getElementById('user-info');
    
    // Показываем/скрываем элементы в зависимости от авторизации
    if (isAuth) {
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userInfo) userInfo.style.display = 'inline';
        
        // Показываем только соответствующие роли ссылки
        if (role === 'student') {
            if (studentDashboardLink) studentDashboardLink.style.display = 'block';
            if (employerDashboardLink) employerDashboardLink.style.display = 'none';
            if (applicationsLink) applicationsLink.style.display = 'none';
        } else if (role === 'employer') {
            if (studentDashboardLink) studentDashboardLink.style.display = 'none';
            if (employerDashboardLink) employerDashboardLink.style.display = 'block';
            if (applicationsLink) applicationsLink.style.display = 'block';
        } else {
            // Для админа или неизвестной роли показываем все
            if (studentDashboardLink) studentDashboardLink.style.display = 'block';
            if (employerDashboardLink) employerDashboardLink.style.display = 'block';
            if (applicationsLink) applicationsLink.style.display = 'block';
        }
    } else {
        // Не авторизован - скрываем приватные ссылки
        if (loginBtn) loginBtn.style.display = 'inline-block';
        if (logoutBtn) logoutBtn.style.display = 'none';
        if (userInfo) userInfo.style.display = 'none';
        
        if (studentDashboardLink) studentDashboardLink.style.display = 'none';
        if (employerDashboardLink) employerDashboardLink.style.display = 'none';
        if (applicationsLink) applicationsLink.style.display = 'none';
    }
}

// Показать информацию о пользователе
function showUserInfo(user) {
    const userInfo = document.getElementById('user-info');
    const logoutBtn = document.getElementById('logout-btn');
    const loginBtn = document.getElementById('login-btn');
    
    if (userInfo && user.username) {
        userInfo.textContent = `Привет! ${user.username}`;
        userInfo.style.display = 'inline';
        
        
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (loginBtn) loginBtn.style.display = 'none';
        
        updateNavigation();
    }
}

// Функция выхода
function logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem('user_info');
    showSuccess('Вы вышли из системы');
    updateNavigation();
    window.location.href = '/';
}

// Проверка авторизации
function checkAuth() {
    const token = localStorage.getItem(TOKEN_KEY);
    if (token) {
        // Показываем информацию о пользователе
        const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
        showUserInfo(userInfo);
        updateNavigation();
        return true;
    }
    updateNavigation();
    return false;
}

// Получить заголовки для авторизованных запросов
function getAuthHeaders() {
    const token = localStorage.getItem(TOKEN_KEY);
    const headers = {
        'Content-Type': 'application/json'
    };
    
    if (token) {
        headers['Authorization'] = `Token ${token}`;
    }
    
    return headers;
}

// Проверка роли пользователя
function getUserRole() {
    const userInfo = JSON.parse(localStorage.getItem('user_info') || '{}');
    return userInfo.role;
}

// Проверка, авторизован ли пользователь
function isAuthenticated() {
    return !!localStorage.getItem(TOKEN_KEY);
}

// Проверка, является ли пользователь студентом
function isStudent() {
    return getUserRole() === 'student';
}

// Проверка, является ли пользователь работодателем
function isEmployer() {
    return getUserRole() === 'employer';
}

// Перенаправление если не авторизован
function requireAuth(redirectUrl = '/login/') {
    if (!isAuthenticated()) {
        window.location.href = redirectUrl + '?next=' + encodeURIComponent(window.location.pathname);
        return false;
    }
    return true;
}

// Перенаправление если не студент
function requireStudent() {
    if (!isStudent()) {
        alert('Эта страница доступна только студентам');
        window.location.href = '/';
        return false;
    }
    return true;
}

// Перенаправление если не работодатель
function requireEmployer() {
    if (!isEmployer()) {
        alert('Эта страница доступна только работодателям');
        window.location.href = '/';
        return false;
    }
    return true;
}