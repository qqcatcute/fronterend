document.addEventListener('DOMContentLoaded', function () {
  // Hide all modals at startup
  document.querySelectorAll('.modal').forEach(modal => {
    modal.style.display = 'none';
  });

  // 获取DOM元素
  const createBranchBtn = document.getElementById('createBranchBtn');
  const createBranchModal = document.getElementById('createBranchModal');
  const createBranchForm = document.getElementById('createBranchForm');
  const branchesList = document.getElementById('branchesList');
  const activeBranchInfo = document.getElementById('activeBranchInfo');
  const backToTask = document.getElementById('backToTask');

  // 从URL参数获取任务ID
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 检查taskId
  if (!taskId) {
    window.location.href = 'tasks.html';
    return;
  }

  // 更新返回链接
  backToTask.href = `task-details.html?id=${taskId}`;

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 当前活动分支
  let activeBranchId = null;
  let branches = [];

  // 绑定事件
  createBranchBtn.addEventListener('click', () => openModal(createBranchModal));
  createBranchForm.addEventListener('submit', createNewBranch);

  // 初始加载分支
  loadBranches();

  /**
   * 加载任务的所有分支
   */
  function loadBranches() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取分支列表失败');
        }
        return response.json();
      })
      .then(data => {
        branches = data.data;
        renderBranches();
        if (branches.length > 0) {
          const defaultBranch = branches.find(branch => branch.isDefault);
          const activeBranch = defaultBranch || branches[0];
          showBranchInfo(activeBranch.id);
        } else {
          activeBranchInfo.innerHTML = '<div class="empty-message">没有活动分支</div>';
        }
      })
      .catch(error => {
        console.error('加载分支失败:', error);
        showNotification('加载分支失败: ' + error.message, 'error');
        branchesList.innerHTML = '<div class="error-message">加载分支失败，请刷新重试</div>';
      });
  }

  /**
   * 渲染分支列表
   */
  function renderBranches() {
    if (branches.length === 0) {
      branchesList.innerHTML = '<div class="empty-message">暂无分支</div>';
      return;
    }

    branchesList.innerHTML = '';

    branches.forEach(branch => {
      const branchItem = document.createElement('div');
      branchItem.className = `branch-item ${branch.isDefault ? 'default-branch' : ''}`;

      const createdDate = new Date(branch.createdAt).toLocaleString();

      branchItem.innerHTML = `
        <div class="branch-info">
          <div class="branch-title">
            <h4>${branch.name}</h4>
            ${branch.isDefault ? '<span class="badge">默认</span>' : ''}
          </div>
          <p class="branch-description">${branch.description || '无描述'}</p>
          <div class="branch-meta">
            创建于: ${createdDate}
          </div>
        </div>
        <div class="branch-actions">
          <button class="btn btn-sm btn-primary view-commits" data-branch-id="${branch.id}">
            查看提交
          </button>
          ${!branch.isDefault ? `
            <button class="btn btn-sm btn-secondary set-default" data-branch-id="${branch.id}">
              设为默认
            </button>
            <button class="btn btn-sm btn-danger delete-branch" data-branch-id="${branch.id}">
              删除
            </button>
          ` : ''}
        </div>
      `;

      // 绑定按钮事件
      const viewCommitsBtn = branchItem.querySelector('.view-commits');
      if (viewCommitsBtn) {
        viewCommitsBtn.addEventListener('click', () => {
          window.location.href = `commit-history.html?taskId=${taskId}&branchId=${branch.id}`;
        });
      }

      const setDefaultBtn = branchItem.querySelector('.set-default');
      if (setDefaultBtn) {
        setDefaultBtn.addEventListener('click', () => setDefaultBranch(branch.id));
      }

      const deleteBtn = branchItem.querySelector('.delete-branch');
      if (deleteBtn) {
        deleteBtn.addEventListener('click', () => deleteBranch(branch.id));
      }

      branchesList.appendChild(branchItem);
    });
  }

  /**
   * 显示分支详细信息
   */
  function showBranchInfo(branchId) {
    const branch = branches.find(b => b.id === branchId);
    if (!branch) return;

    activeBranchId = branchId;

    fetch(`${API_BASE_URL}/api/branches/${branchId}/commits`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => response.json())
      .then(data => {
        const commits = data.data;
        const latestCommit = commits.length > 0 ? commits[0] : null;

        activeBranchInfo.innerHTML = `
          <div class="branch-details">
            <h4>${branch.name} <span class="badge">${branch.isDefault ? '默认' : ''}</span></h4>
            <p>${branch.description || '无描述'}</p>
            <div class="branch-stats">
              <div class="stat-item">
                <span class="stat-label">创建时间:</span>
                <span class="stat-value">${new Date(branch.createdAt).toLocaleString()}</span>
              </div>
              <div class="stat-item">
                <span class="stat-label">提交数:</span>
                <span class="stat-value">${commits.length}</span>
              </div>
              ${latestCommit ? `
                <div class="stat-item">
                  <span class="stat-label">最新提交:</span>
                  <span class="stat-value">${latestCommit.title}</span>
                </div>
              ` : ''}
            </div>
          </div>
        `;
      })
      .catch(error => {
        console.error('加载分支信息失败:', error);
        activeBranchInfo.innerHTML = '<div class="error-message">加载分支信息失败</div>';
      });
  }

  /**
   * 创建新分支
   */
  function createNewBranch(e) {
    e.preventDefault();

    const formData = new FormData(createBranchForm);
    const branchData = {
      name: formData.get('name'),
      description: formData.get('description'),
      isDefault: formData.get('isDefault') === 'on'
    };

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(branchData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '创建分支失败');
          });
        }
        return response.json();
      })
      .then(data => {
        closeAllModals();
        createBranchForm.reset();
        showNotification('分支创建成功！', 'success');
        loadBranches();
      })
      .catch(error => {
        console.error('创建分支失败:', error);
        showNotification(error.message || '创建分支失败，请稍后再试', 'error');
      });
  }

  /**
   * 设置默认分支
   */
  function setDefaultBranch(branchId) {
    if (!confirm('确定要将此分支设为默认分支吗？')) {
      return;
    }

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches/${branchId}/default`, {
      method: 'PUT',  // 修改为PUT方法以匹配后端路由
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('设置默认分支失败');
        }
        return response.json();
      })
      .then(data => {
        showNotification('已设置为默认分支', 'success');
        loadBranches();
      })
      .catch(error => {
        console.error('设置默认分支失败:', error);
        showNotification('设置默认分支失败: ' + error.message, 'error');
      });
  }

  /**
   * 删除分支
   */
  function deleteBranch(branchId) {
    if (!confirm('确定要删除此分支吗？此操作无法撤销。')) {
      return;
    }

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches/${branchId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '删除分支失败');
          });
        }
        return response.json();
      })
      .then(data => {
        showNotification('分支已删除', 'success');
        loadBranches();
      })
      .catch(error => {
        console.error('删除分支失败:', error);
        showNotification(error.message || '删除分支失败，请稍后再试', 'error');
      });
  }

  /**
   * 打开模态框
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

    if (type === 'success') {
      notification.style.backgroundColor = '#d4edda';
      notification.style.color = '#155724';
    } else if (type === 'error') {
      notification.style.backgroundColor = '#f8d7da';
      notification.style.color = '#721c24';
    } else {
      notification.style.backgroundColor = '#d1ecf1';
      notification.style.color = '#0c5460';
    }

    setTimeout(() => {
      notification.style.display = 'none';
    }, 3000);
  }

  // 模态框关闭按钮事件
  document.querySelectorAll('.close-modal, .cancel-modal').forEach(button => {
    button.addEventListener('click', closeAllModals);
  });

  // 点击模态框外部关闭
  window.addEventListener('click', function (event) {
    if (event.target.classList.contains('modal')) {
      event.target.style.display = 'none';
    }
  });
});