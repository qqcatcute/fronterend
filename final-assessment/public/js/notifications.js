document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const notificationsList = document.getElementById('notificationsList');
  const markAllReadBtn = document.getElementById('markAllReadBtn');
  const notificationStatusSelect = document.getElementById('notificationStatus');
  const notificationTypeSelect = document.getElementById('notificationType');
  const notificationBadge = document.getElementById('notificationBadge');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 通知数据和过滤设置
  let allNotifications = [];
  let filteredNotifications = [];
  let filterSettings = {
    status: 'all',
    type: 'all'
  };

  // 初始加载
  loadNotifications();

  // 设置定时刷新通知 (每30秒刷新一次)
  const refreshInterval = setInterval(loadNotifications, 30000);

  // 绑定全部标为已读按钮事件
  markAllReadBtn.addEventListener('click', markAllAsRead);

  // 绑定过滤器变更事件
  notificationStatusSelect.addEventListener('change', updateFilter);
  notificationTypeSelect.addEventListener('change', updateFilter);

  // 更新通知类型选择器，添加新类型
  updateNotificationTypeOptions();

  /**
   * 更新通知类型选择器选项
   */
  function updateNotificationTypeOptions() {
    // 检查是否已经有这些选项
    const existingOptions = Array.from(notificationTypeSelect.options).map(opt => opt.value);

    // 添加新的通知类型选项（如果不存在）
    const typesToAdd = [
      { value: 'task_dependency', text: '任务依赖变更' },
      { value: 'task_dependent', text: '被依赖任务变更' },
      { value: 'task_status', text: '任务状态变更' }
    ];

    typesToAdd.forEach(type => {
      if (!existingOptions.includes(type.value)) {
        const option = document.createElement('option');
        option.value = type.value;
        option.textContent = type.text;
        notificationTypeSelect.appendChild(option);
      }
    });
  }

  /**
   * 加载通知列表
   */
  function loadNotifications() {
    notificationsList.innerHTML = '<div class="team-loading">加载中...</div>';

    fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取通知列表失败');
        }
        return response.json();
      })
      .then(data => {
        console.log('加载的通知:', data);
        allNotifications = data.data;

        // 更新未读通知数量
        updateUnreadBadge(data.unreadCount);

        // 应用过滤器并渲染
        applyFilters();
      })
      .catch(error => {
        console.error('加载通知失败:', error);
        notificationsList.innerHTML = `<div class="error-message">加载通知失败: ${error.message}</div>`;
      });
  }

  /**
   * 更新未读通知数量徽章
   * @param {number} count 未读通知数量
   */
  function updateUnreadBadge(count) {
    if (notificationBadge) {
      notificationBadge.textContent = count;

      // 如果没有未读通知，隐藏徽章
      if (count <= 0) {
        notificationBadge.style.display = 'none';
      } else {
        notificationBadge.style.display = 'flex';
      }
    }
  }

  /**
   * 更新过滤设置
   */
  function updateFilter() {
    filterSettings.status = notificationStatusSelect.value;
    filterSettings.type = notificationTypeSelect.value;
    applyFilters();
  }

  /**
   * 应用过滤器
   */
  function applyFilters() {
    // 复制所有通知
    filteredNotifications = [...allNotifications];

    // 按状态过滤
    if (filterSettings.status === 'read') {
      filteredNotifications = filteredNotifications.filter(notification => notification.isRead);
    } else if (filterSettings.status === 'unread') {
      filteredNotifications = filteredNotifications.filter(notification => !notification.isRead);
    }

    // 按类型过滤
    if (filterSettings.type !== 'all') {
      filteredNotifications = filteredNotifications.filter(notification => notification.type === filterSettings.type);
    }

    // 渲染过滤后的通知
    renderNotifications();
  }

  /**
   * 渲染通知列表
   */
  /**
   * 渲染通知列表
   */
  function renderNotifications() {
    if (filteredNotifications.length === 0) {
      notificationsList.innerHTML = `
      <div class="empty-notifications">
        <div class="icon">🔔</div>
        <h3>没有通知</h3>
        <p>当有新活动时，您将在这里收到通知。</p>
      </div>
    `;
      return;
    }

    notificationsList.innerHTML = '';

    filteredNotifications.forEach(notification => {
      const notificationItem = document.createElement('div');
      notificationItem.className = `notification-item ${!notification.isRead ? 'unread' : ''}`;

      // 获取通知类型图标
      const typeIconClass = getNotificationTypeIcon(notification.type);

      // 格式化时间
      const timeAgo = formatTimeAgo(new Date(notification.createdAt));

      // 构建通知链接
      const linkHtml = getNotificationLink(notification);

      // 处理通知内容 - 修复缺少用户名的问题
      let messageContent = notification.content;

      // 如果内容中包含"undefined"，替换为"某用户"
      if (messageContent && messageContent.includes('undefined')) {
        messageContent = messageContent.replace(/undefined/g, '有用户');
      }

      notificationItem.innerHTML = `
      <div class="notification-icon-container">
        <i class="notification-type-icon ${typeIconClass}"></i>
      </div>
      <div class="notification-content">
        <p class="notification-message">${messageContent}</p>
        <div class="notification-meta">
          <span class="notification-time">${timeAgo}</span>
          <div class="notification-actions">
            ${linkHtml}
            ${!notification.isRead ?
          `<button class="notification-action-btn mark-read-btn" data-id="${notification.id}">标为已读</button>` :
          ''}
            <button class="notification-action-btn delete-btn" data-id="${notification.id}">删除</button>
          </div>
        </div>
      </div>
    `;

      notificationsList.appendChild(notificationItem);
    });

    // 绑定操作按钮事件
    bindNotificationActions();
  }

  /**
   * 获取通知类型对应的图标类名
   * @param {string} type 通知类型
   * @returns {string} 图标类名
   */
  function getNotificationTypeIcon(type) {
    switch (type) {
      case 'task_assigned':
        return 'icon-task-assigned';
      case 'task_comment':
        return 'icon-task-comment';
      case 'team_invite':
        return 'icon-team-invite';
      case 'team_remove':
        return 'icon-team-remove';
      case 'task_dependency':
        return 'icon-task-link';
      case 'task_dependent':
        return 'icon-task-link';
      case 'task_status':
        return 'icon-task-status';
      default:
        return 'icon-bell';
    }
  }

  /**
   * 获取通知的相关链接HTML
   * @param {Object} notification 通知对象
   * @returns {string} 链接HTML
   */
  function getNotificationLink(notification) {
    if (!notification.relatedId) {
      return '';
    }

    switch (notification.type) {
      case 'task_assigned':
      case 'task_comment':
      case 'task_dependency':
      case 'task_dependent':
      case 'task_status':
        return `<a href="task-details.html?id=${notification.relatedId}" class="notification-link">查看任务</a>`;
      case 'team_invite':
        return `<a href="team-details.html?id=${notification.relatedId}" class="notification-link">查看团队</a>`;
      default:
        return '';
    }
  }

  /**
   * 绑定通知操作按钮事件
   */
  function bindNotificationActions() {
    // 标记为已读按钮
    const markReadBtns = document.querySelectorAll('.mark-read-btn');
    markReadBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const notificationId = this.dataset.id;
        markAsRead(notificationId);
      });
    });

    // 删除按钮
    const deleteBtns = document.querySelectorAll('.delete-btn');
    deleteBtns.forEach(btn => {
      btn.addEventListener('click', function () {
        const notificationId = this.dataset.id;
        deleteNotification(notificationId);
      });
    });
  }

  /**
   * 标记单个通知为已读
   * @param {string} notificationId 通知ID
   */
  function markAsRead(notificationId) {
    fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('标记通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 更新本地通知数据
        const index = allNotifications.findIndex(n => n.id == notificationId);
        if (index !== -1) {
          allNotifications[index].isRead = true;
        }

        // 重新应用过滤器并渲染
        applyFilters();

        // 更新未读通知数量
        const unreadCount = allNotifications.filter(n => !n.isRead).length;
        updateUnreadBadge(unreadCount);

        // 显示成功通知
        showNotification('通知已标记为已读', 'success');
      })
      .catch(error => {
        console.error('标记通知失败:', error);
        showNotification(error.message || '标记通知失败，请稍后再试', 'error');
      });
  }

  /**
   * 标记所有通知为已读
   */
  function markAllAsRead() {
    // 如果没有未读通知，则不执行操作
    if (allNotifications.every(n => n.isRead)) {
      showNotification('没有未读通知', 'info');
      return;
    }

    fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('标记所有通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 更新所有通知为已读
        allNotifications.forEach(notification => {
          notification.isRead = true;
        });

        // 重新应用过滤器并渲染
        applyFilters();

        // 更新未读通知数量
        updateUnreadBadge(0);

        // 显示成功通知
        showNotification('所有通知已标记为已读', 'success');
      })
      .catch(error => {
        console.error('标记所有通知失败:', error);
        showNotification(error.message || '标记所有通知失败，请稍后再试', 'error');
      });
  }

  /**
   * 删除通知
   * @param {string} notificationId 通知ID
   */
  function deleteNotification(notificationId) {
    fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('删除通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 从本地数据中移除通知
        const index = allNotifications.findIndex(n => n.id == notificationId);
        if (index !== -1) {
          // 检查被删除的通知是否未读
          const wasUnread = !allNotifications[index].isRead;

          // 删除通知
          allNotifications.splice(index, 1);

          // 如果删除的是未读通知，更新未读计数
          if (wasUnread) {
            const unreadCount = allNotifications.filter(n => !n.isRead).length;
            updateUnreadBadge(unreadCount);
          }
        }

        // 重新应用过滤器并渲染
        applyFilters();

        // 显示成功通知
        showNotification('通知已删除', 'success');
      })
      .catch(error => {
        console.error('删除通知失败:', error);
        showNotification(error.message || '删除通知失败，请稍后再试', 'error');
      });
  }

  /**
   * 格式化时间为"几分钟前"的形式
   * @param {Date} date 日期对象
   * @returns {string} 格式化后的时间文本
   */
  function formatTimeAgo(date) {
    const now = new Date();
    const diffInSeconds = Math.floor((now - date) / 1000);

    if (diffInSeconds < 60) {
      return '刚刚';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays}天前`;
    }

    // 如果超过30天，显示具体日期
    return date.toLocaleDateString();
  }

  /**
   * 显示通知
   * @param {string} message 通知消息
   * @param {string} type 通知类型 (success, error, info)
   */
  function showNotification(message, type = 'info') {
    // 检查是否已存在通知元素
    let notification = document.querySelector('.notification-popup');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification-popup';
      document.body.appendChild(notification);
    }

    // 设置通知样式
    notification.className = `notification-popup ${type}`;
    notification.innerHTML = message;
    notification.style.display = 'block';

    // 添加基本样式
    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.16)';

    // 设置不同类型的样式
    if (type === 'success') {
      notification.style.backgroundColor = '#d4edda';
      notification.style.color = '#155724';
      notification.style.borderColor = '#c3e6cb';
    } else if (type === 'error') {
      notification.style.backgroundColor = '#f8d7da';
      notification.style.color = '#721c24';
      notification.style.borderColor = '#f5c6cb';
    } else {
      notification.style.backgroundColor = '#d1ecf1';
      notification.style.color = '#0c5460';
      notification.style.borderColor = '#bee5eb';
    }

    // 3秒后自动关闭
    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // 清除定时器，防止内存泄漏
  window.addEventListener('beforeunload', function () {
    clearInterval(refreshInterval);
  });
});