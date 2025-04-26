document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const tasksList = document.getElementById('tasksList');
  const createTaskBtn = document.getElementById('createTaskBtn');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');

  // 过滤器元素
  const taskViewSelect = document.getElementById('taskView');
  const taskStatusSelect = document.getElementById('taskStatus');
  const taskPrioritySelect = document.getElementById('taskPriority');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 任务列表数据和过滤设置
  let allTasks = [];
  let filteredTasks = [];
  let filterSettings = {
    view: 'all',
    status: 'all',
    priority: 'all'
  };

  // 初始加载
  loadTasks();

  // 绑定创建任务按钮事件 - 直接跳转到团队管理页面
  createTaskBtn.addEventListener('click', function () {
    // 无论是否有团队，都跳转到团队管理页面
    window.location.href = 'teams.html';
  });

  // 绑定过滤器变更事件
  taskViewSelect.addEventListener('change', updateFilter);
  taskStatusSelect.addEventListener('change', updateFilter);
  taskPrioritySelect.addEventListener('change', updateFilter);

  // 点击模态框外部关闭模态框
  window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
      closeAllModals();
    }
  });

  /**
   * 加载任务列表
   */
  function loadTasks() {
    tasksList.innerHTML = '<div class="team-loading">加载中...</div>';

    fetch(`${API_BASE_URL}/api/tasks/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取任务列表失败');
        }
        return response.json();
      })
      .then(data => {
        console.log('加载的任务:', data);
        allTasks = data.data;

        // 应用过滤器并渲染
        applyFilters();
      })
      .catch(error => {
        console.error('加载任务失败:', error);
        tasksList.innerHTML = `<div class="error-message">加载任务失败: ${error.message}</div>`;
      });
  }

  /**
   * 更新过滤设置
   */
  function updateFilter() {
    filterSettings.view = taskViewSelect.value;
    filterSettings.status = taskStatusSelect.value;
    filterSettings.priority = taskPrioritySelect.value;

    applyFilters();
  }

  /**
   * 应用过滤器
   */
  function applyFilters() {
    // 首先按视图类型过滤
    if (filterSettings.view === 'assigned') {
      filteredTasks = allTasks.filter(task => task.assignedTo === currentUser.id);
    } else if (filterSettings.view === 'created') {
      filteredTasks = allTasks.filter(task => task.createdBy === currentUser.id);
    } else {
      filteredTasks = [...allTasks];
    }

    // 按状态过滤
    if (filterSettings.status !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.status === filterSettings.status);
    }

    // 按优先级过滤
    if (filterSettings.priority !== 'all') {
      filteredTasks = filteredTasks.filter(task => task.priority === filterSettings.priority);
    }

    // 渲染过滤后的任务
    renderTasks();
  }

  /**
   * 渲染任务列表
   */
  function renderTasks() {
    if (filteredTasks.length === 0) {
      tasksList.innerHTML = '<div class="empty-message">没有找到符合条件的任务</div>';
      return;
    }

    tasksList.innerHTML = '';

    filteredTasks.forEach(task => {
      // 状态类名
      const statusClass = `status-${task.status}`;

      // 优先级类名和文本
      const priorityClass = `priority-${task.priority}`;
      const priorityText = task.priority === 'high' ? '高' : (task.priority === 'medium' ? '中' : '低');

      // 截止日期处理
      let deadlineText = '无截止日期';
      let deadlineClass = '';

      if (task.deadline) {
        const deadlineDate = new Date(task.deadline);
        const now = new Date();

        // 格式化日期时间
        deadlineText = `截止: ${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        // 如果已过期，添加过期样式
        if (deadlineDate < now && task.status !== 'completed') {
          deadlineClass = 'expired-deadline';
        }
      }

      const taskItem = document.createElement('div');
      taskItem.className = 'task-item';
      taskItem.innerHTML = `
        <div class="task-status-indicator ${statusClass}"></div>
        <div class="task-main-content">
          <h4 class="task-title"><a href="task-details.html?id=${task.id}">${task.title}</a></h4>
          <p class="task-description">${task.description || '无描述'}</p>
          <div class="task-team">团队: ${task.teamName || '加载中...'}</div>
        </div>
        <div class="task-meta">
          <div class="task-priority ${priorityClass}">${priorityText}</div>
          <div class="task-assignee" id="assignee-${task.id}">
            ${task.assignedTo ? '加载中...' : '未分配'}
          </div>
          <div class="task-deadline ${deadlineClass}">${deadlineText}</div>
        </div>
      `;

      tasksList.appendChild(taskItem);

      // 加载团队名和负责人信息
      loadTaskAdditionalInfo(task);
    });
  }

  /**
   * 加载任务的额外信息（团队名和负责人）
   * @param {Object} task 任务对象
   */
  function loadTaskAdditionalInfo(task) {
    // 加载团队信息
    if (task.teamId) {
      fetch(`${API_BASE_URL}/api/teams/${task.teamId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => response.json())
        .then(data => {
          if (data.success) {
            // 更新任务中的团队名
            const teamElements = document.querySelectorAll(`.task-main-content .task-team`);
            teamElements.forEach(element => {
              if (element.textContent.includes('加载中...')) {
                element.textContent = `团队: ${data.data.name}`;
              }
            });
          }
        })
        .catch(error => console.error('加载团队信息失败:', error));
    }

    // 加载负责人信息 - 修复的部分
    if (task.assignedTo) {
      // 修复：使用正确的API端点获取用户信息
      fetch(`${API_BASE_URL}/api/tasks/${task.id}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      })
        .then(response => {
          if (!response.ok) {
            throw new Error('获取任务信息失败');
          }
          return response.json();
        })
        .then(data => {
          if (data.success && data.data && data.data.assignee) {
            const assigneeElement = document.getElementById(`assignee-${task.id}`);
            if (assigneeElement) {
              // 设置头像URL
              let avatarUrl = data.data.assignee.avatar;
              if (avatarUrl && !avatarUrl.startsWith('http')) {
                if (!avatarUrl.startsWith('/')) {
                  avatarUrl = '/' + avatarUrl;
                }
                avatarUrl = API_BASE_URL + avatarUrl;
              }

              // 兜底处理，防止头像路径为空
              if (!avatarUrl) {
                avatarUrl = 'images/default-avatar.png';
              }

              assigneeElement.innerHTML = `
                <img src="${avatarUrl}" alt="${data.data.assignee.username}" onerror="this.src='images/default-avatar.png'">
                <span>${data.data.assignee.username}</span>
              `;
            }
          } else {
            // 没有获取到负责人详细信息，但确实有指派人ID的情况
            const assigneeElement = document.getElementById(`assignee-${task.id}`);
            if (assigneeElement) {
              assigneeElement.innerHTML = `已分配 (ID: ${task.assignedTo})`;
            }
          }
        })
        .catch(error => {
          console.error('加载负责人信息失败:', error);
          // 错误时显示一个基本的提示
          const assigneeElement = document.getElementById(`assignee-${task.id}`);
          if (assigneeElement) {
            assigneeElement.innerHTML = `已分配`;
          }
        });
    }
  }

  /**
   * 关闭所有模态框
   */
  function closeAllModals() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
      modal.style.display = 'none';
    });
  }

  /**
   * 显示通知
   * @param {string} message 通知消息
   * @param {string} type 通知类型 (success, error, info)
   */
  function showNotification(message, type = 'info') {
    // 检查是否已存在通知元素
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    // 设置通知样式
    notification.className = `notification ${type}`;
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
});