document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const teamNameElem = document.getElementById('teamName');
  const teamInfoElem = document.getElementById('teamInfo');
  const teamActionsElem = document.getElementById('teamActions');
  const memberActionsElem = document.getElementById('memberActions');
  const membersListElem = document.getElementById('membersList');
  const teamTasksElem = document.getElementById('teamTasks');
  const createTaskBtn = document.getElementById('createTaskBtn');

  // 模态框元素
  const addMemberModal = document.getElementById('addMemberModal');
  const addMemberForm = document.getElementById('addMemberForm');
  const editTeamModal = document.getElementById('editTeamModal');
  const editTeamForm = document.getElementById('editTeamForm');
  const createTaskModal = document.getElementById('createTaskModal');
  const createTaskForm = document.getElementById('createTaskForm');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');

  // 获取URL参数中的团队ID
  const urlParams = new URLSearchParams(window.location.search);
  const teamId = urlParams.get('id');

  // 检查是否有团队ID
  if (!teamId) {
    window.location.href = 'teams.html';
    return;
  }

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 当前登录用户的ID
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 存储团队信息和成员信息
  let teamData = null;
  let membersList = [];

  // 加载团队详情
  loadTeamDetails();

  // 绑定按钮事件
  createTaskBtn.addEventListener('click', function () {
    openModal(createTaskModal);
    loadMembersForTaskAssignment();
  });

  // 绑定表单提交事件
  addMemberForm.addEventListener('submit', addTeamMember);
  editTeamForm.addEventListener('submit', updateTeam);
  createTaskForm.addEventListener('submit', createTask);

  // 关闭模态框事件
  closeModalBtns.forEach(btn => {
    btn.addEventListener('click', function () {
      closeAllModals();
    });
  });

  // 点击模态框外部关闭模态框
  window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
      closeAllModals();
    }
  });

  /**
   * 加载团队详情
   */
  function loadTeamDetails() {
    teamInfoElem.innerHTML = '<div class="team-loading">加载中...</div>';
    membersListElem.innerHTML = '<div class="team-loading">加载中...</div>';
    teamTasksElem.innerHTML = '<div class="team-loading">加载中...</div>';

    fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取团队详情失败');
        }
        return response.json();
      })
      .then(data => {
        teamData = data.data;
        // 更新页面标题
        document.title = `${teamData.name} - 团队详情 - QG团队协作平台`;

        // 渲染团队信息
        renderTeamInfo();

        // 渲染成员列表
        renderTeamMembers();

        // 渲染团队任务
        loadTeamTasks();

        // 根据用户权限渲染操作按钮
        renderActionButtons();
      })
      .catch(error => {
        console.error('加载团队详情失败:', error);
        teamInfoElem.innerHTML = `<div class="error-message">加载团队详情失败: ${error.message}</div>`;
        showNotification(error.message || '加载团队详情失败', 'error');
      });
  }
  /**
   * 渲染团队信息
   */
  function renderTeamInfo() {
    // 设置团队名称
    teamNameElem.textContent = teamData.name;

    // 获取团队名称的首字母作为头像显示
    const firstLetter = teamData.name.charAt(0).toUpperCase();

    // 格式化创建时间
    const createdDate = new Date(teamData.createdAt).toLocaleDateString();

    // 渲染团队详情
    teamInfoElem.innerHTML = `
      <div class="team-info-header">
        <div class="team-avatar">${firstLetter}</div>
        <div class="team-details">
          <h3 class="team-name">${teamData.name}</h3>
          <div class="team-meta">
            创建于 ${createdDate} | 成员数量: ${teamData.members.length}
          </div>
        </div>
      </div>
      <div class="team-info-description">
        ${teamData.description || '暂无描述'}
      </div>
    `;
  }

  /**
   * 渲染团队成员列表
   */
  function renderTeamMembers() {
    membersList = teamData.members;

    if (membersList.length === 0) {
      membersListElem.innerHTML = '<div class="empty-message">暂无团队成员</div>';
      return;
    }

    membersListElem.innerHTML = '';
    membersList.forEach(member => {
      const memberCard = document.createElement('div');
      memberCard.className = 'member-card';

      // 设置头像URL，如果头像路径不以http开头，则添加API_BASE_URL前缀
      // 修正后的代码应该是这样的
      let avatarUrl = member.avatar;
      if (avatarUrl && !avatarUrl.startsWith('http')) {
        if (!avatarUrl.startsWith('/')) {
          avatarUrl = '/' + avatarUrl;
        }
        avatarUrl = API_BASE_URL + avatarUrl;
      }
      // 角色显示文字
      let roleText = '成员';
      let roleClass = '';

      if (member.role === 'owner') {
        roleText = '创建者';
        roleClass = 'owner-role';
      } else if (member.role === 'admin') {
        roleText = '管理员';
        roleClass = 'admin-role';
      }

      memberCard.innerHTML = `
        <img src="${avatarUrl}" alt="${member.username}" class="member-avatar">
        <div class="member-info">
          <h4 class="member-name">${member.username}</h4>
          <div class="member-role ${roleClass}">${roleText}</div>
        </div>
        <div class="member-actions" data-user-id="${member.id}">
          ${renderMemberActions(member)}
        </div>
      `;

      membersListElem.appendChild(memberCard);
    });

    // 绑定成员操作事件
    bindMemberActionEvents();
  }

  /**
   * 渲染成员操作按钮
   * @param {Object} member 成员对象
   * @returns {string} HTML字符串
   */
  function renderMemberActions(member) {
    // 如果是当前用户，不显示操作按钮
    if (member.id === currentUser.id) {
      return '';
    }

    // 根据当前用户角色和目标成员角色决定显示的操作
    const userRole = teamData.currentUserRole;

    // 只有owner可以管理admin，admin可以管理普通成员
    if (userRole === 'owner' || (userRole === 'admin' && member.role === 'member')) {
      return `<i class="icon-more" title="更多操作">⋮</i>`;
    }

    return '';
  }

  /**
   * 绑定成员操作事件
   */
  function bindMemberActionEvents() {
    const actionButtons = document.querySelectorAll('.member-actions .icon-more');

    actionButtons.forEach(btn => {
      btn.addEventListener('click', function (e) {
        e.stopPropagation();

        const userId = this.parentElement.dataset.userId;
        const member = membersList.find(m => m.id == userId);

        if (!member) return;

        // 创建下拉菜单
        showMemberActionsMenu(this, member);
      });
    });
  }
  /**
   * 显示成员操作下拉菜单
   * @param {Element} element 触发元素
   * @param {Object} member 成员对象
   */
  function showMemberActionsMenu(element, member) {
    // 移除已存在的菜单
    const existingMenu = document.querySelector('.member-dropdown');
    if (existingMenu) {
      existingMenu.remove();
    }

    // 创建下拉菜单
    const dropdown = document.createElement('div');
    dropdown.className = 'member-dropdown';

    // 根据当前用户角色和目标成员角色决定显示的操作
    const userRole = teamData.currentUserRole;
    let menuItems = '';

    if (userRole === 'owner') {
      if (member.role === 'member') {
        menuItems += `<li><a href="#" data-action="promote" data-user-id="${member.id}">设为管理员</a></li>`;
      } else if (member.role === 'admin') {
        menuItems += `<li><a href="#" data-action="demote" data-user-id="${member.id}">取消管理员</a></li>`;
      }
    }

    menuItems += `<li><a href="#" data-action="remove" data-user-id="${member.id}">移出团队</a></li>`;

    dropdown.innerHTML = `<ul>${menuItems}</ul>`;

    // 设置样式
    dropdown.style.position = 'absolute';
    dropdown.style.backgroundColor = 'white';
    dropdown.style.border = '1px solid #e1e4e8';
    dropdown.style.borderRadius = '4px';
    dropdown.style.boxShadow = '0 2px 5px rgba(0, 0, 0, 0.1)';
    dropdown.style.zIndex = '1000';
    dropdown.style.minWidth = '120px';

    // 添加下拉菜单样式
    const style = document.createElement('style');
    style.textContent = `
      .member-dropdown ul {
        list-style: none;
        padding: 0;
        margin: 0;
      }
      .member-dropdown li {
        padding: 0;
      }
      .member-dropdown a {
        display: block;
        padding: 8px 12px;
        text-decoration: none;
        color: #333;
        font-size: 14px;
      }
      .member-dropdown a:hover {
        background-color: #f6f8fa;
      }
    `;
    document.head.appendChild(style);

    // 添加到文档中
    document.body.appendChild(dropdown);

    // 定位下拉菜单
    const rect = element.getBoundingClientRect();
    dropdown.style.top = `${rect.bottom + window.scrollY}px`;
    dropdown.style.left = `${rect.left + window.scrollX - dropdown.offsetWidth + rect.width}px`;

    // 绑定下拉菜单事件
    dropdown.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', function (e) {
        e.preventDefault();

        const action = this.dataset.action;
        const userId = this.dataset.userId;

        if (action === 'promote') {
          updateMemberRole(userId, 'admin');
        } else if (action === 'demote') {
          updateMemberRole(userId, 'member');
        } else if (action === 'remove') {
          removeMember(userId);
        }

        // 关闭下拉菜单
        dropdown.remove();
      });
    });

    // 点击文档其他地方关闭下拉菜单
    document.addEventListener('click', function closeDropdown(e) {
      if (!dropdown.contains(e.target) && e.target !== element) {
        dropdown.remove();
        document.removeEventListener('click', closeDropdown);
      }
    });
  }

  /**
   * 根据用户权限渲染操作按钮
   */
  function renderActionButtons() {
    // 清空现有按钮
    teamActionsElem.innerHTML = '';
    memberActionsElem.innerHTML = '';

    const userRole = teamData.currentUserRole;

    // 团队操作按钮
    if (userRole === 'owner' || userRole === 'admin') {
      // 编辑团队按钮
      const editTeamBtn = document.createElement('button');
      editTeamBtn.className = 'btn btn-secondary';
      editTeamBtn.textContent = '编辑团队';
      editTeamBtn.addEventListener('click', function () {
        // 填充表单
        document.getElementById('editTeamName').value = teamData.name;
        document.getElementById('editTeamDescription').value = teamData.description || '';

        // 打开模态框
        openModal(editTeamModal);
      });

      teamActionsElem.appendChild(editTeamBtn);

      // 如果是创建者，显示删除团队按钮
      if (userRole === 'owner') {
        const deleteTeamBtn = document.createElement('button');
        deleteTeamBtn.className = 'btn btn-danger';
        deleteTeamBtn.textContent = '删除团队';
        deleteTeamBtn.style.marginLeft = '10px';
        deleteTeamBtn.addEventListener('click', confirmDeleteTeam);

        teamActionsElem.appendChild(deleteTeamBtn);
      }
    }

    // 成员操作按钮
    if (userRole === 'owner' || userRole === 'admin') {
      const addMemberBtn = document.createElement('button');
      addMemberBtn.className = 'btn btn-secondary';
      addMemberBtn.innerHTML = '添加成员';
      addMemberBtn.addEventListener('click', function () {
        openModal(addMemberModal);
      });

      memberActionsElem.appendChild(addMemberBtn);
    }
  }
  /**
   * 加载团队任务
   */
  function loadTeamTasks() {
    fetch(`${API_BASE_URL}/api/tasks/team/${teamId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取团队任务失败');
        }
        return response.json();
      })
      .then(data => {
        renderTeamTasks(data.data);
      })
      .catch(error => {
        console.error('加载团队任务失败:', error);
        teamTasksElem.innerHTML = `<div class="error-message">加载任务失败: ${error.message}</div>`;
      });
  }

  /**
   * 渲染团队任务列表
   * @param {Array} tasks 任务数组
   */
  function renderTeamTasks(tasks) {
    if (!tasks || tasks.length === 0) {
      teamTasksElem.innerHTML = '<div class="empty-message">暂无任务</div>';
      return;
    }

    const tasksList = document.createElement('div');
    tasksList.className = 'tasks-list';

    tasks.forEach(task => {
      // 状态类名
      const statusClass = `status-${task.status}`;

      // 优先级类名和文本
      const priorityClass = `priority-${task.priority}`;
      const priorityText = task.priority === 'high' ? '高' : (task.priority === 'medium' ? '中' : '低');

      // 状态文本
      const statusText = task.status === 'pending' ? '待处理' :
        (task.status === 'in_progress' ? '进行中' : '已完成');

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
          <div class="task-meta-info">
            <span class="task-status">状态: ${statusText}</span>
          </div>
        </div>
        <div class="task-meta">
          <div class="task-priority ${priorityClass}">${priorityText}</div>
          <div class="task-deadline ${deadlineClass}">${deadlineText}</div>
        </div>
      `;

      tasksList.appendChild(taskItem);
    });

    teamTasksElem.innerHTML = '';
    teamTasksElem.appendChild(tasksList);
  }

  /**
   * 添加团队成员
   * @param {Event} e 表单提交事件
   */
  function addTeamMember(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(addMemberForm);
    const memberData = {
      username: formData.get('username'),
      role: formData.get('role')
    };

    // 禁用提交按钮
    const submitBtn = addMemberForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '添加中...';

    // 发送添加成员请求
    fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(memberData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '添加成员失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 添加成功，关闭模态框并重新加载团队详情
        closeAllModals();
        addMemberForm.reset();

        // 显示成功消息
        showNotification('成员添加成功！', 'success');

        // 重新加载团队详情
        loadTeamDetails();
      })
      .catch(error => {
        console.error('添加成员失败:', error);
        showNotification(error.message || '添加成员失败，请稍后再试', 'error');
      })
      .finally(() => {
        // 恢复提交按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      });
  }
  /**
   * 更新成员角色
   * @param {string} userId 用户ID
   * @param {string} role 角色
   */
  function updateMemberRole(userId, role) {
    fetch(`${API_BASE_URL}/api/teams/${teamId}/members/role`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId, role })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '更新成员角色失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 显示成功消息
        showNotification(`成员角色已${role === 'admin' ? '设为管理员' : '取消管理员'}！`, 'success');

        // 重新加载团队详情
        loadTeamDetails();
      })
      .catch(error => {
        console.error('更新成员角色失败:', error);
        showNotification(error.message || '更新成员角色失败，请稍后再试', 'error');
      });
  }

  /**
   * 移除团队成员
   * @param {string} userId 用户ID
   */
  function removeMember(userId) {
    if (!confirm('确定要将此成员移出团队吗？')) {
      return;
    }

    fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ userId })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '移除成员失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 显示成功消息
        showNotification('成员已移出团队！', 'success');

        // 重新加载团队详情
        loadTeamDetails();
      })
      .catch(error => {
        console.error('移除成员失败:', error);
        showNotification(error.message || '移除成员失败，请稍后再试', 'error');
      });
  }

  /**
   * 更新团队信息
   * @param {Event} e 表单提交事件
   */
  function updateTeam(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(editTeamForm);
    const teamData = {
      name: formData.get('name'),
      description: formData.get('description')
    };

    // 禁用提交按钮
    const submitBtn = editTeamForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '保存中...';

    // 发送更新团队请求
    fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(teamData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '更新团队失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 更新成功，关闭模态框并重新加载团队详情
        closeAllModals();

        // 显示成功消息
        showNotification('团队信息已更新！', 'success');

        // 重新加载团队详情
        loadTeamDetails();
      })
      .catch(error => {
        console.error('更新团队失败:', error);
        showNotification(error.message || '更新团队失败，请稍后再试', 'error');
      })
      .finally(() => {
        // 恢复提交按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      });
  }

  /**
   * 确认删除团队
   */
  function confirmDeleteTeam() {
    if (confirm('确定要删除此团队吗？此操作无法撤销，团队内的所有任务和历史记录都将被删除。')) {
      deleteTeam();
    }
  }

  /**
   * 删除团队
   */
  function deleteTeam() {
    fetch(`${API_BASE_URL}/api/teams/${teamId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '删除团队失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 显示成功消息
        showNotification('团队已删除！', 'success');

        // 返回团队列表页
        setTimeout(() => {
          window.location.href = 'teams.html';
        }, 1000);
      })
      .catch(error => {
        console.error('删除团队失败:', error);
        showNotification(error.message || '删除团队失败，请稍后再试', 'error');
      });
  }
  /**
  * 加载成员列表用于任务分配
  */
  function loadMembersForTaskAssignment() {
    const taskAssigneeSelect = document.getElementById('taskAssignee');

    // 清空下拉选项
    taskAssigneeSelect.innerHTML = '<option value="">-- 选择负责人 --</option>';

    // 添加团队成员选项
    membersList.forEach(member => {
      const option = document.createElement('option');
      option.value = member.id;
      option.textContent = member.username;
      taskAssigneeSelect.appendChild(option);
    });
  }

  /**
   * 创建任务
   * @param {Event} e 表单提交事件
   */
  function createTask(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(createTaskForm);
    const taskData = {
      title: formData.get('title'),
      description: formData.get('description'),
      teamId: teamId,
      priority: formData.get('priority'),
      assignedTo: formData.get('assignedTo') || null,
      deadline: formData.get('deadline') || null
    };

    // 禁用提交按钮
    const submitBtn = createTaskForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '创建中...';

    // 发送创建任务请求
    fetch(`${API_BASE_URL}/api/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(taskData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '创建任务失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 创建成功，关闭模态框并重新加载任务列表
        closeAllModals();
        createTaskForm.reset();

        // 显示成功消息
        showNotification('任务创建成功！', 'success');

        // 重新加载团队任务
        loadTeamTasks();
      })
      .catch(error => {
        console.error('创建任务失败:', error);
        showNotification(error.message || '创建任务失败，请稍后再试', 'error');
      })
      .finally(() => {
        // 恢复提交按钮状态
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      });
  }

  /**
   * 打开模态框
   * @param {Element} modal 模态框元素
   */
  function openModal(modal) {
    modal.style.display = 'block';
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