document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const branchSelector = document.getElementById('branchSelector');
  const createBranchBtn = document.getElementById('createBranchBtn');
  const commitVersionBtn = document.getElementById('commitVersionBtn');
  const mergeBtn = document.getElementById('mergeBtn');
  const taskContentEditor = document.getElementById('taskContentEditor');
  const commitsHistory = document.getElementById('commitsHistory');

  // 模态框相关元素
  const createBranchModal = document.getElementById('createBranchModal');
  const createBranchForm = document.getElementById('createBranchForm');
  const commitModal = document.getElementById('commitModal');
  const commitForm = document.getElementById('commitForm');
  const mergeModal = document.getElementById('mergeModal');
  const mergeForm = document.getElementById('mergeForm');
  const targetBranchSelect = document.getElementById('targetBranch');
  const conflictModal = document.getElementById('conflictModal');
  const conflictEditor = document.getElementById('conflictEditor');
  const resolveConflictBtn = document.getElementById('resolveConflictBtn');

  // 从URL参数获取任务ID
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 当前活动分支和提交
  let activeBranchId = null;
  let branches = [];
  let commits = [];
  let latestContent = '';
  let hasUnsavedChanges = false;

  // 绑定事件
  createBranchBtn.addEventListener('click', () => openModal(createBranchModal));
  commitVersionBtn.addEventListener('click', () => openModal(commitModal));
  mergeBtn.addEventListener('click', () => prepareAndOpenMergeModal());

  branchSelector.addEventListener('change', function () {
    loadBranchContent(this.value);
  });

  createBranchForm.addEventListener('submit', createNewBranch);
  commitForm.addEventListener('submit', commitNewVersion);
  mergeForm.addEventListener('submit', mergeBranches);
  resolveConflictBtn.addEventListener('click', resolveConflict);

  taskContentEditor.addEventListener('input', function () {
    hasUnsavedChanges = true;
  });

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
        renderBranchSelector();

        // 如果没有分支，创建默认分支
        if (branches.length === 0) {
          createDefaultBranch();
        } else {
          // 加载默认分支
          const defaultBranch = branches.find(branch => branch.isDefault);
          if (defaultBranch) {
            branchSelector.value = defaultBranch.id;
            loadBranchContent(defaultBranch.id);
          } else {
            branchSelector.value = branches[0].id;
            loadBranchContent(branches[0].id);
          }
        }
      })
      .catch(error => {
        console.error('加载分支失败:', error);
        showNotification('加载分支失败: ' + error.message, 'error');
      });
  }

  /**
   * 渲染分支选择器
   */
  function renderBranchSelector() {
    branchSelector.innerHTML = '';
    branches.forEach(branch => {
      const option = document.createElement('option');
      option.value = branch.id;
      option.textContent = branch.name + (branch.isDefault ? ' (默认)' : '');
      branchSelector.appendChild(option);
    });
  }

  /**
   * 创建默认分支
   */
  function createDefaultBranch() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        name: 'main',
        description: '默认主分支',
        isDefault: true
      })
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('创建默认分支失败');
        }
        return response.json();
      })
      .then(data => {
        branches.push(data.data);
        renderBranchSelector();
        branchSelector.value = data.data.id;
        loadBranchContent(data.data.id);
      })
      .catch(error => {
        console.error('创建默认分支失败:', error);
        showNotification('创建默认分支失败: ' + error.message, 'error');
      });
  }

  /**
   * 加载分支内容
   * @param {string} branchId 分支ID
   */
  function loadBranchContent(branchId) {
    if (hasUnsavedChanges) {
      if (!confirm('你有未保存的修改，切换分支将丢失这些修改。确定要继续吗？')) {
        branchSelector.value = activeBranchId;
        return;
      }
    }

    activeBranchId = branchId;
    hasUnsavedChanges = false;

    // 加载分支的提交历史
    loadCommits(branchId);

    // 加载最新提交的内容
    fetch(`${API_BASE_URL}/api/branches/${branchId}/latest-content`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取分支内容失败');
        }
        return response.json();
      })
      .then(data => {
        latestContent = data.content || '';
        taskContentEditor.value = latestContent;
      })
      .catch(error => {
        console.error('加载分支内容失败:', error);
        showNotification('加载分支内容失败: ' + error.message, 'error');
      });
  }

  /**
   * 加载提交历史
   * @param {string} branchId 分支ID
   */
  function loadCommits(branchId) {
    fetch(`${API_BASE_URL}/api/branches/${branchId}/commits`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取提交历史失败');
        }
        return response.json();
      })
      .then(data => {
        commits = data.data;
        renderCommits();
      })
      .catch(error => {
        console.error('加载提交历史失败:', error);
        showNotification('加载提交历史失败: ' + error.message, 'error');
      });
  }

  /**
   * 渲染提交历史
   */
  function renderCommits() {
    commitsHistory.innerHTML = '';

    if (commits.length === 0) {
      commitsHistory.innerHTML = '<div class="empty-message">暂无提交历史</div>';
      return;
    }

    commits.forEach(commit => {
      const commitItem = document.createElement('div');
      commitItem.className = 'commit-item';

      // 格式化时间
      const commitDate = new Date(commit.createdAt).toLocaleString();

      commitItem.innerHTML = `
        <div class="commit-header">
          <h4 class="commit-title">${commit.title}</h4>
          <span class="commit-meta">
            由 ${commit.username} 提交于 ${commitDate}
          </span>
        </div>
        <p class="commit-description">${commit.description || ''}</p>
        <div class="commit-actions">
          <button class="btn btn-sm btn-secondary view-commit" data-commit-id="${commit.id}">查看</button>
          <button class="btn btn-sm btn-danger revert-commit" data-commit-id="${commit.id}">回退到此版本</button>
        </div>
      `;

      commitsHistory.appendChild(commitItem);

      // 绑定按钮事件
      commitItem.querySelector('.view-commit').addEventListener('click', function () {
        viewCommit(this.dataset.commitId);
      });

      commitItem.querySelector('.revert-commit').addEventListener('click', function () {
        confirmRevert(this.dataset.commitId);
      });
    });
  }

  /**
   * 创建新分支
   * @param {Event} e 表单提交事件
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

        // 重新加载分支列表
        loadBranches();
      })
      .catch(error => {
        console.error('创建分支失败:', error);
        showNotification(error.message || '创建分支失败，请稍后再试', 'error');
      });
  }

  /**
   * 提交新版本
   * @param {Event} e 表单提交事件
   */
  function commitNewVersion(e) {
    e.preventDefault();

    const formData = new FormData(commitForm);
    const commitData = {
      title: formData.get('title'),
      description: formData.get('description'),
      content: taskContentEditor.value
    };

    fetch(`${API_BASE_URL}/api/branches/${activeBranchId}/commits`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify(commitData)
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '提交版本失败');
          });
        }
        return response.json();
      })
      .then(data => {
        closeAllModals();
        commitForm.reset();

        hasUnsavedChanges = false;
        latestContent = taskContentEditor.value;

        showNotification('版本提交成功！', 'success');

        // 重新加载提交历史
        loadCommits(activeBranchId);
      })
      .catch(error => {
        console.error('提交版本失败:', error);
        showNotification(error.message || '提交版本失败，请稍后再试', 'error');
      });
  }

  /**
   * 查看特定提交内容
   * @param {string} commitId 提交ID
   */
  function viewCommit(commitId) {
    fetch(`${API_BASE_URL}/api/commits/${commitId}`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取提交详情失败');
        }
        return response.json();
      })
      .then(data => {
        // 保存当前内容
        const currentContent = taskContentEditor.value;

        // 显示提交内容
        taskContentEditor.value = data.data.content;

        // 提示用户正在查看历史版本
        showNotification('正在查看历史版本，修改将不会自动保存', 'info');

        // 添加"返回最新版本"按钮
        const backButton = document.createElement('button');
        backButton.className = 'btn btn-warning';
        backButton.textContent = '返回最新版本';
        backButton.id = 'backToLatestBtn';
        backButton.style.marginRight = '10px';
        backButton.addEventListener('click', function () {
          taskContentEditor.value = latestContent;
          this.remove();
        });

        // 检查是否已存在返回按钮
        if (!document.getElementById('backToLatestBtn')) {
          const actionsContainer = document.querySelector('.version-actions');
          actionsContainer.prepend(backButton);
        }
      })
      .catch(error => {
        console.error('查看提交失败:', error);
        showNotification('查看提交失败: ' + error.message, 'error');
      });
  }

  /**
   * 确认版本回退
   * @param {string} commitId 提交ID
   */
  function confirmRevert(commitId) {
    if (confirm('确定要回退到此版本吗？当前未保存的修改将会丢失。')) {
      revertToCommit(commitId);
    }
  }

  /**
   * 版本回退
   * @param {string} commitId 提交ID
   */
  function revertToCommit(commitId) {
    fetch(`${API_BASE_URL}/api/branches/${activeBranchId}/revert/${commitId}`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '版本回退失败');
          });
        }
        return response.json();
      })
      .then(data => {
        showNotification('版本回退成功！', 'success');

        // 更新编辑器内容
        taskContentEditor.value = data.data.content;
        latestContent = data.data.content;
        hasUnsavedChanges = false;

        // 移除"返回最新版本"按钮
        const backButton = document.getElementById('backToLatestBtn');
        if (backButton) {
          backButton.remove();
        }

        // 重新加载提交历史
        loadCommits(activeBranchId);
      })
      .catch(error => {
        console.error('版本回退失败:', error);
        showNotification(error.message || '版本回退失败，请稍后再试', 'error');
      });
  }

  /**
   * 准备并打开合并分支模态框
   */
  function prepareAndOpenMergeModal() {
    // 清空目标分支选择器
    targetBranchSelect.innerHTML = '';

    // 添加所有分支，排除当前分支
    branches.forEach(branch => {
      if (branch.id != activeBranchId) {
        const option = document.createElement('option');
        option.value = branch.id;
        option.textContent = branch.name + (branch.isDefault ? ' (默认)' : '');
        targetBranchSelect.appendChild(option);
      }
    });

    // 如果没有其他分支，提示用户
    if (targetBranchSelect.options.length === 0) {
      showNotification('没有可合并的目标分支', 'info');
      return;
    }

    // 打开模态框
    openModal(mergeModal);
  }

  /**
   * 合并分支
   * @param {Event} e 表单提交事件
   */
  function mergeBranches(e) {
    e.preventDefault();

    const targetBranchId = targetBranchSelect.value;

    // 先检查是否有冲突
    fetch(`${API_BASE_URL}/api/branches/${activeBranchId}/merge/${targetBranchId}/check`, {
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
          // 显示冲突解决界面
          showConflictResolution(data.conflict, targetBranchId);
        } else {
          // 直接执行合并
          executeMerge(targetBranchId);
        }
      })
      .catch(error => {
        console.error('检查合并冲突失败:', error);
        showNotification(error.message || '检查合并冲突失败，请稍后再试', 'error');
      });
  }

  /**
   * 显示冲突解决界面
   * @param {Object} conflict 冲突信息
   * @param {string} targetBranchId 目标分支ID
   */
  function showConflictResolution(conflict, targetBranchId) {
    closeAllModals();

    // 设置冲突编辑器内容
    conflictEditor.value = conflict.content;

    // 存储目标分支ID
    conflictEditor.dataset.targetBranchId = targetBranchId;

    // 显示冲突解决模态框
    openModal(conflictModal);
  }

  /**
   * 解决冲突
   */
  function resolveConflict() {
    const targetBranchId = conflictEditor.dataset.targetBranchId;
    const resolvedContent = conflictEditor.value;

    fetch(`${API_BASE_URL}/api/conflicts/resolve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        sourceBranchId: activeBranchId,
        targetBranchId: targetBranchId,
        resolvedContent: resolvedContent
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
        closeAllModals();

        showNotification('冲突已解决，分支已合并！', 'success');

        // 更新编辑器内容
        taskContentEditor.value = resolvedContent;
        latestContent = resolvedContent;
        hasUnsavedChanges = false;

        // 重新加载提交历史
        loadCommits(activeBranchId);
      })
      .catch(error => {
        console.error('解决冲突失败:', error);
        showNotification(error.message || '解决冲突失败，请稍后再试', 'error');
      });
  }

  /**
   * 执行分支合并
   * @param {string} targetBranchId 目标分支ID
   */
  function executeMerge(targetBranchId) {
    fetch(`${API_BASE_URL}/api/branches/${activeBranchId}/merge/${targetBranchId}`, {
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

        showNotification('分支合并成功！', 'success');

        // 更新编辑器内容
        taskContentEditor.value = data.data.content;
        latestContent = data.data.content;
        hasUnsavedChanges = false;

        // 重新加载提交历史
        loadCommits(activeBranchId);
      })
      .catch(error => {
        console.error('合并分支失败:', error);
        showNotification(error.message || '合并分支失败，请稍后再试', 'error');
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

  // 窗口关闭前提示保存
  window.addEventListener('beforeunload', function (e) {
    if (hasUnsavedChanges) {
      e.preventDefault();
      e.returnValue = '你有未保存的修改，确定要离开吗？';
      return e.returnValue;
    }
  });
});