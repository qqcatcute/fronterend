document.addEventListener('DOMContentLoaded', function () {
  // 获取注册表单
  const registerForm = document.getElementById('registerForm');

  // 添加提交事件监听器
  if (registerForm) {
    // 添加更好的表单验证
    const usernameInput = document.getElementById('username');
    const emailInput = document.getElementById('email');
    const phoneInput = document.getElementById('phone');
    const passwordInput = document.getElementById('password');
    const confirmPasswordInput = document.getElementById('confirmPassword');

    // 设置表单错误函数
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

    // 清除表单错误函数
    function clearError(input) {
      const formGroup = input.closest('.form-group');
      formGroup.classList.remove('error');
      formGroup.classList.add('success');
      const errorText = formGroup.querySelector('.form-text');
      if (errorText) {
        errorText.textContent = '';
      }
    }

    // 清除所有错误函数
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

    // 显示表单消息函数
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

    // 手机号验证
    phoneInput.addEventListener('blur', function () {
      const phoneValue = phoneInput.value.trim();
      if (phoneValue && !/^1\d{10}$/.test(phoneValue)) {
        setError(phoneInput, '请输入11位有效的手机号码');
      } else {
        clearError(phoneInput);
      }
    });

    registerForm.addEventListener('submit', async function (e) {
      e.preventDefault();
      // 清除所有错误
      clearAllErrors(registerForm);

      // 获取输入
      const username = usernameInput.value.trim();
      const email = emailInput.value.trim();
      const phone = phoneInput.value.trim();
      const password = passwordInput.value.trim();
      const confirmPassword = confirmPasswordInput.value.trim();

      // 表单验证
      let isValid = true;

      if (!username) {
        setError(usernameInput, '请输入用户名');
        isValid = false;
      }

      // 检查邮箱和手机号至少有一个
      if (!email && !phone) {
        setError(emailInput, '邮箱和手机号至少填写一项');
        isValid = false;
      }

      if (email && !email.includes('@')) {
        setError(emailInput, '请输入有效的邮箱地址');
        isValid = false;
      }

      if (phone && !/^1\d{10}$/.test(phone)) {
        setError(phoneInput, '请输入11位有效的手机号码');
        isValid = false;
      }

      if (!password) {
        setError(passwordInput, '请输入密码');
        isValid = false;
      } else if (password.length < 6) {
        setError(passwordInput, '密码长度至少为6个字符');
        isValid = false;
      }

      if (!confirmPassword) {
        setError(confirmPasswordInput, '请确认密码');
        isValid = false;
      } else if (password !== confirmPassword) {
        setError(confirmPasswordInput, '两次输入的密码不匹配');
        isValid = false;
      }

      if (!isValid) return;

      // 构建请求数据
      const registerData = {
        username,
        password
      };

      // 只添加有值的字段
      if (email) registerData.email = email;
      if (phone) registerData.phone = phone;

      // 显示加载状态
      const submitBtn = registerForm.querySelector('button[type="submit"]');
      const originalBtnText = submitBtn.textContent;
      submitBtn.textContent = '注册中...';
      submitBtn.disabled = true;

      try {
        // 发送注册请求
        const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(registerData)
        });

        const data = await response.json();

        if (!response.ok) {
          // 显示更详细的错误信息
          const errorMsg = data.message || data.detail || (data.errors && data.errors[0].msg) || '注册失败';

          // 处理特定错误
          if (errorMsg.includes('邮箱已被注册')) {
            setError(emailInput, '邮箱已被注册');
          } else if (errorMsg.includes('用户名已被使用')) {
            setError(usernameInput, '用户名已被使用');
          } else if (errorMsg.includes('手机号已被注册')) {
            setError(phoneInput, '手机号已被注册');
          } else {
            // 显示通用错误
            showFormMessage(registerForm, errorMsg, 'error');
          }

          // 恢复按钮状态
          submitBtn.textContent = originalBtnText;
          submitBtn.disabled = false;
          return;
        }

        // 注册成功，显示成功消息
        showFormMessage(registerForm, '注册成功，正在跳转...', 'success');

        // 保存令牌
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));

        // 延迟跳转到仪表盘页面
        setTimeout(() => {
          window.location.href = 'dashboard.html';
        }, 1500);
      } catch (error) {
        console.error('注册请求失败:', error);
        showFormMessage(registerForm, '注册失败，请稍后再试', 'error');

        // 恢复按钮状态
        submitBtn.textContent = originalBtnText;
        submitBtn.disabled = false;
      }
    });
  }
});