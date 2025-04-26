// notification-handler.js
// 实时通知处理器，处理通知的轮询和显示 好像没实现啊

class NotificationHandler {
  constructor() {
    this.token = localStorage.getItem('token');
    this.notifications = [];
    this.unreadCount = 0;
    this.lastCheckTime = new Date();
    this.pollingInterval = null;
    this.callbacks = {
      onNewNotification: [],
      onCountUpdated: []
    };

    // 初始化
    this.init();
  }

  /**
   * 初始化通知处理器
   */
  init() {
    if (!this.token) return;

    // 获取初始通知
    this.fetchNotifications();

    // 设置轮询间隔
    this.startPolling(30000); // 每30秒轮询一次
  }

  /**
   * 开始轮询通知
   * @param {number} interval 轮询间隔（毫秒）
   */
  startPolling(interval) {
    // 清除之前的轮询
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
    }

    // 设置新的轮询
    this.pollingInterval = setInterval(() => {
      this.checkNewNotifications();
    }, interval);
  }

  /**
   * 停止轮询
   */
  stopPolling() {
    if (this.pollingInterval) {
      clearInterval(this.pollingInterval);
      this.pollingInterval = null;
    }
  }

  /**
   * 获取所有通知
   */
  fetchNotifications() {
    if (!this.token) return Promise.reject('未登录');

    return fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 处理通知中的undefined
        this.notifications = data.data.map(notification => {
          if (notification.content && notification.content.includes('undefined')) {
            notification.content = notification.content.replace(/undefined/g, '有用户');
          }
          return notification;
        });

        this.unreadCount = data.unreadCount;

        // 触发计数更新回调
        this.triggerCallback('onCountUpdated', this.unreadCount);

        return data;
      })
      .catch(error => {
        console.error('获取通知失败:', error);
        return { data: [], unreadCount: 0 };
      });
  }

  /**
   * 检查新通知
   */
  checkNewNotifications() {
    if (!this.token) return;

    fetch(`${API_BASE_URL}/api/notifications`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 更新未读计数
        const prevUnreadCount = this.unreadCount;
        this.unreadCount = data.unreadCount;

        // 处理通知中的undefined
        data.data = data.data.map(notification => {
          if (notification.content && notification.content.includes('undefined')) {
            notification.content = notification.content.replace(/undefined/g, '有用户');
          }
          return notification;
        });

        // 检查是否有新通知
        if (data.unreadCount > prevUnreadCount) {
          // 查找新通知
          const newNotifications = data.data.filter(newNote => {
            return !this.notifications.some(oldNote => oldNote.id === newNote.id);
          });

          // 如果有新通知
          if (newNotifications.length > 0) {
            // 更新通知列表
            this.notifications = data.data;

            // 显示新通知提醒
            newNotifications.forEach(notification => {
              this.showNotificationAlert(notification);

              // 触发新通知回调
              this.triggerCallback('onNewNotification', notification);
            });
          }
        }

        // 更新通知列表
        this.notifications = data.data;

        // 触发计数更新回调
        if (this.unreadCount !== prevUnreadCount) {
          this.triggerCallback('onCountUpdated', this.unreadCount);
        }
      })
      .catch(error => {
        console.error('检查新通知失败:', error);
      });
  }

  /**
   * 标记所有通知为已读
   */
  markAllAsRead() {
    if (!this.token) return Promise.reject('未登录');

    return fetch(`${API_BASE_URL}/api/notifications/read-all`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`
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
        this.notifications.forEach(notification => {
          notification.isRead = true;
        });

        // 更新未读计数
        const prevUnreadCount = this.unreadCount;
        this.unreadCount = 0;

        // 触发计数更新回调
        if (prevUnreadCount !== 0) {
          this.triggerCallback('onCountUpdated', 0);
        }

        return data;
      })
      .catch(error => {
        console.error('标记所有通知失败:', error);
        throw error;
      });
  }

  /**
   * 标记单个通知为已读
   * @param {number} notificationId 通知ID
   */
  markAsRead(notificationId) {
    if (!this.token) return Promise.reject('未登录');

    return fetch(`${API_BASE_URL}/api/notifications/${notificationId}/read`, {
      method: 'PUT',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('标记通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 更新通知状态
        const notification = this.notifications.find(n => n.id == notificationId);
        if (notification && !notification.isRead) {
          notification.isRead = true;

          // 更新未读计数
          this.unreadCount = Math.max(0, this.unreadCount - 1);

          // 触发计数更新回调
          this.triggerCallback('onCountUpdated', this.unreadCount);
        }

        return data;
      })
      .catch(error => {
        console.error('标记通知失败:', error);
        throw error;
      });
  }

  /**
   * 删除通知
   * @param {number} notificationId 通知ID
   */
  deleteNotification(notificationId) {
    if (!this.token) return Promise.reject('未登录');

    return fetch(`${API_BASE_URL}/api/notifications/${notificationId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${this.token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('删除通知失败');
        }
        return response.json();
      })
      .then(data => {
        // 查找被删除的通知
        const index = this.notifications.findIndex(n => n.id == notificationId);

        if (index !== -1) {
          // 检查被删除的通知是否未读
          const wasUnread = !this.notifications[index].isRead;

          // 从数组中删除通知
          this.notifications.splice(index, 1);

          // 如果删除的是未读通知，更新未读计数
          if (wasUnread) {
            this.unreadCount = Math.max(0, this.unreadCount - 1);

            // 触发计数更新回调
            this.triggerCallback('onCountUpdated', this.unreadCount);
          }
        }

        return data;
      })
      .catch(error => {
        console.error('删除通知失败:', error);
        throw error;
      });
  }

  /**
   * 显示通知提醒
   * @param {Object} notification 通知对象
   */
  showNotificationAlert(notification) {
    // 处理通知内容 - 修复缺少用户名的问题
    let messageContent = notification.content;

    // 如果内容中包含"undefined"，替换为"有用户"
    if (messageContent && messageContent.includes('undefined')) {
      messageContent = messageContent.replace(/undefined/g, '有用户');
    }

    // 创建通知提醒元素
    const alert = document.createElement('div');
    alert.className = 'notification-alert';

    // 获取通知类型图标
    const typeIconClass = this.getNotificationTypeIcon(notification.type);

    // 设置内容
    alert.innerHTML = `
      <div class="notification-alert-icon">
        <i class="${typeIconClass}"></i>
      </div>
      <div class="notification-alert-content">
        <h4>新通知</h4>
        <p>${messageContent}</p>
      </div>
      <button class="notification-alert-close">×</button>
    `;

    // 添加样式
    const style = document.createElement('style');
    if (!document.querySelector('#notification-alert-style')) {
      style.id = 'notification-alert-style';
      style.textContent = `
        .notification-alert {
          position: fixed;
          top: 20px;
          right: 20px;
          width: 300px;
          background-color: white;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          z-index: 9999;
          display: flex;
          padding: 15px;
          animation: slideIn 0.3s ease-out forwards;
          border-left: 4px solid var(--primary-color);
        }
        
        @keyframes slideIn {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        
        @keyframes fadeOut {
          from {
            transform: translateX(0);
            opacity: 1;
          }
          to {
            transform: translateX(100%);
            opacity: 0;
          }
        }
        
        .notification-alert-icon {
          margin-right: 12px;
          font-size: 20px;
          color: var(--primary-color);
        }
        
        .notification-alert-content {
          flex: 1;
        }
        
        .notification-alert-content h4 {
          margin: 0 0 4px 0;
          font-size: 15px;
          font-weight: 600;
        }
        
        .notification-alert-content p {
          margin: 0;
          font-size: 14px;
          line-height: 1.4;
        }
        
        .notification-alert-close {
          background: none;
          border: none;
          font-size: 18px;
          color: #888;
          cursor: pointer;
          padding: 0 5px;
        }
      `;
      document.head.appendChild(style);
    }

    // 添加到文档中
    document.body.appendChild(alert);

    // 添加点击事件（点击通知跳转到相关页面）
    alert.addEventListener('click', (e) => {
      if (!e.target.classList.contains('notification-alert-close')) {
        this.navigateToNotificationTarget(notification);
        alert.remove();
      }
    });

    // 添加关闭按钮事件
    alert.querySelector('.notification-alert-close').addEventListener('click', (e) => {
      e.stopPropagation();
      alert.style.animation = 'fadeOut 0.3s ease-out forwards';
      setTimeout(() => {
        alert.remove();
      }, 300);
    });

    // 5秒后自动消失
    setTimeout(() => {
      if (document.body.contains(alert)) {
        alert.style.animation = 'fadeOut 0.3s ease-out forwards';
        setTimeout(() => {
          if (document.body.contains(alert)) {
            alert.remove();
          }
        }, 300);
      }
    }, 5000);
  }

  /**
   * 导航到通知相关页面
   * @param {Object} notification 通知对象
   */
  navigateToNotificationTarget(notification) {
    // 如果没有关联ID，跳转到通知中心
    if (!notification.relatedId) {
      window.location.href = 'notifications.html';
      return;
    }

    // 根据通知类型跳转到相应页面
    switch (notification.type) {
      case 'task_assigned':
      case 'task_comment':
      case 'task_dependency':
      case 'task_dependent':
      case 'task_status':
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
   * 获取通知类型对应的图标类名
   * @param {string} type 通知类型
   * @returns {string} 图标类名
   */
  getNotificationTypeIcon(type) {
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
   * 注册回调函数
   * @param {string} event 事件名 ('onNewNotification' | 'onCountUpdated')
   * @param {Function} callback 回调函数
   */
  on(event, callback) {
    if (this.callbacks[event]) {
      this.callbacks[event].push(callback);
    }
  }

  /**
   * 触发回调函数
   * @param {string} event 事件名
   * @param {*} data 数据
   */
  triggerCallback(event, data) {
    if (this.callbacks[event]) {
      this.callbacks[event].forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`执行${event}回调出错:`, error);
        }
      });
    }
  }
}

// 创建全局通知处理器实例
window.notificationHandler = new NotificationHandler();

// 页面关闭时停止轮询
window.addEventListener('beforeunload', function () {
  if (window.notificationHandler) {
    window.notificationHandler.stopPolling();
  }
});