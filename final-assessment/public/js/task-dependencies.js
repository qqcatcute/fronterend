document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const taskDependencies = document.getElementById('taskDependencies');
  const taskDependents = document.getElementById('taskDependents');
  const addDependencyBtn = document.getElementById('addDependencyBtn');
  const addDependencyModal = document.getElementById('addDependencyModal');
  const addDependencyForm = document.getElementById('addDependencyForm');
  const dependsOnTaskSelect = document.getElementById('dependsOnTaskSelect');

  // 从URL获取任务ID
  const urlParams = new URLSearchParams(window.location.search);
  const taskId = urlParams.get('id');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 检查元素是否存在
  if (!taskDependencies || !taskDependents || !addDependencyBtn || !addDependencyForm) {
    console.error('依赖管理相关DOM元素不存在');
    return;
  }

  // 加载依赖关系
  loadDependencies();

  // 绑定事件
  addDependencyBtn.addEventListener('click', () => {
    loadAvailableTasks();
    openModal(addDependencyModal);
  });

  addDependencyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    addDependency();
  });

  /**
   * 加载任务依赖关系
   */
  function loadDependencies() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/dependencies`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取任务依赖失败');
        }
        return response.json();
      })
      .then(data => {
        renderDependencies(data.data.dependencies, taskDependencies);
        renderDependents(data.data.dependents, taskDependents);
      })
      .catch(error => {
        console.error('加载任务依赖失败:', error);
        taskDependencies.innerHTML = '<div class="empty-message">加载依赖失败，请刷新重试</div>';
        taskDependents.innerHTML = '<div class="empty-message">加载依赖任务失败，请刷新重试</div>';
      });
  }

  /**
   * 渲染任务依赖列表
   */
  function renderDependencies(dependencies, container) {
    if (!dependencies || dependencies.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无依赖任务</div>';
      return;
    }

    container.innerHTML = '';
    dependencies.forEach(dep => {
      const item = document.createElement('div');
      item.className = 'dependency-item';

      // 根据任务状态设置不同样式
      const statusClass = getStatusClass(dep.status);

      item.innerHTML = `
        <div class="dependency-info">
          <span class="dependency-title">
            <span class="status-dot ${statusClass}"></span>
            ${dep.title}
          </span>
        </div>
        <div class="dependency-actions">
          <button class="btn btn-sm btn-danger remove-dependency" data-depends-on="${dep.dependsOnTaskId}">
            移除
          </button>
        </div>
      `;

      // 绑定移除按钮事件
      const removeBtn = item.querySelector('.remove-dependency');
      if (removeBtn) {
        removeBtn.addEventListener('click', function () {
          removeDependency(this.dataset.dependsOn);
        });
      }

      container.appendChild(item);
    });
  }

  /**
   * 渲染依赖该任务的任务列表
   */
  function renderDependents(dependents, container) {
    if (!dependents || dependents.length === 0) {
      container.innerHTML = '<div class="empty-message">暂无依赖此任务的任务</div>';
      return;
    }

    container.innerHTML = '';
    dependents.forEach(dep => {
      const item = document.createElement('div');
      item.className = 'dependency-item';

      // 根据任务状态设置不同样式
      const statusClass = getStatusClass(dep.status);

      item.innerHTML = `
        <div class="dependency-info">
          <span class="dependency-title">
            <span class="status-dot ${statusClass}"></span>
            ${dep.title}
          </span>
        </div>
        <div class="dependency-actions">
          <a href="task-details.html?id=${dep.taskId}" class="btn btn-sm btn-secondary">
            查看任务
          </a>
        </div>
      `;

      container.appendChild(item);
    });
  }

  /**
   * 根据任务状态获取CSS类名
   */
  function getStatusClass(status) {
    switch (status) {
      case 'completed': return 'status-completed';
      case 'in_progress': return 'status-in-progress';
      default: return 'status-pending';
    }
  }

  /**
   * 加载可添加为依赖的任务
   */
  function loadAvailableTasks() {
    fetch(`${API_BASE_URL}/api/tasks/${taskId}/available-dependencies`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取可用任务失败');
        }
        return response.json();
      })
      .then(data => {
        dependsOnTaskSelect.innerHTML = '<option value="">-- 选择任务 --</option>';

        data.data.forEach(task => {
          const option = document.createElement('option');
          option.value = task.id;
          option.textContent = task.title;
          dependsOnTaskSelect.appendChild(option);
        });
      })
      .catch(error => {
        console.error('加载可用任务失败:', error);
        showNotification('加载可用任务失败: ' + error.message, 'error');
      });
  }

  /**
   * 添加任务依赖
   */
  function addDependency() {
    const dependsOnTaskId = dependsOnTaskSelect.value;
    if (!dependsOnTaskId) {
      showNotification('请选择依赖任务', 'error');
      return;
    }

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/dependencies`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({ dependsOnTaskId })
    })
      .then(response => {
        if (!response.ok) {
          return response.json().then(data => {
            throw new Error(data.message || '添加依赖失败');
          });
        }
        return response.json();
      })
      .then(data => {
        closeAllModals();
        addDependencyForm.reset();
        showNotification('依赖添加成功！', 'success');
        loadDependencies();
      })
      .catch(error => {
        console.error('添加依赖失败:', error);
        showNotification(error.message || '添加依赖失败，请稍后再试', 'error');
      });
  }

  /**
   * 移除任务依赖
   */
  function removeDependency(dependsOnTaskId) {
    if (!confirm('确定要移除此依赖关系吗？')) {
      return;
    }

    fetch(`${API_BASE_URL}/api/tasks/${taskId}/dependencies/${dependsOnTaskId}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Bearer ${token}`
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('移除依赖失败');
        }
        return response.json();
      })
      .then(data => {
        showNotification('依赖关系已移除', 'success');
        loadDependencies();
      })
      .catch(error => {
        console.error('移除依赖失败:', error);
        showNotification('移除依赖失败: ' + error.message, 'error');
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