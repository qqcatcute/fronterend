/**
 * history.js
 * 处理历史记录页面的数据加载、过滤和分页功能
 */

document.addEventListener('DOMContentLoaded', function () {
  // 获取DOM元素
  const historyList = document.getElementById('historyList');
  const historyTypeSelect = document.getElementById('historyType');
  const historyTeamSelect = document.getElementById('historyTeam');
  const historyActionSelect = document.getElementById('historyAction');
  const startDateInput = document.getElementById('startDate');
  const endDateInput = document.getElementById('endDate');
  const searchInput = document.getElementById('searchKeyword');
  const searchBtn = document.getElementById('searchBtn');
  const resetFilterBtn = document.getElementById('resetFilter');
  const prevPageBtn = document.getElementById('prevPage');
  const nextPageBtn = document.getElementById('nextPage');
  const paginationElement = document.getElementById('historyPagination');
  const exportBtn = document.getElementById('exportBtn');

  // 获取用户token
  const token = localStorage.getItem('token');
  if (!token) {
    window.location.href = 'index.html';
    return;
  }

  // 当前用户信息
  const currentUser = JSON.parse(localStorage.getItem('user'));

  // 历史记录数据和分页设置
  let historyData = [];
  let filteredHistory = [];
  let currentPage = 1;
  let totalPages = 1;
  const itemsPerPage = 10;
  let filterSettings = {
    type: 'all',
    team: 'all',
    action: 'all',
    startDate: '',
    endDate: '',
    keyword: '',
    page: 1,
    limit: 10
  };

  // 初始化日期选择器的默认值（过去30天）
  const today = new Date();
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(today.getDate() - 30);

  startDateInput.value = formatDateForInput(thirtyDaysAgo);
  endDateInput.value = formatDateForInput(today);

  filterSettings.startDate = startDateInput.value;
  filterSettings.endDate = endDateInput.value;

  // 初始加载
  loadUserTeams();
  loadHistoryData();

  // 绑定过滤器变更事件
  historyTypeSelect.addEventListener('change', updateFilter);
  historyTeamSelect.addEventListener('change', updateFilter);
  historyActionSelect.addEventListener('change', updateFilter);
  startDateInput.addEventListener('change', updateFilter);
  endDateInput.addEventListener('change', updateFilter);

  // 绑定搜索按钮
  if (searchBtn) {
    searchBtn.addEventListener('click', function (e) {
      e.preventDefault();
      if (searchInput) {
        filterSettings.keyword = searchInput.value.trim();
        filterSettings.page = 1;
        currentPage = 1;
        loadHistoryData();
      }
    });
  }

  // 绑定重置过滤器按钮
  if (resetFilterBtn) {
    resetFilterBtn.addEventListener('click', function (e) {
      e.preventDefault();
      resetFilters();
    });
  }

  // 绑定分页按钮事件
  prevPageBtn.addEventListener('click', function () {
    if (currentPage > 1) {
      currentPage--;
      filterSettings.page = currentPage;
      loadHistoryData();
    }
  });

  nextPageBtn.addEventListener('click', function () {
    if (currentPage < totalPages) {
      currentPage++;
      filterSettings.page = currentPage;
      loadHistoryData();
    }
  });

  // 绑定导出按钮事件
  if (exportBtn) {
    exportBtn.addEventListener('click', exportHistoryData);
  }

  /**
   * 格式化日期为Input元素需要的格式
   * @param {Date} date 日期对象
   * @returns {string} 格式化的日期字符串 (YYYY-MM-DD)
   */
  function formatDateForInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 重置所有过滤器
   */
  function resetFilters() {
    // 重置下拉选择框
    historyTypeSelect.value = 'all';
    historyTeamSelect.value = 'all';
    historyActionSelect.value = 'all';

    // 重置日期
    startDateInput.value = formatDateForInput(thirtyDaysAgo);
    endDateInput.value = formatDateForInput(today);

    // 重置搜索框
    if (searchInput) {
      searchInput.value = '';
    }

    // 重置过滤器设置
    filterSettings = {
      type: 'all',
      team: 'all',
      action: 'all',
      startDate: startDateInput.value,
      endDate: endDateInput.value,
      keyword: '',
      page: 1,
      limit: 10
    };

    currentPage = 1;

    // 重新加载数据
    loadHistoryData();
  }

  /**
   * 加载用户所在的团队
   */
  function loadUserTeams() {
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
        // 清空团队选择器
        historyTeamSelect.innerHTML = '<option value="all">全部团队</option>';

        // 添加团队选项
        if (data.data && data.data.length > 0) {
          data.data.forEach(team => {
            const option = document.createElement('option');
            option.value = team.id;
            option.textContent = team.name;
            historyTeamSelect.appendChild(option);
          });
        }

        // 检查URL参数是否有预设的团队ID
        const urlParams = new URLSearchParams(window.location.search);
        const teamId = urlParams.get('team');
        if (teamId) {
          historyTeamSelect.value = teamId;
          filterSettings.team = teamId;
          loadHistoryData();
        }
      })
      .catch(error => {
        console.error('加载团队列表失败:', error);
        showNotification('加载团队列表失败，请稍后再试', 'error');
      });
  }

  /**
   * 加载历史记录数据
   * 使用后端提供的API接口获取历史记录
   */
  function loadHistoryData() {
    historyList.innerHTML = '<div class="team-loading">加载中...</div>';

    // 构建URL及参数
    const params = new URLSearchParams();
    if (filterSettings.type !== 'all') params.append('type', filterSettings.type);
    if (filterSettings.action !== 'all') params.append('action', filterSettings.action);
    if (filterSettings.startDate) params.append('startDate', filterSettings.startDate);
    if (filterSettings.endDate) params.append('endDate', filterSettings.endDate);
    if (filterSettings.keyword) params.append('keyword', filterSettings.keyword);
    params.append('page', filterSettings.page);
    params.append('limit', filterSettings.limit);

    // 确定API端点
    let url = `${API_BASE_URL}/api/history`;

    // 如果选择了特定团队，使用团队特定的历史记录API
    if (filterSettings.team !== 'all') {
      url = `${API_BASE_URL}/api/history/team/${filterSettings.team}`;
    }

    // 添加查询参数
    url = `${url}?${params.toString()}`;

    // 发起API请求
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取历史记录失败');
        }
        return response.json();
      })
      .then(data => {
        if (data.success) {
          // 更新历史记录数据
          historyData = data.data || [];
          // 更新分页信息
          currentPage = data.currentPage || 1;
          totalPages = data.totalPages || 1;

          // 更新结果计数显示
          updateResultCount(data.totalCount || 0);

          // 渲染分页和历史记录
          renderPagination();
          renderHistoryEntries();
        } else {
          throw new Error(data.message || '获取历史记录失败');
        }
      })
      .catch(error => {
        console.error('加载历史记录失败:', error);
        showNotification('加载历史记录失败，请稍后再试', 'error');

        // 出错时显示空状态
        historyList.innerHTML = '<div class="empty-message">加载历史记录失败，请稍后重试</div>';
        paginationElement.style.display = 'none';
      });
  }

  /**
   * 更新结果计数显示
   * @param {number} count 总记录数
   */
  function updateResultCount(count) {
    const countElement = document.getElementById('historyCount');
    if (countElement) {
      countElement.textContent = `找到 ${count} 条历史记录`;
    }
  }

  /**
   * 更新过滤器设置
   */
  function updateFilter() {
    filterSettings.type = historyTypeSelect.value;
    filterSettings.team = historyTeamSelect.value;
    filterSettings.action = historyActionSelect.value;
    filterSettings.startDate = startDateInput.value;
    filterSettings.endDate = endDateInput.value;
    filterSettings.page = 1; // 重置到第一页
    currentPage = 1;

    // 重新加载数据
    loadHistoryData();
  }

  /**
   * 渲染分页控件
   */
  function renderPagination() {
    // 如果没有数据，隐藏分页
    if (historyData.length === 0) {
      paginationElement.style.display = 'none';
      return;
    } else {
      paginationElement.style.display = 'flex';
    }

    // 更新上一页按钮状态
    if (currentPage <= 1) {
      prevPageBtn.classList.add('disabled');
    } else {
      prevPageBtn.classList.remove('disabled');
    }

    // 更新下一页按钮状态
    if (currentPage >= totalPages) {
      nextPageBtn.classList.add('disabled');
    } else {
      nextPageBtn.classList.remove('disabled');
    }

    // 重新生成页码按钮
    const pageButtons = paginationElement.querySelectorAll('.pagination-btn:not(#prevPage):not(#nextPage)');
    pageButtons.forEach(btn => btn.remove());

    // 决定显示哪些页码
    let startPage = Math.max(1, currentPage - 2);
    let endPage = Math.min(totalPages, startPage + 4);

    // 调整起始页，确保显示5个页码（如果有足够的页数）
    if (endPage - startPage < 4 && totalPages > 4) {
      startPage = Math.max(1, endPage - 4);
    }

    // 插入新的页码按钮
    for (let i = startPage; i <= endPage; i++) {
      const pageBtn = document.createElement('button');
      pageBtn.className = `pagination-btn ${i === currentPage ? 'active' : ''}`;
      pageBtn.textContent = i;
      pageBtn.addEventListener('click', function () {
        currentPage = i;
        filterSettings.page = i;
        loadHistoryData();
      });

      // 插入到"下一页"按钮之前
      paginationElement.insertBefore(pageBtn, nextPageBtn);
    }
  }

  /**
   * 渲染历史记录条目
   */
  function renderHistoryEntries() {
    // 如果没有数据
    if (historyData.length === 0) {
      historyList.innerHTML = '<div class="empty-message">没有符合条件的历史记录</div>';
      return;
    }

    historyList.innerHTML = '';

    historyData.forEach(entry => {
      const historyEntry = document.createElement('div');
      historyEntry.className = 'history-entry';

      // 根据类型决定图标
      let iconContent = '';
      if (entry.type === 'task') {
        iconContent = '<i class="icon-task"></i>';
      } else if (entry.type === 'team') {
        iconContent = '<i class="icon-team"></i>';
      } else if (entry.type === 'comment') {
        iconContent = '<i class="icon-comment"></i>';
      } else if (entry.type === 'system') {
        iconContent = '<i class="icon-system"></i>';
      }

      // 获取操作类型的文本
      const actionText = getActionText(entry.action);

      // 格式化日期
      const formattedDate = formatDate(entry.date);

      // 构建HTML
      historyEntry.innerHTML = `
        <div class="history-icon">${iconContent}</div>
        <div class="history-content">
          <div class="history-title">
            ${entry.link ? `<a href="${entry.link}">${entry.title}</a>` : entry.title}
          </div>
          <div class="history-meta">
            <div class="history-user">
              <img src="${entry.user?.avatar || 'images/default-avatar.png'}" alt="${entry.user?.name || '用户'}" onerror="this.src='images/default-avatar.png'">
              <span>${entry.user?.name || '用户'}</span>
            </div>
            <div class="history-date">
              <span>${formattedDate}</span>
            </div>
            <div class="history-action">
              <span>${actionText}</span>
            </div>
            <div class="history-type ${entry.type}">
              ${getTypeText(entry.type)}
            </div>
            ${entry.teamName ? `<div class="history-team">
              <span>团队: ${entry.teamName}</span>
            </div>` : ''}
          </div>
        </div>
      `;

      historyList.appendChild(historyEntry);
    });
  }

  /**
   * 获取操作类型对应的文本
   * @param {string} action 操作类型
   * @returns {string} 操作文本
   */
  function getActionText(action) {
    switch (action) {
      case 'create':
        return '创建';
      case 'update':
        return '更新';
      case 'delete':
        return '删除';
      case 'comment':
        return '评论';
      case 'assign':
        return '分配';
      case 'status':
        return '状态变更';
      default:
        return action || '操作';
    }
  }

  /**
   * 格式化日期
   * @param {Date|string} date 日期对象或日期字符串
   * @returns {string} 格式化的日期
   */
  function formatDate(date) {
    if (!date) return '';

    const dateObj = new Date(date);
    const now = new Date();
    const diffInSeconds = Math.floor((now - dateObj) / 1000);

    if (diffInSeconds < 60) {
      return '刚刚';
    }

    const diffInMinutes = Math.floor(diffInSeconds / 60);
    if (diffInMinutes < 60) {
      return `${diffInMinutes}分钟前`;
    }

    const diffInHours = Math.floor(diffInMinutes / 60);
    if (diffInHours < 24) {
      return `${diffInHours}小时前`;
    }

    const diffInDays = Math.floor(diffInHours / 24);
    if (diffInDays < 30) {
      return `${diffInDays}天前`;
    }

    // 超过30天，显示具体日期
    const year = dateObj.getFullYear();
    const month = String(dateObj.getMonth() + 1).padStart(2, '0');
    const day = String(dateObj.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  /**
   * 获取类型对应的文本
   * @param {string} type 类型
   * @returns {string} 类型文本
   */
  function getTypeText(type) {
    switch (type) {
      case 'task':
        return '任务';
      case 'team':
        return '团队';
      case 'comment':
        return '评论';
      case 'system':
        return '系统';
      default:
        return type;
    }
  }

  /**
   * 导出历史记录数据为CSV文件
   */
  function exportHistoryData() {
    // 显示导出中的提示
    showNotification('正在准备导出数据...', 'info');

    // 构建完整URL，获取所有符合条件的数据（不带分页限制）
    const params = new URLSearchParams();
    if (filterSettings.type !== 'all') params.append('type', filterSettings.type);
    if (filterSettings.action !== 'all') params.append('action', filterSettings.action);
    if (filterSettings.startDate) params.append('startDate', filterSettings.startDate);
    if (filterSettings.endDate) params.append('endDate', filterSettings.endDate);
    if (filterSettings.keyword) params.append('keyword', filterSettings.keyword);
    params.append('limit', 1000); // 设置较大的限制以获取更多数据

    // 确定API端点
    let url = `${API_BASE_URL}/api/history`;
    if (filterSettings.team !== 'all') {
      url = `${API_BASE_URL}/api/history/team/${filterSettings.team}`;
    }

    // 添加查询参数
    url = `${url}?${params.toString()}`;

    // 获取数据
    fetch(url, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    })
      .then(response => {
        if (!response.ok) {
          throw new Error('获取导出数据失败');
        }
        return response.json();
      })
      .then(data => {
        if (!data.success || !data.data) {
          throw new Error('导出数据格式不正确');
        }

        // 准备CSV数据
        const exportData = data.data;
        const headers = ['ID', '操作', '描述', '类型', '团队', '用户', '日期'];

        let csvContent = headers.join(',') + '\n';

        exportData.forEach(item => {
          const row = [
            item.id,
            getActionText(item.action),
            `"${(item.title || '').replace(/"/g, '""')}"`, // 处理引号
            getTypeText(item.type),
            `"${(item.teamName || '').replace(/"/g, '""')}"`,
            `"${(item.user?.name || '').replace(/"/g, '""')}"`,
            new Date(item.date).toLocaleString()
          ];

          csvContent += row.join(',') + '\n';
        });

        // 创建下载链接
        const encodedUri = encodeURI('data:text/csv;charset=utf-8,' + csvContent);
        const link = document.createElement('a');
        link.setAttribute('href', encodedUri);
        link.setAttribute('download', `历史记录_${new Date().toISOString().slice(0, 10)}.csv`);
        document.body.appendChild(link);

        // 触发下载
        link.click();
        document.body.removeChild(link);

        showNotification('历史记录导出成功', 'success');
      })
      .catch(error => {
        console.error('导出历史记录失败:', error);
        showNotification('导出失败: ' + error.message, 'error');
      });
  }

  /**
   * 显示通知
   * @param {string} message 消息内容
   * @param {string} type 通知类型 (success, error, info)
   */
  function showNotification(message, type = 'info') {
    // 检查是否已存在通知元素
    let notification = document.querySelector('.notification-popup');
    if (!notification) {
      notification = document.createElement('div');
      notification.className = 'notification-popup';
      document.body.appendChild(notification);
    }

    // 设置通知样式
    notification.className = `notification-popup ${type}`;
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
