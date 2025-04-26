/**
 * header-notifications.js
 * 处理所有页面的顶部导航栏通知图标和下拉菜单功能
 * 该文件应放在 public/js/ 目录下
 */

document.addEventListener('DOMContentLoaded', function () {
  // 获取通知图标元素
  const notificationIcon = document.querySelector('.notification-icon');
  const notificationBadge = document.getElementById('notificationBadge');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) return;

  // 通知数据
  let notifications = [];
  let unreadCount = 0;

  // 初始加载通知数量
  loadNotificationsCount();

  // 设置定时刷新通知数量 (每分钟刷新一次)
  const refreshInterval = setInterval(loadNotificationsCount, 60000);

  // 绑定通知图标点击事件
  if (notificationIcon) {
    notificationIcon.addEventListener('click', toggleNotificationDropdown);
  }

  /**
   * 加载通知数量
   */
  function loadNotificationsCount() {
    fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取通知失败');
        }
        return response.json();
      })
      .then(data => {
        notifications = data.data.slice(0, 5); // 只保留最新的5条通知
        unreadCount = data.unreadCount;

        // 更新未读通知数量徽章
        updateUnreadBadge(unreadCount);
      })
      .catch(error => {
        console.error('加载通知数量失败:', error);
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
   * 切换通知下拉菜单
   */
  function toggleNotificationDropdown() {
    // 检查是否已存在下拉菜单
    let dropdown = document.querySelector('.notification-dropdown');

    if (dropdown) {
      // 如果已存在，则关闭它
      dropdown.remove();
      return;
    }

    // 创建下拉菜单
    dropdown = document.createElement('div');
    dropdown.className = 'notification-dropdown';

    // 添加头部
    const dropdownHeader = document.createElement('div');
    dropdownHeader.className = 'dropdown-header';
    dropdownHeader.innerHTML = `
      <span>通知</span>
      <a href="notifications.html" class="view-all">查看全部</a>
    `;
    dropdown.appendChild(dropdownHeader);

    // 添加通知列表
    const notificationList = document.createElement('div');
    notificationList.className = 'dropdown-notification-list';

    if (notifications.length === 0) {
      notificationList.innerHTML = '<div class="empty-notification">没有通知</div>';
    } else {
      notifications.forEach(notification => {
        const notificationItem = document.createElement('div');
        notificationItem.className = `dropdown-notification-item ${!notification.isRead ? 'unread' : ''}`;

        // 获取通知类型图标
        const typeIconClass = getNotificationTypeIcon(notification.type);

        // 格式化时间
        const timeAgo = formatTimeAgo(new Date(notification.createdAt));

        // 处理通知内容 - 修复缺少用户名的问题
        let messageContent = notification.content;

        // 如果内容中包含"undefined"，替换为"有用户"
        if (messageContent && messageContent.includes('undefined')) {
          messageContent = messageContent.replace(/undefined/g, '有用户');
        }

        // 构建通知项
        notificationItem.innerHTML = `
  <div class="notification-icon">
    <i class="${typeIconClass}"></i>
  </div>
  <div class="notification-content">
    <p class="notification-text">${messageContent}</p>
    <span class="notification-time">${timeAgo}</span>
  </div>
`;
        // 添加点击事件，跳转到相关页面
        notificationItem.addEventListener('click', () => {
          navigateToNotificationTarget(notification);
        });

        notificationList.appendChild(notificationItem);
      });
    }

    dropdown.appendChild(notificationList);

    // 添加底部操作
    const dropdownFooter = document.createElement('div');
    dropdownFooter.className = 'dropdown-footer';
    dropdownFooter.innerHTML = `
      <button id="markAllReadDropdown">全部标为已读</button>
    `;
    dropdown.appendChild(dropdownFooter);

    // 绑定全部标为已读按钮
    dropdown.querySelector('#markAllReadDropdown').addEventListener('click', (e) => {
      e.stopPropagation();
      markAllAsRead();
    });

    // 设置样式
    const style = document.createElement('style');
    if (!document.querySelector('#notification-dropdown-style')) {
      style.id = 'notification-dropdown-style';
      style.textContent = `
        .notification-dropdown {
          position: fixed;
          top: 60px;
          right: 20px;
          width: 320px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 1000;
          overflow: hidden;
        }
        
        .dropdown-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 12px 16px;
          border-bottom: 1px solid #e1e4e8;
          font-weight: 600;
        }
        
        .dropdown-header .view-all {
          font-size: 12px;
          color: var(--primary-color);
          text-decoration: none;
        }
        
        .dropdown-notification-list {
          max-height: 320px;
          overflow-y: auto;
        }
        
        .dropdown-notification-item {
          display: flex;
          padding: 12px 16px;
          border-bottom: 1px solid #f0f0f0;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .dropdown-notification-item:hover {
          background-color: #f6f8fa;
        }
        
        .dropdown-notification-item.unread {
          background-color: #f0f7ff;
        }
        
        .dropdown-notification-item .notification-icon {
          margin-right: 12px;
          font-size: 16px;
          color: var(--primary-color);
        }
        
        .dropdown-notification-item .notification-content {
          flex: 1;
        }
        
        .dropdown-notification-item .notification-text {
          margin: 0 0 4px 0;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .dropdown-notification-item .notification-time {
          font-size: 12px;
          color: #6c757d;
        }
        
        .dropdown-footer {
          padding: 8px 16px;
          border-top: 1px solid #e1e4e8;
          text-align: center;
        }
        
        .dropdown-footer button {
          background: none;
          border: none;
          color: var(--primary-color);
          font-size: 14px;
          cursor: pointer;
          padding: 4px 8px;
        }
        
        .dropdown-footer button:hover {
          text-decoration: underline;
        }
        
        .empty-notification {
          padding: 24px 16px;
          text-align: center;
          color: #6c757d;
          font-style: italic;
        }
      `;
      document.head.appendChild(style);
    }

    // 添加到文档中
    document.body.appendChild(dropdown);

    // 点击文档其他地方关闭下拉菜单
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && !notificationIcon.contains(e.target)) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
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
      default:
        return 'icon-bell';
    }
  }

  /**
   * 导航到通知相关页面
   * @param {Object} notification 通知对象
   */
  function navigateToNotificationTarget(notification) {
    // 如果没有关联ID，跳转到通知中心
    if (!notification.relatedId) {
      window.location.href = 'notifications.html';
      return;
    }

    // 根据通知类型跳转到相应页面
    switch (notification.type) {
      case 'task_assigned':
      case 'task_comment':
        window.location.href = `task-details.html?id=${notification.relatedId}`;
        break;
      case 'team_invite':
      case 'team_remove':
        window.location.href = `team-details.html?id=${notification.relatedId}`;
        break;
      default:
        window.location.href = 'notifications.html';
    }
  }

  /**
   * 标记所有通知为已读
   */
  function markAllAsRead() {
    // 如果没有未读通知，则不执行操作
    if (unreadCount === 0) {
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
        // 更新通知状态
        notifications.forEach(notification => {
          notification.isRead = true;
        });

        // 更新未读通知数量
        unreadCount = 0;
        updateUnreadBadge(0);

        // 关闭下拉菜单
        const dropdown = document.querySelector('.notification-dropdown');
        if (dropdown) {
          dropdown.remove();
        }

        // 显示成功消息
        showNotification('所有通知已标记为已读', 'success');
      })
      .catch(error => {
        console.error('标记所有通知失败:', error);
        showNotification('标记通知失败，请稍后再试', 'error');
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
   * 显示通知提示
   * @param {string} message 消息内容
   * @param {string} type 通知类型 ('success', 'error', 'info')
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