// загрузить уведомления
async function loadNotifications() {
    try {
        const token = localStorage.getItem('auth_token');
        if (!token) {
            console.log('Пользователь не авторизован');
            return;
        }
        
        const response = await fetch(`${API_BASE_URL}/notifications/`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const notifications = await response.json();
            console.log('Уведомления загружены:', notifications.length);
            displayNotifications(notifications);
            updateNotificationBadge(notifications);
        } else if (response.status === 404) {
            console.warn('Эндпоинт уведомлений не найден (404)');
            // Скрываем компонент уведомлений
            const dropdown = document.getElementById('notifications-dropdown');
            if (dropdown) dropdown.style.display = 'none';
        } else {
            console.error('Ошибка загрузки уведомлений:', response.status);
        }
        
    } catch (error) {
        console.error('Ошибка сети при загрузке уведомлений:', error);
    }
}

// Отобразить уведомления
function displayNotifications(notifications) {
    const container = document.getElementById('notifications-list');
    if (!container) {
        console.warn('Контейнер для уведомлений не найден');
        return;
    }
    
    if (!notifications || notifications.length === 0) {
        container.innerHTML = `
            <div class="text-center p-3 text-muted">
                Нет уведомлений
            </div>
        `;
        return;
    }
    
    let html = '';
    notifications.forEach(notification => {
        
        const typeTexts = {
            'application_update': 'Обновление заявки',
            'new_review': 'Новый отзыв',
            'new_application': 'Новая заявка',
            'new_vacancy': 'Новая вакансия',
            'system': 'Системное'
        };
        
        const typeText = typeTexts[notification.notification_type] || notification.notification_type;
        
        html += `
            <div class="dropdown-item ${notification.is_read ? '' : 'bg-light'}" 
                 onclick="markAsRead(${notification.id})" style="cursor: pointer;">
                <div class="d-flex">
                    <div class="flex-grow-1">
                        <small class="text-muted">${typeText}</small>
                        <div class="fw-bold">${notification.title}</div>
                        <div class="small">${notification.message}</div>
                        <div class="text-muted" style="font-size: 0.75rem;">
                            ${new Date(notification.created_at).toLocaleString('ru-RU')}
                        </div>
                    </div>
                </div>
            </div>
            <div class="dropdown-divider my-1"></div>
        `;
    });
    
    container.innerHTML = html;
}

// Создать уведомление в frontend
function createNotificationsHtml(notifications, isRead) {
    return notifications.map(notification => `
        <div class="notification-item ${!isRead ? 'bg-light' : ''} p-3 mb-2 border rounded">
            <div class="d-flex justify-content-between align-items-start">
                <div class="flex-grow-1">
                    <h6 class="${!isRead ? 'fw-bold' : ''} mb-1">
                        ${notification.notification_type} 
                        ${notification.title}
                    </h6>
                    <p class="mb-1">${notification.message}</p>
                    <small class="text-muted">
                        ${new Date(notification.created_at).toLocaleString('ru-RU')}
                    </small>
                </div>
                <div>
                    ${!notification.is_read ? `
                        <span class="badge bg-primary">NEW</span>
                        <button class="btn btn-sm btn-outline-success ms-2" 
                                onclick="markAsRead(${notification.id})" title="Отметить как прочитанное">
                            ✓
                        </button>
                    ` : ''}
                </div>
            </div>
        </div>
    `).join('');
}

// Прочитать уведомление
async function markAsRead(notificationId) {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/${notificationId}/mark_as_read/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            // Перезагружаем уведомления
            loadNotifications();
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
    }
}

// Прочитать все уведомления
async function markAllAsRead() {
    if (!confirm('Отметить все уведомления как прочитанные?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/mark_all_as_read/`, {
            method: 'POST',
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            alert('Все уведомления отмечены как прочитанные');
            loadNotifications();
        }
        
    } catch (error) {
        console.error('Ошибка:', error);
        alert('Ошибка при обновлении уведомлений');
    }
}

// Показ количества непрочитанных уведомлений в навигации
async function updateNotificationBadge() {
    try {
        const response = await fetch(`${API_BASE_URL}/notifications/unread_count/`, {
            headers: getAuthHeaders()
        });
        
        if (response.ok) {
            const data = await response.json();
            const badge = document.getElementById('notification-badge');
            if (badge) {
                if (data.count > 0) {
                    badge.textContent = data.count;
                    badge.style.display = 'inline';
                } else {
                    badge.style.display = 'none';
                }
            }
        }
        
    } catch (error) {
        console.error('Ошибка обновления бейджа:', error);
    }
}