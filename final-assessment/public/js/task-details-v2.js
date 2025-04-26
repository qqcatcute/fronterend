document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const taskTitleElem = document.getElementById('taskTitle');
  const taskInfoElem = document.getElementById('taskInfo');
  const taskActionsElem = document.getElementById('taskActions');
  const commentsListElem = document.getElementById('commentsList');
  const taskHistoryElem = document.getElementById('taskHistory');
  const addCommentForm = document.getElementById('addCommentForm');
  const currentBranchInfo = document.getElementById('currentBranchInfo');
  const branchManagementLink = document.getElementById('branchManagementLink');
  const mergeRequestsLink = document.getElementById('mergeRequestsLink');

  // 编辑任务相关元素
  const editTaskForm = document.getElementById('editTaskForm');

  // 从URL参数获取任务ID
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');

  // 检查任务ID是否存在
  if (!taskId) {
    window.location.href = 'tasks.html';
    return;
  }

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 当前登录用户数据
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 存储任务信息和团队成员
  let taskData = null;
  let teamMembers = [];
  let branches = [];

  // 设置链接
  branchManagementLink.href = `branch-management.html?taskId=${taskId}`;
  mergeRequestsLink.href = `merge-requests.html?taskId=${taskId}`;

  // 加载任务详情
  loadTaskDetails();

  // 绑定表单提交事件
  if (addCommentForm) {
    addCommentForm.addEventListener('submit', addComment);
  }

  // 绑定编辑任务表单提交事件
  if (editTaskForm) {
    editTaskForm.addEventListener('submit', updateTaskInfo);
  }

  /**
   * 判断是否可以更新状态
   */
  function canUpdateStatus(task) {
    return task.createdBy === currentUser.id ||
      task.assignedTo === currentUser.id ||
      currentUser.role === 'admin';
  }

  /**
   * 更新任务状态
   */
  async function updateTaskStatus(newStatus) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ status: newStatus })
      });

      const data = await response.json();

      if (response.ok && data.success) {
        showNotification('任务状态更新成功', 'success');
        loadTaskDetails();
      } else {
        showNotification(data.message || '更新任务状态失败', 'error');
      }
    } catch (error) {
      console.error('更新任务状态失败:', error);
      showNotification('更新任务状态失败', 'error');
    }
  }

  /**
   * 标准化头像URL处理
   */
  function getAvatarUrl(avatarPath) {
    if (!avatarPath) {
      return 'images/default-avatar.png';
    }
    if (avatarPath.startsWith('http')) {
      return avatarPath;
    }
    return avatarPath.startsWith('/')
      ? API_BASE_URL + avatarPath
      : API_BASE_URL + '/' + avatarPath;
  }

  /**
   * 加载任务详情
   */
  function loadTaskDetails() {
    taskInfoElem.innerHTML = '<div class="team-loading">加载中...</div>';
    commentsListElem.innerHTML = '<div class="team-loading">加载中...</div>';
    taskHistoryElem.innerHTML = '<div class="team-loading">加载中...</div>';

    fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json()
            .then(errorData => {
              throw new Error(errorData.message || '获取任务详情失败');
            })
            .catch(jsonError => {
              throw new Error(`获取任务详情失败 (HTTP ${response.status})`);
            });
        }
        return response.json();
      })
      .then(data => {
        if (!data || !data.data) {
          throw new Error('服务器返回的数据格式不正确');
        }

        taskData = data.data;
        // 添加日志帮助调试
        console.log('任务数据:', taskData);
        console.log('负责人信息:', taskData.assignee);
        console.log('负责人ID:', taskData.assignedTo);

        document.title = `${taskData.title} - 任务详情 - QG团队协作平台`;
        taskTitleElem.textContent = taskData.title;

        renderTaskInfo();
        renderComments();
        renderTaskHistory();
        renderActionButtons();

        // 加载版本控制相关信息
        loadVersionControlInfo();
        loadTeamMembers();
      })
      .catch(error => {
        console.error('加载任务详情失败:', error);
        taskInfoElem.innerHTML = `<div class="error-message">加载任务详情失败: ${error.message}</div>`;
        showNotification('加载任务详情失败，请刷新页面重试', 'error');
      });
  }

  /**
   * 加载版本控制信息
   */
  function loadVersionControlInfo() {
    // 获取任务的分支信息
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        branches = data.data;
        renderCurrentBranchInfo();
      })
      .catch(error => {
        console.error('加载分支信息失败:', error);
      });
  }

  /**
   * 渲染当前分支信息
   */
  function renderCurrentBranchInfo() {
    if (branches.length === 0) {
      currentBranchInfo.innerHTML = `
        <div class="empty-message">
          暂无分支，<a href="branch-management.html?taskId=${taskId}">立即创建</a>
        </div>
      `;
      return;
    }

    const defaultBranch = branches.find(branch => branch.isDefault);
    const activeBranch = defaultBranch || branches[0];

    // 获取分支的提交数量
    fetch(`${API_BASE_URL}/api/branches/${activeBranch.id}/commits`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        const commits = data.data;
        const latestCommit = commits.length > 0 ? commits[0] : null;

        currentBranchInfo.innerHTML = `
          <div class="branch-summary">
            <div class="branch-summary-header">
              <h4>当前分支: ${activeBranch.name}</h4>
              ${activeBranch.isDefault ? '<span class="badge">默认</span>' : ''}
            </div>
            <div class="branch-summary-meta">
              <div class="meta-item">
                <span class="meta-label">分支总数:</span>
                <span class="meta-value">${branches.length}</span>
              </div>
              <div class="meta-item">
                <span class="meta-label">提交次数:</span>
                <span class="meta-value">${commits.length}</span>
              </div>
              ${latestCommit ? `
                <div class="meta-item">
                  <span class="meta-label">最新提交:</span>
                  <span class="meta-value">${latestCommit.title}</span>
                </div>
              ` : ''}
            </div>
            <div class="branch-summary-actions">
              <a href="commit-history.html?taskId=${taskId}&branchId=${activeBranch.id}" 
                 class="btn btn-sm btn-primary">
                查看提交历史
              </a>
            </div>
          </div>
        `;
      })
      .catch(error => {
        console.error('加载分支提交信息失败:', error);
      });
  }

  /**
   * 渲染任务详情
   */
  function renderTaskInfo() {
    if (!taskData) {
      taskInfoElem.innerHTML = '<div class="error-message">无法加载任务信息</div>';
      return;
    }

    const priority = taskData.priority || 'medium';
    const priorityText = priority === 'high' ? '高' :
      (priority === 'medium' ? '中' : '低');

    const status = taskData.status || 'pending';
    const statusText = status === 'pending' ? '待处理' :
      (status === 'in_progress' ? '进行中' : '已完成');

    const statusClass = `status-${status}`;
    const priorityClass = `priority-${priority}`;

    let deadlineText = '无截止日期';
    let deadlineClass = '';

    if (taskData.deadline) {
      try {
        const deadlineDate = new Date(taskData.deadline);
        const now = new Date();

        deadlineText = `${deadlineDate.toLocaleDateString()} ${deadlineDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;

        if (deadlineDate < now && status !== 'completed') {
          deadlineClass = 'expired-deadline';
        }
      } catch (e) {
        console.error('日期格式化错误:', e);
        deadlineText = '日期格式错误';
      }
    }

    let createdDate = '未知日期';
    let createdTime = '';

    if (taskData.createdAt) {
      try {
        const createdAtDate = new Date(taskData.createdAt);
        createdDate = createdAtDate.toLocaleDateString();
        createdTime = createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      } catch (e) {
        console.error('创建日期格式化错误:', e);
      }
    }

    const creatorName = taskData.creator && taskData.creator.username ? taskData.creator.username : '未知';

    // 改进负责人显示逻辑
    let assigneeName = '未分配';
    if (taskData.assignee && taskData.assignee.username) {
      assigneeName = taskData.assignee.username;
    } else if (taskData.assignedToUsername) {
      assigneeName = taskData.assignedToUsername;
    } else if (taskData.assignedTo) {
      // 如果只有ID但没有用户名，尝试从teamMembers中查找
      const assignee = teamMembers.find(member => member.id == taskData.assignedTo);
      if (assignee) {
        assigneeName = assignee.username;
      }
    }

    const html = `
      <div class="task-info-header">
        <h3 class="task-title">${taskData.title || '未命名任务'}</h3>
        <div class="task-status ${statusClass}">${statusText}</div>
      </div>
      
      <div class="task-info-meta">
        <div class="meta-item">
          <span class="meta-label">当前状态:</span>
          <span class="status ${statusClass}">${statusText}</span>
          ${canUpdateStatus(taskData) ? `
            <select id="statusSelect" class="inline-select">
              <option value="pending" ${status === 'pending' ? 'selected' : ''}>待处理</option>
              <option value="in_progress" ${status === 'in_progress' ? 'selected' : ''}>进行中</option>
              <option value="completed" ${status === 'completed' ? 'selected' : ''}>已完成</option>
            </select>
            <button class="btn btn-small btn-primary" id="updateStatusBtn">更新状态</button>
          ` : ''}
        </div>
        
        <div class="meta-item">
          <span class="meta-label">优先级:</span>
          <span class="task-priority ${priorityClass}">${priorityText}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-label">创建者:</span>
          <span class="creator-name">${creatorName}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-label">负责人:</span>
          <span class="assignee-name">${assigneeName}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-label">截止日期:</span>
          <span class="task-deadline ${deadlineClass}">${deadlineText}</span>
        </div>
        
        <div class="meta-item">
          <span class="meta-label">创建时间:</span>
          <span>${createdDate} ${createdTime}</span>
        </div>
        
        <!-- 添加编辑按钮 -->
        <div class="meta-item task-actions">
          <button class="btn btn-sm btn-secondary edit-task-btn">编辑任务</button>
        </div>
      </div>
    `;

    taskInfoElem.innerHTML = html;

    // 添加状态更新事件监听
    if (canUpdateStatus(taskData)) {
      const updateStatusBtn = document.getElementById('updateStatusBtn');
      if (updateStatusBtn) {
        updateStatusBtn.addEventListener('click', () => {
          const statusSelect = document.getElementById('statusSelect');
          if (statusSelect) {
            updateTaskStatus(statusSelect.value);
          }
        });
      }
    }

    // 绑定编辑按钮事件
    bindEditTaskButton();
  }

  /**
   * 渲染评论列表
   */
  function renderComments() {
    if (!taskData) {
      commentsListElem.innerHTML = '<div class="error-message">无法加载评论数据</div>';
      return;
    }

    const comments = taskData.comments || [];

    if (comments.length === 0) {
      commentsListElem.innerHTML = '<div class="empty-message">暂无评论，成为第一个发表评论的人吧！</div>';
      return;
    }

    commentsListElem.innerHTML = '';

    comments.forEach(comment => {
      if (!comment) return;

      const avatarUrl = getAvatarUrl(comment.avatar);

      let formattedDate = '未知时间';
      if (comment.createdAt) {
        try {
          const commentDate = new Date(comment.createdAt);
          formattedDate = `${commentDate.toLocaleDateString()} ${commentDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
          console.error('评论日期格式化错误:', e);
        }
      }

      const commentItem = document.createElement('div');
      commentItem.className = 'comment-item';
      commentItem.innerHTML = `
        <img src="${avatarUrl}" alt="${comment.username || '未知用户'}" class="comment-avatar" onerror="this.src='images/default-avatar.png'">
        <div class="comment-content">
          <div class="comment-header">
            <span class="comment-user">${comment.username || '未知用户'}</span>
            <span class="comment-time">${formattedDate}</span>
          </div>
          <div class="comment-text">${comment.content || ''}</div>
        </div>
      `;

      commentsListElem.appendChild(commentItem);
    });
  }

  /**
   * 渲染任务历史
   */
  function renderTaskHistory() {
    if (!taskData) {
      taskHistoryElem.innerHTML = '<div class="error-message">无法加载历史记录数据</div>';
      return;
    }

    const history = taskData.history || [];

    if (history.length === 0) {
      taskHistoryElem.innerHTML = '<div class="empty-message">暂无历史记录</div>';
      return;
    }

    taskHistoryElem.innerHTML = '';

    // 对历史记录进行去重
    const uniqueHistory = [];
    const seen = new Set();

    history.forEach(item => {
      if (!item) return;

      const key = `${item.createdAt}-${item.userId}-${item.action}-${item.details}`;
      if (!seen.has(key)) {
        seen.add(key);
        uniqueHistory.push(item);
      }
    });

    uniqueHistory.forEach(item => {
      const avatarUrl = getAvatarUrl(item.avatar);

      let formattedDate = '未知时间';
      if (item.createdAt) {
        try {
          const historyDate = new Date(item.createdAt);
          formattedDate = `${historyDate.toLocaleDateString()} ${historyDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
        } catch (e) {
          console.error('历史记录日期格式化错误:', e);
        }
      }

      const historyItem = document.createElement('div');
      historyItem.className = 'history-item';
      historyItem.innerHTML = `
        <img src="${avatarUrl}" alt="${item.username || '未知用户'}" class="history-avatar" onerror="this.src='images/default-avatar.png'">
        <div class="history-content">
          <div class="history-text"><strong>${item.username || '未知用户'}</strong> ${item.details || '进行了操作'}</div>
          <div class="history-time">${formattedDate}</div>
        </div>
      `;

      taskHistoryElem.appendChild(historyItem);
    });
  }

  /**
   * 加载团队成员
   */
  function loadTeamMembers() {
    if (!taskData || !taskData.teamId) {
      console.error('任务数据不存在或无团队ID');
      return;
    }

    fetch(`${API_BASE_URL}/api/teams/${taskData.teamId}/members`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取团队成员失败');
        }
        return response.json();
      })
      .then(data => {
        if (data && data.data) {
          teamMembers = data.data;
          // 更新任务信息，确保负责人名称正确显示
          renderTaskInfo();
        } else {
          console.error('获取团队成员数据格式不正确');
        }
      })
      .catch(error => {
        console.error('加载团队成员失败:', error);
      });
  }

  /**
   * 渲染任务操作按钮
   */
  function renderActionButtons() {
    taskActionsElem.innerHTML = '';

    const isCreator = taskData.createdBy === currentUser.id;

    if (isCreator) {
      const deleteButton = document.createElement('button');
      deleteButton.className = 'btn btn-danger';
      deleteButton.textContent = '删除任务';
      deleteButton.style.marginLeft = '10px';
      deleteButton.addEventListener('click', confirmDeleteTask);

      taskActionsElem.appendChild(deleteButton);
    }
  }

  /**
   * 确认删除任务
   */
  function confirmDeleteTask() {
    if (confirm('确定要删除此任务吗？此操作无法撤销。')) {
      deleteTask();
    }
  }

  /**
   * 删除任务
   */
  function deleteTask() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '删除任务失败');
          });
        }
        return response.json();
      })
      .then(data => {
        showNotification('任务已删除！', 'success');
        setTimeout(() => {
          window.location.href = 'tasks.html';
        }, 1000);
      })
      .catch(error => {
        console.error('删除任务失败:', error);
        showNotification(error.message || '删除任务失败，请稍后再试', 'error');
      });
  }

  /**
   * 添加评论
   */
  function addComment(e) {
    e.preventDefault();

    const commentContentElement = document.getElementById('commentContent');
    if (!commentContentElement) {
      showNotification('无法获取评论内容元素', 'error');
      return;
    }

    const commentContent = commentContentElement.value.trim();
    if (!commentContent) {
      showNotification('评论内容不能为空', 'error');
      return;
    }

    const submitBtn = addCommentForm.querySelector('button[type="submit"]');
    if (!submitBtn) {
      showNotification('无法获取提交按钮', 'error');
      return;
    }

    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '发送中...';

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/comments`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ content: commentContent })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '添加评论失败');
          }).catch(jsonError => {
            throw new Error(`添加评论失败 (HTTP ${response.status})`);
          });
        }
        return response.json();
      })
      .then(data => {
        document.getElementById('commentContent').value = '';
        showNotification('评论已添加！', 'success');
        loadTaskDetails();
      })
      .catch(error => {
        console.error('添加评论失败:', error);
        showNotification(error.message || '添加评论失败，请稍后再试', 'error');
      })
      .finally(() => {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      });
  }

  /**
   * 显示通知
   */
  function showNotification(message, type = 'info') {
    let notification = document.querySelector('.notification');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification';
      document.body.appendChild(notification);
    }

    notification.className = `notification ${type}`;
    notification.innerHTML = message;
    notification.style.display = 'block';

    notification.style.position = 'fixed';
    notification.style.top = '20px';
    notification.style.right = '20px';
    notification.style.padding = '12px 20px';
    notification.style.borderRadius = '4px';
    notification.style.zIndex = '9999';
    notification.style.maxWidth = '300px';
    notification.style.boxShadow = '0 3px 6px rgba(0, 0, 0, 0.16)';

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

    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  /**
   * 绑定编辑任务按钮事件
   */
  function bindEditTaskButton() {
    const editTaskBtn = document.querySelector('.edit-task-btn');
    if (editTaskBtn) {
      editTaskBtn.addEventListener('click', function () {
        openEditTaskModal();
      });
    }
  }

  /**
   * 打开编辑任务模态框
   */
  function openEditTaskModal() {
    // 填充表单数据
    document.getElementById('editTaskTitle').value = taskData.title || '';
    document.getElementById('editTaskDescription').value = taskData.description || '';
    document.getElementById('editTaskStatus').value = taskData.status || 'pending';
    document.getElementById('editTaskPriority').value = taskData.priority || 'medium';

    // 设置截止日期，如果有的话
    const deadlineInput = document.getElementById('editTaskDeadline');
    if (taskData.deadline) {
      const deadline = new Date(taskData.deadline);
      // 格式化为 yyyy-MM-ddThh:mm 格式
      const formattedDate = deadline.toISOString().slice(0, 16);
      deadlineInput.value = formattedDate;
    } else {
      deadlineInput.value = '';
    }

    // 加载并设置团队成员列表
    loadTeamMembersForEdit().then(() => {
      // 设置当前负责人，如果有的话
      if (taskData.assignedTo) {
        document.getElementById('editTaskAssignee').value = taskData.assignedTo;
      }

      // 显示模态框
      const editTaskModal = document.getElementById('editTaskModal');
      if (editTaskModal) {
        editTaskModal.style.display = 'block';
      }
    });
  }

  /**
   * 加载团队成员列表用于编辑任务
   */
  async function loadTeamMembersForEdit() {
    if (!taskData || !taskData.teamId) {
      console.error('任务数据不存在或无团队ID');
      return;
    }

    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/${taskData.teamId}/members`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        throw new Error('获取团队成员失败');
      }

      const data = await response.json();
      const members = data.data;

      // 填充负责人下拉列表
      const assigneeSelect = document.getElementById('editTaskAssignee');
      assigneeSelect.innerHTML = '<option value="">-- 无负责人 --</option>';

      members.forEach(member => {
        const option = document.createElement('option');
        option.value = member.id;
        option.textContent = member.username;
        assigneeSelect.appendChild(option);
      });

    } catch (error) {
      console.error('加载团队成员失败:', error);
      showNotification('加载团队成员失败', 'error');
    }
  }

  /**
   * 更新任务信息
   */
  async function updateTaskInfo(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(document.getElementById('editTaskForm'));
    const updateData = {
      title: formData.get('title'),
      description: formData.get('description'),
      status: formData.get('status'),
      priority: formData.get('priority'),
      deadline: formData.get('deadline') || null
    };

    // 处理负责人，允许设置为空
    const assignedTo = formData.get('assignedTo');
    updateData.assignedTo = assignedTo === '' ? null : assignedTo;

    try {
      // 禁用提交按钮
      const submitBtn = document.querySelector('#editTaskForm button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.disabled = true;
      submitBtn.textContent = '保存中...';

      const response = await fetch(`${API_BASE_URL}/api/tasks/${taskId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updateData)
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || '更新任务失败');
      }

      const data = await response.json();

      // 关闭模态框
      closeAllModals();

      // 显示成功提示
      showNotification('任务已更新', 'success');

      // 重新加载任务详情
      loadTaskDetails();
    } catch (error) {
      console.error('更新任务失败:', error);
      showNotification(error.message || '更新任务失败，请稍后再试', 'error');
    } finally {
      // 恢复提交按钮状态
      const submitBtn = document.querySelector('#editTaskForm button[type="submit"]');
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = '保存';
      }
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

  // 模态框关闭按钮事件
  document.querySelectorAll('.close-modal, .cancel-modal').forEach(button => {
    button.addEventListener('click', closeAllModals);
  });

  // 点击模态框外部关闭
  window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
      closeAllModals();
    }
  });
});