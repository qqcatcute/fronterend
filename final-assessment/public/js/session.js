document.addEventListener('DOMContentLoaded', function () {
  // 当前页面路径
  const currentPath = window.location.pathname;
  const authPages = ['/index.html', '/register.html', '/'];
  const protectedPages = [
    '/dashboard.html',
    '/teams.html',
    '/tasks.html',
    '/settings.html',
    '/history.html',
    '/notifications.html',
    '/team-details.html',
    '/task-details.html',
    // 添加其他可能需要保护的页面
    '/branch-management.html',
    '/merge-requests.html',
    '/commit-history.html'
  ];

  // 检查用户是否已登录
  function isLoggedIn() {
    return localStorage.getItem('token') !== null;
  }

  // 处理页面重定向逻辑
  function handleRedirection() {
    const loggedIn = isLoggedIn();
    // 如果用户已登录但访问登录/注册页面，重定向到仪表盘
    if (loggedIn && authPages.some(page => currentPath.endsWith(page))) {
      window.location.href = 'dashboard.html';
      return;
    }

    // 如果用户未登录但访问受保护页面，重定向到登录页
    if (!loggedIn && protectedPages.some(page => currentPath.endsWith(page))) {
      window.location.href = 'index.html';
      return;
    }
  }

  // 处理仪表盘页面的用户信息显示
  function setupDashboard() {
    // 仅在dashboard.html或其他受保护页面上执行
    if (!protectedPages.some(page => currentPath.endsWith(page))) return;

    // 确保用户已登录
    if (!isLoggedIn()) return;

    try {
      // 获取用户信息
      const userData = JSON.parse(localStorage.getItem('user'));
      if (!userData) return;

      // 更新用户名显示
      const usernameElements = document.querySelectorAll('.username');
      usernameElements.forEach(element => {
        if (userData.username) {
          element.textContent = userData.username;
        }
      });

      // 更新用户头像 - 确保所有页面使用一致的URL格式
      // 在 session.js 中
      const avatarElements = document.querySelectorAll('.user-profile img');
      avatarElements.forEach(element => {
        if (userData.avatar) {
          // 简化头像URL构建
          // 修正后的代码
          element.src = userData.avatar.startsWith('http')
            ? userData.avatar
            : (API_BASE_URL + (userData.avatar.startsWith('/') ? '' : '/') + userData.avatar);

          // 添加错误处理
          element.onerror = function () {
            element.src = API_BASE_URL + '/uploads/avatars/default-avatar.jpg';
          };
        }
      });

      // 设置用户下拉菜单和注销功能
      setupUserDropdown();
    } catch (error) {
      console.error('处理用户信息时出错:', error);
    }
  }

  // 设置用户下拉菜单
  function setupUserDropdown() {
    const userProfileElement = document.querySelector('.user-profile');
    if (userProfileElement) {
      userProfileElement.addEventListener('click', function () {
        // 创建一个简单的下拉菜单
        const dropdown = document.createElement('div');
        dropdown.className = 'user-dropdown';
        dropdown.innerHTML = `
                <ul>
                <li><a href="settings.html">个人设置</a></li>
                <li><a href="#" id="logout-btn">退出登录</a></li>
                </ul>
                `;

        // 设置样式
        dropdown.style.position = 'fixed';
        dropdown.style.top = '60px';
        dropdown.style.right = '20px';
        dropdown.style.backgroundColor = 'white';
        dropdown.style.border = '1px solid #e1e4e8';
        dropdown.style.borderRadius = '4px';
        dropdown.style.boxShadow = '0 2px 10px rgba(0, 0, 0, 0.1)';
        dropdown.style.zIndex = '1000';

        // 下拉菜单项样式
        const style = document.createElement('style');
        style.textContent = `
                .user-dropdown ul {
                list-style: none;
                padding: 0;
                margin: 0;
                }
                .user-dropdown li {
                padding: 0;
                }
                .user-dropdown a {
                display: block;
                padding: 10px 15px;
                text-decoration: none;
                color: #333;
                }
                .user-dropdown a:hover {
                background-color: #f6f8fa;
                }
                `;
        document.head.appendChild(style);

        // 检查是否已存在下拉菜单
        const existingDropdown = document.querySelector('.user-dropdown');
        if (existingDropdown) {
          existingDropdown.remove();
        } else {
          document.body.appendChild(dropdown);

          // 添加注销功能
          document.getElementById('logout-btn').addEventListener('click', function (e) {
            e.preventDefault();
            // 发送注销请求
            fetch(`${API_BASE_URL}/api/auth/logout`, {
              headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}`
              }
            })
              .then(response => {
                // 无论响应如何，都清除本地存储
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                // 重定向到登录页
                window.location.href = 'index.html';
              })
              .catch(error => {
                console.error('注销请求失败:', error);
                // 出错也清除本地存储并重定向
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                window.location.href = 'index.html';
              });
          });

          // 点击其他区域关闭下拉菜单
          document.addEventListener('click', function closeDropdown(e) {
            if (!dropdown.contains(e.target) && !userProfileElement.contains(e.target)) {
              dropdown.remove();
              document.removeEventListener('click', closeDropdown);
            }
          });
        }
      });
    }
  }

  // 执行重定向检查
  handleRedirection();

  // 设置仪表盘功能
  setupDashboard();
});