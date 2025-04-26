document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const createMergeRequestBtn = document.getElementById('createMergeRequestBtn');
  const createMergeRequestModal = document.getElementById('createMergeRequestModal');
  const createMergeRequestForm = document.getElementById('createMergeRequestForm');
  const mergeRequestsList = document.getElementById('mergeRequestsList');
  const conflictHandlingSection = document.getElementById('conflictHandlingSection');
  const conflictEditor = document.getElementById('conflictEditor');
  const resolveConflictBtn = document.getElementById('resolveConflictBtn');
  const cancelConflictBtn = document.getElementById('cancelConflictBtn');
  const conflictSourceBranch = document.getElementById('conflictSourceBranch');
  const conflictTargetBranch = document.getElementById('conflictTargetBranch');
  const backToBranches = document.getElementById('backToBranches');

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
  backToBranches.href = `branch-management.html?taskId=${taskId}`;

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 不需要在这里创建管理员角色信息元素，因为已经在HTML中定义了

  // 加载当前用户的团队角色
  let userTeamRole = null;

  // 绑定事件
  if (createMergeRequestBtn) {
    createMergeRequestBtn.addEventListener('click', () => openModal(createMergeRequestModal));
  }

  if (createMergeRequestForm) {
    createMergeRequestForm.addEventListener('submit', createMergeRequest);
  }

  if (resolveConflictBtn) {
    resolveConflictBtn.addEventListener('click', resolveConflict);
  }

  if (cancelConflictBtn) {
    cancelConflictBtn.addEventListener('click', () => {
      conflictHandlingSection.style.display = 'none';
    });
  }

  // 初始化加载
  loadMergeRequests();
  loadBranchesForMergeRequest();
  getUserTeamRole();

  async function getUserTeamRole() {
    try {
      const response = await fetch(`${API_BASE_URL}/api/teams/role/${taskId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const data = await response.json();
        userTeamRole = data.role;

        // 根据角色显示或隐藏解决冲突按钮
        if (userTeamRole !== 'admin' && userTeamRole !== 'owner') {
          if (resolveConflictBtn) {
            resolveConflictBtn.style.display = 'none';
          }
          const adminRoleMessage = document.querySelector('.admin-role-message');
          if (adminRoleMessage) {
            adminRoleMessage.style.display = 'block';
          }
        }
      }
    } catch (error) {
      console.error('获取用户团队角色失败:', error);
    }
  }

  /**
   * 加载合并请求列表
   */
  function loadMergeRequests() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/conflicts`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取合并请求失败');
        }
        return response.json();
      })
      .then(data => {
        renderMergeRequests(data.data);
      })
      .catch(error => {
        console.error('加载合并请求失败:', error);
        mergeRequestsList.innerHTML = '<div class="error-message">加载合并请求失败，请刷新重试</div>';
      });
  }

  /**
   * 渲染合并请求列表
   */
  function renderMergeRequests(conflicts) {
    if (!conflicts || conflicts.length === 0) {
      mergeRequestsList.innerHTML = '<div class="empty-message">暂无待处理的合并请求</div>';
      return;
    }

    mergeRequestsList.innerHTML = '';

    conflicts.forEach(conflict => {
      const conflictItem = document.createElement('div');
      conflictItem.className = 'merge-request-item';

      const createdDate = new Date(conflict.createdAt).toLocaleString();

      // 获取分支名称
      Promise.all([
        fetchBranchName(conflict.sourceBranchId),
        fetchBranchName(conflict.targetBranchId)
      ]).then(([sourceBranchName, targetBranchName]) => {
        conflictItem.innerHTML = `
          <div class="merge-request-info">
            <h4>合并冲突</h4>
            <div class="merge-request-branches">
              <span class="source-branch">${sourceBranchName}</span>
              <i class="icon-arrow-right"></i>
              <span class="target-branch">${targetBranchName}</span>
            </div>
            <div class="merge-request-meta">
              创建于: ${createdDate}
            </div>
          </div>
          <div class="merge-request-actions">
            <button class="btn btn-sm btn-primary handle-conflict" data-conflict-id="${conflict.id}" 
                    data-source-id="${conflict.sourceBranchId}" data-target-id="${conflict.targetBranchId}">
              处理冲突
            </button>
          </div>
        `;

        // 绑定按钮事件
        const handleBtn = conflictItem.querySelector('.handle-conflict');
        if (handleBtn) {
          handleBtn.addEventListener('click', function () {
            showConflictHandling(
              this.dataset.conflictId,
              this.dataset.sourceId,
              this.dataset.targetId,
              sourceBranchName,
              targetBranchName
            );
          });
        }

        mergeRequestsList.appendChild(conflictItem);
      }).catch(error => {
        console.error('获取分支名称失败:', error);
      });
    });
  }

  /**
   * 根据分支ID获取分支名称
   */
  async function fetchBranchName(branchId) {
    try {
      const response = await fetch(`${API_BASE_URL}/api/branches/${branchId}`, {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      if (!response.ok) {
        throw new Error('获取分支信息失败');
      }
      const data = await response.json();
      return data.data.name;
    } catch (error) {
      console.error('获取分支名称失败:', error);
      return `分支 #${branchId}`;
    }
  }

  /**
   * 显示冲突处理界面 - 修复版本
   */
  function showConflictHandling(conflictId, sourceBranchId, targetBranchId, sourceBranchName, targetBranchName) {
    // 确保冲突ID有效
    if (!conflictId) {
      showNotification('无效的冲突ID', 'error');
      return;
    }

    console.log(`正在获取冲突详情，ID: ${conflictId}`);

    fetch(`${API_BASE_URL}/api/conflicts/${conflictId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          console.error(`请求失败，状态码: ${response.status} ${response.statusText}`);
          return response.text().then(text => {
            try {
              return JSON.parse(text);
            } catch (e) {
              throw new Error(`请求失败: ${response.status} ${response.statusText} - ${text}`);
            }
          });
        }
        return response.json();
      })
      .then(data => {
        console.log('获取到的冲突数据:', data); // 添加调试信息

        if (!data.success || !data.data) {
          throw new Error('返回的数据格式不正确');
        }

        // 设置冲突编辑器内容
        conflictEditor.value = data.data.conflictContent;
        conflictSourceBranch.textContent = sourceBranchName;
        conflictTargetBranch.textContent = targetBranchName;

        // 存储源分支和目标分支ID
        conflictEditor.dataset.sourceBranchId = sourceBranchId;
        conflictEditor.dataset.targetBranchId = targetBranchId;
        conflictEditor.dataset.conflictId = conflictId;

        // 显示冲突处理区域
        conflictHandlingSection.style.display = 'block';

        // 根据用户角色显示或隐藏元素
        const adminRoleMessage = document.querySelector('.admin-role-message');
        if (userTeamRole !== 'admin' && userTeamRole !== 'owner') {
          if (adminRoleMessage) adminRoleMessage.style.display = 'block';
          if (resolveConflictBtn) resolveConflictBtn.style.display = 'none';
          showNotification('只有管理员或团队所有者才能解决冲突', 'info');
        } else {
          if (adminRoleMessage) adminRoleMessage.style.display = 'none';
          if (resolveConflictBtn) resolveConflictBtn.style.display = 'inline-block';
        }

        // 滚动到冲突处理区域
        conflictHandlingSection.scrollIntoView({ behavior: 'smooth' });
      })
      .catch(error => {
        console.error('获取冲突详情失败:', error);
        showNotification('获取冲突详情失败: ' + error.message, 'error');
      });
  }

  /**
   * 解决冲突
   */
  function resolveConflict() {
    // 验证用户角色
    if (userTeamRole !== 'admin' && userTeamRole !== 'owner') {
      showNotification('只有管理员或团队所有者才能解决冲突', 'error');
      return;
    }

    const sourceBranchId = conflictEditor.dataset.sourceBranchId;
    const targetBranchId = conflictEditor.dataset.targetBranchId;
    const resolvedContent = conflictEditor.value;

    fetch(`${API_BASE_URL}/api/conflicts/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceBranchId,
        targetBranchId,
        resolvedContent
      })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '解决冲突失败');
          });
        }
        return response.json();
      })
      .then(data => {
        showNotification('冲突已解决，分支已合并！', 'success');
        conflictHandlingSection.style.display = 'none';
        // 重新加载合并请求列表
        loadMergeRequests();
      })
      .catch(error => {
        console.error('解决冲突失败:', error);
        showNotification(error.message || '解决冲突失败，请稍后再试', 'error');
      });
  }

  /**
     * 加载用于创建合并请求的分支选择器
     */
  function loadBranchesForMergeRequest() {
    const sourceBranchSelect = document.getElementById('sourceBranch');
    const targetBranchSelect = document.getElementById('targetBranch');

    if (!sourceBranchSelect || !targetBranchSelect) return;

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
        const branches = data.data;

        // 清空选择器
        sourceBranchSelect.innerHTML = '';
        targetBranchSelect.innerHTML = '';

        // 填充源分支选择器
        branches.forEach(branch => {
          const option = document.createElement('option');
          option.value = branch.id;
          option.textContent = branch.name + (branch.isDefault ? ' (默认)' : '');
          sourceBranchSelect.appendChild(option.cloneNode(true));
        });

        // 源分支改变时更新目标分支选择器
        sourceBranchSelect.addEventListener('change', function () {
          updateTargetBranchOptions(this.value, branches);
        });

        // 初始更新目标分支选择器
        if (branches.length > 0) {
          updateTargetBranchOptions(sourceBranchSelect.value, branches);
        }
      })
      .catch(error => {
        console.error('加载分支列表失败:', error);
      });
  }

  /**
   * 更新目标分支选择器，排除当前选中的源分支
   */
  function updateTargetBranchOptions(selectedSourceId, branches) {
    const targetBranchSelect = document.getElementById('targetBranch');
    if (!targetBranchSelect) return;

    targetBranchSelect.innerHTML = '';

    branches.forEach(branch => {
      if (branch.id != selectedSourceId) {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name + (branch.isDefault ? ' (默认)' : '');
        targetBranchSelect.appendChild(option);
      }
    });
  }

  /**
   * 创建合并请求
   */
  function createMergeRequest(e) {
    e.preventDefault();

    const sourceBranchId = document.getElementById('sourceBranch').value;
    const targetBranchId = document.getElementById('targetBranch').value;
    const title = document.getElementById('mergeTitle').value;

    // 先检查是否有冲突
    fetch(`${API_BASE_URL}/api/branches/${sourceBranchId}/merge/${targetBranchId}/check`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '检查合并冲突失败');
          });
        }
        return response.json();
      })
      .then(data => {
        if (data.hasConflict) {
          // 有冲突，关闭模态框并刷新列表
          closeAllModals();
          showNotification('检测到冲突，请在合并请求列表中处理冲突', 'info');
          loadMergeRequests();
        } else {
          // 无冲突，直接执行合并
          executeMerge(sourceBranchId, targetBranchId, title);
        }
      })
      .catch(error => {
        console.error('检查合并冲突失败:', error);
        showNotification(error.message || '检查合并冲突失败，请稍后再试', 'error');
      });
  }

  /**
   * 执行分支合并
   */
  function executeMerge(sourceBranchId, targetBranchId, title) {
    fetch(`${API_BASE_URL}/api/branches/${sourceBranchId}/merge/${targetBranchId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '合并分支失败');
          });
        }
        return response.json();
      })
      .then(data => {
        closeAllModals();
        createMergeRequestForm.reset();
        showNotification('分支合并成功！', 'success');
      })
      .catch(error => {
        console.error('合并分支失败:', error);
        showNotification(error.message || '合并分支失败，请稍后再试', 'error');
      });
  }

  /**
   * 打开模态框
   */
  function openModal(modal) {
    if (modal) {
      modal.style.display = 'block';
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

    // 添加样式
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