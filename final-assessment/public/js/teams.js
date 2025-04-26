document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const teamsList = document.getElementById('teamsList');
  const createTeamBtn = document.getElementById('createTeamBtn');
  const createTeamModal = document.getElementById('createTeamModal');
  const createTeamForm = document.getElementById('createTeamForm');
  const closeModalBtns = document.querySelectorAll('.close-modal, .cancel-modal');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }




  // 添加此代码：检查URL参数是否要求自动打开创建团队模态框
  const urlParams = new URLSearchParams(window.location.search);
  const action = urlParams.get('action');
  if (action === 'create') {
    // 稍微延迟打开模态框，确保页面元素已经加载
    setTimeout(() => {
      openModal(createTeamModal);
    }, 500);
  }



  // 加载用户的所有团队
  loadMyTeams();

  // 绑定创建团队按钮点击事件
  createTeamBtn.addEventListener('click', function () {
    openModal(createTeamModal);
  });

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

  // 绑定创建团队表单提交事件
  createTeamForm.addEventListener('submit', createTeam);

  /**
   * 加载用户所有的团队
   */
  function loadMyTeams() {
    teamsList.innerHTML = '<div class="team-loading">加载中...</div>';

    fetch(`${API_BASE_URL}/api/teams/me`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取团队列表失败');
        }
        return response.json();
      })
      .then(data => {
        renderTeamsList(data.data);
      })
      .catch(error => {
        console.error('加载团队列表失败:', error);
        teamsList.innerHTML = `<div class="error-message">加载团队失败: ${error.message}</div>`;
      });
  }

  /**
   * 渲染团队列表
   * @param {Array} teams 团队数组
   */
  function renderTeamsList(teams) {
    if (!teams || teams.length === 0) {
      teamsList.innerHTML = '<div class="empty-message">您还没有加入任何团队，点击"创建团队"按钮开始使用。</div>';
      return;
    }

    teamsList.innerHTML = '';
    teams.forEach(team => {
      const teamCard = document.createElement('div');
      teamCard.className = 'team-card';

      // 获取团队名称的首字母作为头像显示
      const firstLetter = team.name.charAt(0).toUpperCase();

      // 格式化创建时间
      const createdDate = new Date(team.createdAt).toLocaleDateString();

      teamCard.innerHTML = `
        <div class="team-header">
          <div class="team-avatar">${firstLetter}</div>
          <div class="team-title">
            <h4>${team.name}</h4>
            <div class="team-members">成员数量: 加载中...</div>
          </div>
        </div>
        <div class="team-description">
          ${team.description || '暂无描述'}
        </div>
        <div class="team-footer">
          <div class="team-meta">创建于 ${createdDate}</div>
          <div class="team-actions">
            <a href="team-details.html?id=${team.id}">查看详情</a>
          </div>
        </div>
      `;

      teamsList.appendChild(teamCard);

      // 获取团队成员数量
      loadTeamMembersCount(team.id, teamCard);
    });
  }

  /**
   * 加载团队成员数量
   * @param {number} teamId 团队ID
   * @param {Element} teamCard 团队卡片元素
   */
  function loadTeamMembersCount(teamId, teamCard) {
    fetch(`${API_BASE_URL}/api/teams/${teamId}/members`, {
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
        const membersElement = teamCard.querySelector('.team-members');
        membersElement.textContent = `成员数量: ${data.count}`;
      })
      .catch(error => {
        console.error('加载团队成员数量失败:', error);
        const membersElement = teamCard.querySelector('.team-members');
        membersElement.textContent = '成员数量: 未知';
      });
  }

  /**
   * 创建新团队
   * @param {Event} e 表单提交事件
   */
  function createTeam(e) {
    e.preventDefault();

    // 获取表单数据
    const formData = new FormData(createTeamForm);
    const teamData = {
      name: formData.get('name'),
      description: formData.get('description')
    };

    // 禁用提交按钮
    const submitBtn = createTeamForm.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn.textContent;
    submitBtn.disabled = true;
    submitBtn.textContent = '创建中...';

    // 发送创建团队请求
    fetch(`${API_BASE_URL}/api/teams`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(teamData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '创建团队失败');
          });
        }
        return response.json();
      })
      .then(data => {
        // 创建成功，关闭模态框并重新加载团队列表
        closeAllModals();
        createTeamForm.reset();

        // 显示成功消息
        showNotification('团队创建成功！', 'success');

        // 重新加载团队列表
        loadMyTeams();
      })
      .catch(error => {
        console.error('创建团队失败:', error);
        showNotification(error.message || '创建团队失败，请稍后再试', 'error');
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
   * @param {string} type 通知类型 (success, error)
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