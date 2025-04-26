document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const newCommitBtn = document.getElementById('newCommitBtn');
  const commitModal = document.getElementById('commitModal');
  const commitForm = document.getElementById('commitForm');
  const commitsHistory = document.getElementById('commitsHistory');
  const commitDetailsSection = document.getElementById('commitDetailsSection');
  const commitDetails = document.getElementById('commitDetails');
  const branchNameElem = document.getElementById('branchName');
  const backToBranches = document.getElementById('backToBranches');

  // 从URL参数获取任务ID和分支ID
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('taskId');
  const branchId = urlParams.get('branchId');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 检查参数
  if (!taskId || !branchId) {
    window.location.href = 'tasks.html';
    return;
  }

  // 更新返回链接
  backToBranches.href = `branch-management.html?taskId=${taskId}`;

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 提交记录列表
  let commits = [];
  let branchInfo = null;

  // 绑定事件
  newCommitBtn.addEventListener('click', () => openModal(commitModal));
  commitForm.addEventListener('submit', createNewCommit);

  // 初始化加载
  loadBranchInfo();
  loadCommits();

  /**
   * 加载分支信息 - 修改为使用任务分支列表接口
   */
  function loadBranchInfo() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/branches`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取分支信息失败');
        }
        return response.json();
      })
      .then(data => {
        // 从返回的分支列表中找到当前分支
        const branch = data.data.find(b => b.id == branchId);
        if (branch) {
          branchInfo = branch;
          branchNameElem.textContent = branch.name;
        } else {
          throw new Error('未找到分支信息');
        }
      })
      .catch(error => {
        console.error('加载分支信息失败:', error);
        showNotification('加载分支信息失败: ' + error.message, 'error');
      });
  }

  /**
   * 加载提交历史
   */
  function loadCommits() {
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
        commitsHistory.innerHTML = '<div class="error-message">加载提交历史失败，请刷新重试</div>';
      });
  }

  /**
   * 渲染提交历史
   */
  function renderCommits() {
    if (commits.length === 0) {
      commitsHistory.innerHTML = '<div class="empty-message">暂无提交历史</div>';
      return;
    }

    commitsHistory.innerHTML = '';

    commits.forEach(commit => {
      const commitItem = document.createElement('div');
      commitItem.className = 'commit-item';

      const commitDate = new Date(commit.createdAt).toLocaleString();

      commitItem.innerHTML = `
        <div class="commit-header">
          <h4 class="commit-title">${commit.title}</h4>
          <span class="commit-meta">
            <img src="${getAvatarUrl(commit.avatar)}" alt="${commit.username}" class="commit-avatar"> 
            ${commit.username} 提交于 ${commitDate}
          </span>
        </div>
        <p class="commit-description">${commit.description || ''}</p>
        <div class="commit-actions">
          <button class="btn btn-sm btn-secondary view-commit" data-commit-id="${commit.id}">查看详情</button>
          <button class="btn btn-sm btn-danger revert-commit" data-commit-id="${commit.id}">回退到此版本</button>
        </div>
      `;

      // 绑定按钮事件
      commitItem.querySelector('.view-commit').addEventListener('click', function () {
        viewCommit(this.dataset.commitId);
      });

      commitItem.querySelector('.revert-commit').addEventListener('click', function () {
        confirmRevert(this.dataset.commitId);
      });

      commitsHistory.appendChild(commitItem);
    });
  }

  /**
   * 查看提交详情
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
        const commit = data.data;
        commitDetailsSection.style.display = 'block';

        const commitDate = new Date(commit.createdAt).toLocaleString();

        commitDetails.innerHTML = `
          <div class="commit-detail-header">
            <h4>${commit.title}</h4>
            <div class="commit-meta">
              <img src="${getAvatarUrl(commit.avatar)}" alt="${commit.username}" class="commit-avatar"> 
              ${commit.username} 提交于 ${commitDate}
            </div>
          </div>
          <div class="commit-detail-description">
            <p>${commit.description || '无描述'}</p>
          </div>
          <div class="commit-content-preview">
            <h5>提交内容:</h5>
            <pre>${commit.content}</pre>
          </div>
        `;

        // 滚动到详情区域
        commitDetailsSection.scrollIntoView({ behavior: 'smooth' });
      })
      .catch(error => {
        console.error('查看提交详情失败:', error);
        showNotification('查看提交详情失败: ' + error.message, 'error');
      });
  }

  /**
   * 确认版本回退
   */
  function confirmRevert(commitId) {
    if (confirm('确定要回退到此版本吗？当前未保存的修改将会丢失。')) {
      revertToCommit(commitId);
    }
  }

  /**
   * 版本回退
   */
  function revertToCommit(commitId) {
    fetch(`${API_BASE_URL}/api/branches/${branchId}/revert/${commitId}`, {
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
        // 重新加载提交历史
        loadCommits();
      })
      .catch(error => {
        console.error('版本回退失败:', error);
        showNotification(error.message || '版本回退失败，请稍后再试', 'error');
      });
  }

  /**
   * 创建新提交
   */
  function createNewCommit(e) {
    e.preventDefault();

    const formData = new FormData(commitForm);
    const commitData = {
      title: formData.get('title'),
      description: formData.get('description'),
      content: formData.get('content')
    };

    fetch(`${API_BASE_URL}/api/branches/${branchId}/commits`, {
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
        showNotification('版本提交成功！', 'success');
        loadCommits();
      })
      .catch(error => {
        console.error('提交版本失败:', error);
        showNotification(error.message || '提交版本失败，请稍后再试', 'error');
      });
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