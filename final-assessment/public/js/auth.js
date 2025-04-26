document.addEventListener('DOMContentLoaded', function () {
  // 获取登录表单
  const loginForm = document.getElementById('loginForm');

  // 添加提交事件监听器
  if (loginForm) {
    // 添加实时表单验证
    const usernameInput = document.getElementById('username');
    const passwordInput = document.getElementById('password');

    // 用户名/邮箱/手机号验证
    usernameInput.addEventListener('blur', function () {
      if (!usernameInput.value.trim()) {
        setError(usernameInput, '请输入用户名、邮箱或手机号');
      } else {
        clearError(usernameInput);
      }
    });

    // 密码验证
    passwordInput.addEventListener('blur', function () {
      if (!passwordInput.value.trim()) {
        setError(passwordInput, '请输入密码');
      } else {
        clearError(passwordInput);
      }
    });

    // 表单提交
    loginForm.addEventListener('submit', async function (e) {
      e.preventDefault();

      // 重置所有表单错误状态
      clearAllErrors(loginForm);

      // 获取输入
      const usernameOrEmailOrPhone = usernameInput.value.trim();
      const password = passwordInput.value.trim();

      // 表单验证
      let isValid = true;

      if (!usernameOrEmailOrPhone) {
        setError(usernameInput, '请输入用户名、邮箱或手机号');
        isValid = false;
      }

      if (!password) {
        setError(passwordInput, '请输入密码');
        isValid = false;
      }

      if (!isValid) return;

      // 判断输入类型
      const isEmail = usernameOrEmailOrPhone.includes('@');
      const isPhone = /^1\d{10}$/.test(usernameOrEmailOrPhone);

      // 构建请求数据
      const loginData = {
        password
      };

      // 根据输入类型设置对应字段
      if (isEmail) {
        loginData.email = usernameOrEmailOrPhone;
      } else if (isPhone) {
        loginData.phone = usernameOrEmailOrPhone;
      } else {
        loginData.username = usernameOrEmailOrPhone;
      }

      // 显示加载状态
      const submitBtn = loginForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = '登录中...';
      submitBtn.disabled = true;

      try {
        // 发送登录请求
        const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(loginData)
        });

        const data = await response.json();

        if (!response.ok) {
          // 显示更详细的错误信息
          const errorMsg = data.message || (data.errors && data.errors[0].msg) || '登录失败';

          // 根据错误类型设置错误信息
          if (errorMsg.includes('邮箱') || errorMsg.includes('用户名') || errorMsg.includes('手机号')) {
            setError(usernameInput, errorMsg);
          } else if (errorMsg.includes('密码')) {
            setError(passwordInput, errorMsg);
          } else {
            // 创建通用错误提示
            showFormMessage(loginForm, errorMsg, 'error');
          }

          // 恢复按钮状态
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
          return;
        }

        // 登录成功，保存令牌
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // 显示成功消息
        showFormMessage(loginForm, '登录成功，正在跳转...', 'success');

        // 延迟跳转到仪表盘页面
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1000);
      } catch (error) {
        console.error('登录请求失败:', error);
        showFormMessage(loginForm, '登录失败，请稍后再试', 'error');

        // 恢复按钮状态
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }

  // 辅助函数：设置表单错误
  function setError(input, message) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.add('error');
    formGroup.classList.remove('success');

    // 检查是否已有错误提示，如果没有则创建
    let errorText = formGroup.querySelector('.form-text');
    if (!errorText) {
      errorText = document.createElement('small');
      errorText.className = 'form-text';
      formGroup.appendChild(errorText);
    }
    errorText.textContent = message;
  }

  // 辅助函数：清除表单错误
  function clearError(input) {
    const formGroup = input.closest('.form-group');
    formGroup.classList.remove('error');
    formGroup.classList.add('success');

    const errorText = formGroup.querySelector('.form-text');
    if (errorText) {
      errorText.textContent = '';
    }
  }

  // 辅助函数：清除所有错误
  function clearAllErrors(form) {
    const formGroups = form.querySelectorAll('.form-group');
    formGroups.forEach(group => {
      group.classList.remove('error');
      const errorText = group.querySelector('.form-text');
      if (errorText) {
        errorText.textContent = '';
      }
    });

    // 清除通用消息
    const message = form.querySelector('.form-message');
    if (message) {
      message.remove();
    }
  }

  // 辅助函数：显示表单消息
  function showFormMessage(form, message, type = 'error') {
    // 移除现有消息
    const existingMessage = form.querySelector('.form-message');
    if (existingMessage) {
      existingMessage.remove();
    }

    // 创建新消息
    const messageElement = document.createElement('div');
    messageElement.className = `form-message ${type}`;
    messageElement.textContent = message;
    messageElement.style.padding = '10px';
    messageElement.style.marginTop = '1rem';
    messageElement.style.borderRadius = '4px';
    messageElement.style.textAlign = 'center';

    if (type === 'error') {
      messageElement.style.backgroundColor = '#f8d7da';
      messageElement.style.color = '#721c24';
    } else if (type === 'success') {
      messageElement.style.backgroundColor = '#d4edda';
      messageElement.style.color = '#155724';
    }

    // 插入到表单操作区之前
    const formActions = form.querySelector('.form-actions');
    form.insertBefore(messageElement, formActions);
  }
});