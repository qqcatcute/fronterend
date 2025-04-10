document.addEventListener('DOMContentLoaded', () => {

  // =============================
  // 0. 定义保存与加载数据的函数

  // map：对数组元素执行传入的函数 返回由函数返回结果组成的新数组
  // 用了三元表达式来进行本地存储
  function saveData() {
    const data = {
      activeTasks: activeTasks.map(task => {
        const contentDiv = task.querySelector('.todo-content');
        return {
          text: contentDiv ? contentDiv.textContent : '',
          completed: contentDiv ? contentDiv.classList.contains('completed') : false
        };
      }),
      deletedTasks: deletedTasks.map(task => {
        const contentDiv = task.querySelector('.todo-content');
        return {
          text: contentDiv ? contentDiv.textContent : '',
          completed: contentDiv ? contentDiv.classList.contains('completed') : false
        };
      })
    };
    localStorage.setItem('todoData', JSON.stringify(data));
  }
  // 创建新节点
  // 找到父元素 添加新节点
  function loadData() {
    const dataString = localStorage.getItem('todoData');
    if (!dataString) return;
    try {
      const data = JSON.parse(dataString);
      if (data.activeTasks && Array.isArray(data.activeTasks)) {
        data.activeTasks.forEach(taskObj => {
          const li = createTaskElement(taskObj.text, taskObj.completed, false);
          activeTasks.push(li);
        });
      }
      // 故意忽略 data.deletedTasks，确保刷新时回收站为空
      renderActive();

      // 如果 activeTasks 非空且回收站按钮不存在，则创建回收站按钮
      if (activeTasks.length > 0 && !document.querySelector('.action-deleted')) {
        const recycleLi = document.createElement('li');
        const recycleBtn = document.createElement('input');
        recycleBtn.type = 'button';
        recycleBtn.value = '回收站';
        recycleBtn.classList.add('btn-small', 'action-deleted');
        recycleLi.appendChild(recycleBtn);
        document.querySelector('.todo-func-list.filter').appendChild(recycleLi);
      }

      // 检查 activeTasks 中是否有任务的 todo-content 元素带有 completed 类
      const hasCompletedTask = activeTasks.some(li => {
        const todoContent = li.querySelector('.todo-content');
        return todoContent && todoContent.classList.contains('completed');
      });

      // 如果存在已完成的任务且未创建“已完成”按钮，则创建该按钮
      if (hasCompletedTask && !document.querySelector('.action-completed')) {
        const completedLi = document.createElement('li');
        const completedBtn = document.createElement('input');
        completedBtn.type = 'button';
        completedBtn.value = '已完成';
        completedBtn.classList.add('btn-small', 'action-completed', 'selected');
        completedLi.appendChild(completedBtn);
        document.querySelector('.todo-func-list.filter').appendChild(completedLi);
      }

      // 初始化批量按钮（确保“全部标为已完成”和“清除全部”按钮存在）
      initBatchButtons();
    } catch (e) {
      console.error('加载数据失败', e);
    }
  }

  // 辅助函数，用于创建任务的 DOM 元素
  function createTaskElement(text, completed, isDeleted) {
    const li = document.createElement('li');
    li.classList.add('todo-item');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('todo-content');
    contentDiv.textContent = text;
    if (completed) {
      contentDiv.classList.add('completed');
    }
    // 如果检测到数据里边有完成的 就给这个类名添加完成的类名
    li.appendChild(contentDiv);
    // 按钮删除 恢复的代码逻辑
    if (!isDeleted) {
      const finishBtn = document.createElement('div');
      finishBtn.classList.add('todo-btn', completed ? 'btn-unfinish' : 'btn-finish');
      if (completed) {
        const icon = document.createElement('img');
        icon.src = "images/dagou.svg";
        icon.alt = "标为未完成";
        icon.className = "icon-finish";
        finishBtn.appendChild(icon);
      }
      li.appendChild(finishBtn);

      const deleteBtn = document.createElement('div');
      deleteBtn.classList.add('todo-btn', 'btn-delete');
      const deleteImg = document.createElement('img');
      deleteImg.src = "images/delete.svg";
      deleteImg.alt = "删除";
      deleteBtn.appendChild(deleteImg);
      li.appendChild(deleteBtn);
    } else {
      const restoreBtn = document.createElement('div');
      restoreBtn.classList.add('todo-btn', 'btn-restore');
      const restoreImg = document.createElement('img');
      restoreImg.src = "images/restore.svg";
      restoreImg.alt = "恢复";
      restoreBtn.appendChild(restoreImg);
      li.appendChild(restoreBtn);

      const finishBtn = document.createElement('div');
      finishBtn.classList.add('todo-btn', completed ? 'btn-unfinish' : 'btn-finish');
      if (completed) {
        const icon = document.createElement('img');
        icon.src = "images/dagou.svg";
        icon.alt = "标为未完成";
        icon.className = "icon-finish";
        finishBtn.appendChild(icon);
      }
      li.appendChild(finishBtn);
    }
    return li;
  }

  // =============================
  // 1. 语言切换逻辑 其实并没有实现想要的功能 存了个数组进去切换 练习一下而已。。
  const languageLinks = document.querySelectorAll('.language a');
  const languageData = {
    en: {
      title: "Todo List Online - Simple Web-based Todo List",
      about: "About Me",
      placeholder: "Add a new todo...",
      submit: "Submit",
      tips: {
        0: "Add your first todo!",
        1: "Usage tips:",
        2: "✔️ All submissions support Enter key.",
        3: "✔️ Drag tasks to reorder (PC only).",
        4: "✔️ Double-click the title and Todo to edit.",
        5: "✔️ The right window is for quick actions.",
        6: "🔒 All Todo data is stored locally in the browser.",
        7: "📝 Supports import and export, import will append to the current list."
      }
    },
    zh: {
      title: "Todo List 在线极简设计版",
      about: "关于我",
      placeholder: "新增待办事项...",
      submit: "提交",
      tips: {
        0: "添加你的第一个待办事项！",
        1: "食用方法：",
        2: "✔️ 所有提交作支持Enter回车键提交",
        3: "✔️ 拖拽Todo上下移动可排序（仅支持PC）",
        4: "✔️ 双击上面的标语和 Todo 可进行编辑",
        5: "✔️ 右侧的小窗口是快捷操作哦",
        6: "🔒 所有的Todo数据存储在浏览器本地",
        7: "📝 支持下载和导入，导入追加到当前序列"
      }
    }
  };

  function switchLanguage(language) {
    document.querySelector('title').textContent = languageData[language].title;
    document.querySelector('.info-ico').textContent = languageData[language].about;
    document.querySelector('.add-content').placeholder = languageData[language].placeholder;
    document.querySelector('.submit-btn').textContent = languageData[language].submit;
    const tips = document.querySelectorAll('.empty-tips li');
    tips.forEach((tip, index) => {
      tip.textContent = languageData[language].tips[index];
    });
  }

  languageLinks.forEach(link => {
    link.addEventListener('click', function (event) {
      event.preventDefault();
      languageLinks.forEach(link => link.classList.remove('active'));
      this.classList.add('active');
      const selectedLanguage = this.classList.contains('en') ? 'en' : 'zh';
      switchLanguage(selectedLanguage);
    });
  });

  // 默认语言设为中文
  switchLanguage('zh');
  // =============================
  // 2. 快捷开关逻辑
  document.querySelector('.shortcut-title').addEventListener('click', function () {
    const shortcutSwitch = document.querySelector('.shortcut-switch');
    shortcutSwitch.classList.toggle('fold');
    const footerBox = document.querySelector('.todo-footer-box');
    footerBox.style.display = (footerBox.style.display === 'none') ? 'block' : 'none';
    const shortcutTitle = document.querySelector('.shortcut-title');
    shortcutTitle.textContent = shortcutSwitch.classList.contains('fold') ? '关' : '开✨';
  });

  // =============================
  // 3. 待办事项管理（使用数组管理 activeTasks 和 deletedTasks）
  let activeTasks = [];
  let deletedTasks = [];

  // 定义更新选中状态的函数，确保四个按钮只有一个被选中，使用的方法与轮播图小圆点一致
  function updateSelected(selectedBtn) {
    const btns = document.querySelectorAll('.action-showAll, .action-deleted, .action-completed, .action-progress');
    btns.forEach(btn => btn.classList.remove('selected'));
    if (selectedBtn) {
      selectedBtn.classList.add('selected');
    }
  }

  // 初始时默认“全部”按钮被选中
  const initialAllBtn = document.querySelector('.action-showAll');
  if (initialAllBtn) {
    initialAllBtn.classList.add('selected');
  }

  // 更新 todo-list 显示 activeTasks
  function renderActive() {
    const todoList = document.querySelector('.todo-list');
    todoList.innerHTML = '';
    activeTasks.forEach(task => {
      todoList.appendChild(task);
    });
    updateEmptyTips();
    updateFilterButtons();
    saveData();
  }

  // 显示 deletedTasks（回收站）
  function renderDeleted() {
    const todoList = document.querySelector('.todo-list');
    todoList.innerHTML = '';
    deletedTasks.forEach(task => {
      todoList.appendChild(task);
    });
    updateEmptyTips();
    document.querySelector('.empty-tips').style.display = 'none';
    saveData();
  }

  // 根据任务数量更新 empty-tips 显示
  function updateEmptyTips() {
    const todoList = document.querySelector('.todo-list');
    document.querySelector('.empty-tips').style.display = (todoList.children.length === 0) ? 'block' : 'none';
  }

  // 初始化批量操作按钮：确保“全部标为已完成”和“清除全部”按钮存在
  function initBatchButtons() {
    const batchList = document.querySelector('.todo-func-list.batch');
    if (batchList && batchList.children.length === 0) {
      const liCompletedAll = document.createElement('li');
      const btnCompletedAll = document.createElement('input');
      btnCompletedAll.type = 'button';
      btnCompletedAll.value = '全部标为已完成';
      btnCompletedAll.classList.add('btn-small', 'completed-all');
      liCompletedAll.appendChild(btnCompletedAll);

      const liClearAll = document.createElement('li');
      const btnClearAll = document.createElement('input');
      btnClearAll.type = 'button';
      btnClearAll.value = '清除全部';
      btnClearAll.classList.add('btn-small', 'clear-all');
      liClearAll.appendChild(btnClearAll);

      batchList.appendChild(liCompletedAll);
      batchList.appendChild(liClearAll);
    }
  }

  // 添加任务函数
  function addTodo() {
    const inputElement = document.querySelector('.add-content');
    const todoText = inputElement.value.trim();
    if (todoText === '') {
      alert('请输入待办事项内容！');
      return;
    }
    const li = document.createElement('li');
    li.classList.add('todo-item');

    const contentDiv = document.createElement('div');
    contentDiv.classList.add('todo-content');
    contentDiv.textContent = todoText;

    const finishBtn = document.createElement('div');
    finishBtn.classList.add('todo-btn', 'btn-finish');

    const deleteBtn = document.createElement('div');
    deleteBtn.classList.add('todo-btn', 'btn-delete');
    const deleteImg = document.createElement('img');
    deleteImg.src = "images/delete.svg";
    deleteImg.alt = "删除";
    deleteBtn.appendChild(deleteImg);

    li.appendChild(contentDiv);
    li.appendChild(finishBtn);
    li.appendChild(deleteBtn);

    activeTasks.unshift(li);
    renderActive();
    inputElement.value = '';

    if (activeTasks.length > 0 && !document.querySelector('.action-deleted')) {
      const recycleLi = document.createElement('li');
      const recycleBtn = document.createElement('input');
      recycleBtn.type = 'button';
      recycleBtn.value = '回收站';
      recycleBtn.classList.add('btn-small', 'action-deleted');
      recycleLi.appendChild(recycleBtn);
      document.querySelector('.todo-func-list.filter').appendChild(recycleLi);
    }

    // 初始化批量按钮，调用函数
    initBatchButtons();

    const dataSaveList = document.querySelector('.todo-func-list.datasave');
    if (!dataSaveList.querySelector('#download')) {
      const liDownload = document.createElement('li');
      const btnDownload = document.createElement('input');
      btnDownload.type = 'button';
      btnDownload.value = '导出数据';
      btnDownload.id = 'download';
      btnDownload.classList.add('btn-small', 'action-download');
      btnDownload.setAttribute('onclick', 'handleClickDownload()');
      liDownload.appendChild(btnDownload);
      dataSaveList.appendChild(liDownload);
    }
    saveData();
  }

  // 绑定添加任务事件：点击按钮和键盘回车
  document.querySelector('.submit-btn').addEventListener('click', addTodo);
  document.querySelector('.add-content').addEventListener('keyup', (e) => {
    if (e.key === 'Enter') addTodo();
  });
  // =============================
  //  导入功能的实现
  // 为导入按钮（class="action-import"）添加事件监听，
  // 当点击时触发隐藏的文件输入框，读取选中文件，并解析内容生成新的任务，追加到任务列表最上方。
  document.querySelector('.action-import').addEventListener('click', function () {
    // 此处获取按钮旁边的隐藏 file 输入框
    const fileInput = this.nextElementSibling;
    fileInput.click();
    // 绑定 change 事件，确保每次仅绑定一次
    fileInput.addEventListener('change', function (e) {
      const file = this.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = function (e) {
        const content = e.target.result;
        let importedTasks = [];
        try {
          // 尝试解析 JSON 格式
          importedTasks = JSON.parse(content);
          if (!Array.isArray(importedTasks)) {
            importedTasks = [importedTasks];
          }
        } catch (err) {
          // 如果不是 JSON，是TXT则按每行一个任务的文本格式解析
          importedTasks = content.split('\n')
            .filter(line => line.trim() !== '')
            .map(line => ({ text: line.trim(), completed: false }));
        }
        // 将导入的任务逆序插入，保证文件中第一行任务出现在最上方，好像还有另外一个函数方法
        importedTasks.reverse().forEach(task => {
          const li = createTaskElement(task.text, task.completed, false);
          // 添加到全局 activeTasks 数组最前端
          activeTasks.unshift(li);
          // 同时在页面上插入到任务列表的最上方
          const todoList = document.querySelector('.todo-list');
          todoList.insertBefore(li, todoList.firstChild);
        });
        // 更新显示和保存数据
        renderActive();
      };
      reader.readAsText(file);
    }, { once: true });
  });
  // =============================
  //  导出功能的实现
  // handleClickDownload为将当前任务数据转换为 JSON 格式，并生成下载链接
  window.handleClickDownload = function () {
    // 提取当前 activeTasks 数据
    const tasksToExport = activeTasks.map(task => {
      const contentDiv = task.querySelector('.todo-content');
      return {
        text: contentDiv ? contentDiv.textContent : '',
        completed: contentDiv ? contentDiv.classList.contains('completed') : false
      };
    });
    // 转换为格式化后的 JSON 字符串
    const dataStr = JSON.stringify(tasksToExport, null, 2);
    // 创建 Blob 对象 这是啥。。
    const blob = new Blob([dataStr], { type: "application/json" });
    // 生成下载链接
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "tasks.json"; // 设置下载文件名
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };
  // =============================
  // 4. 事件委托处理各类任务操作 即冒泡事件
  document.addEventListener('click', function (e) {
    // 删除任务
    if (e.target.closest('.btn-delete')) {
      const li = e.target.closest('li.todo-item');
      if (li) {
        const index = activeTasks.indexOf(li);
        if (index !== -1) {
          activeTasks.splice(index, 1);
          const deleteBtn = li.querySelector('.btn-delete');
          if (deleteBtn) {
            deleteBtn.parentElement.removeChild(deleteBtn);
          }
          const restoreBtn = document.createElement('div');
          restoreBtn.classList.add('todo-btn', 'btn-restore');
          const restoreImg = document.createElement('img');
          restoreImg.src = "images/restore.svg";
          restoreImg.alt = "恢复";
          restoreBtn.appendChild(restoreImg);
          li.appendChild(restoreBtn);

          deletedTasks.push(li);
          renderActive();
        }
      }
    }

    // 处理恢复功能
    document.addEventListener('click', function (e) {
      const restoreBtn = e.target.closest('.btn-restore');
      if (restoreBtn) {
        // 阻止冒泡
        e.stopPropagation();
        const li = restoreBtn.closest('li.todo-item');
        if (li) {
          const index = deletedTasks.indexOf(li);
          if (index !== -1) {
            // 删掉一个 换掉恢复按钮
            deletedTasks.splice(index, 1);
            restoreBtn.parentElement.removeChild(restoreBtn);

            const deleteBtn = document.createElement('div');
            deleteBtn.classList.add('todo-btn', 'btn-delete');
            const deleteImg = document.createElement('img');
            deleteImg.src = "images/delete.svg";
            deleteImg.alt = "删除";
            deleteBtn.appendChild(deleteImg);
            li.appendChild(deleteBtn);

            const contentDiv = li.querySelector('.todo-content');
            const finishBtn = document.createElement('div');
            finishBtn.classList.add('todo-btn', contentDiv.classList.contains('completed') ? 'btn-unfinish' : 'btn-finish');
            if (contentDiv.classList.contains('completed')) {
              const icon = document.createElement('img');
              icon.src = "images/dagou.svg";
              icon.alt = "标为未完成";
              icon.className = "icon-finish";
              finishBtn.appendChild(icon);
            }
            li.appendChild(finishBtn);

            activeTasks.push(li);
            renderActive();
            const showAllBtn = document.querySelector('.action-showAll');
            if (showAllBtn) {
              updateSelected(showAllBtn);
            }
            const deletedBtn = document.querySelector('.action-deleted');
            if (deletedBtn) {
              deletedBtn.classList.remove('selected');
            }
          }
        }
        return;
      }
    });

    // 清除全部：将所有 activeTasks 移到 deletedTasks
    if (e.target.closest('.clear-all')) {
      while (activeTasks.length > 0) {
        const task = activeTasks.pop();

        // 移除删除按钮
        const deleteBtn = task.querySelector('.btn-delete');
        if (deleteBtn) {
          deleteBtn.remove();
        }

        // 添加恢复按钮（如果还没有的话）
        if (!task.querySelector('.btn-restore')) {
          const restoreBtn = document.createElement('div');
          restoreBtn.classList.add('todo-btn', 'btn-restore');
          const restoreImg = document.createElement('img');
          restoreImg.src = "images/restore.svg";
          restoreImg.alt = "恢复";
          restoreBtn.appendChild(restoreImg);
          task.appendChild(restoreBtn);
        }

        // 将任务移入 deletedTasks
        deletedTasks.push(task);
      }
      // 更新视图：显示回收站任务列表
      renderDeleted();
    }


    // 回收站：点击回收站按钮，显示 deletedTasks，并更新选中状态
    if (e.target.closest('.action-deleted')) {
      updateSelected(e.target.closest('.action-deleted'));
      renderDeleted();
    }

    // 显示全部任务：点击“全部”按钮
    if (e.target.closest('.action-showAll')) {
      updateSelected(e.target.closest('.action-showAll'));
      renderActive();
    }

    // “全部标为已完成”
    if (e.target.closest('.btn-allFinish') || e.target.closest('.completed-all')) {
      document.querySelectorAll('li.todo-item').forEach(li => {
        const contentDiv = li.querySelector('.todo-content');
        if (contentDiv && !contentDiv.classList.contains('completed')) {
          contentDiv.classList.add('completed');
        }
        const finishBtn = li.querySelector('.todo-btn.btn-finish, .todo-btn.btn-unfinish');
        if (finishBtn) {
          finishBtn.classList.remove('btn-finish');
          finishBtn.classList.add('btn-unfinish');
          if (!finishBtn.querySelector('.icon-finish')) {
            const icon = document.createElement('img');
            icon.src = "images/dagou.svg";
            icon.alt = "标为未完成";
            icon.className = "icon-finish";
            finishBtn.appendChild(icon);
          }
        }
      });
      saveData();
    }

    // 单个任务完成/未完成切换
    const targetBtn = e.target.closest('.btn-finish, .btn-unfinish');
    if (targetBtn) {
      const li = targetBtn.closest('li.todo-item');
      if (!li) return;
      const contentDiv = li.querySelector('.todo-content');
      if (!contentDiv) return;
      if (contentDiv.classList.contains('completed')) {
        contentDiv.classList.remove('completed');
        targetBtn.classList.remove('btn-unfinish');
        targetBtn.classList.add('btn-finish');
        const icon = targetBtn.querySelector('.icon-finish');
        if (icon) {
          targetBtn.removeChild(icon);
        }
      } else {
        contentDiv.classList.add('completed');
        targetBtn.classList.remove('btn-finish');
        targetBtn.classList.add('btn-unfinish');
        if (!targetBtn.querySelector('.icon-finish')) {
          const icon = document.createElement('img');
          icon.src = "images/dagou.svg";
          icon.alt = "标为未完成";
          icon.className = "icon-finish";
          targetBtn.appendChild(icon);
        }
        if (!document.querySelector('.btn-small.action-completed')) {
          const liBtn = document.createElement('li');
          const completedBtn = document.createElement('input');
          completedBtn.type = 'button';
          completedBtn.value = '已完成';
          completedBtn.classList.add('btn-small', 'action-completed');
          liBtn.appendChild(completedBtn);
          const filterUl = document.querySelector('.todo-func-list.filter');
          if (filterUl) {
            filterUl.appendChild(liBtn);
          }
        }
      }
      saveData();
    }
  });

  // 另一个清除全部任务的事件委托 这个功能好像殉职了好崩溃
  document.addEventListener('click', function (e) {
    if (e.target.closest('.clear-all')) {
      const todoList = document.querySelector('.todo-list');
      todoList.innerHTML = '';
      document.querySelector('.empty-tips').style.display = 'block';
      saveData();
    }
  });

  // 更新过滤按钮区域
  function updateFilterButtons() {
    const filterUl = document.querySelector('.todo-func-list.filter');
    filterUl.querySelectorAll('li').forEach(li => {
      const btn = li.querySelector('input');
      if (btn && (btn.classList.contains('action-completed') || btn.classList.contains('action-progress'))) {
        li.remove();
      }
    });
    let hasCompleted = false;
    let hasProgress = false;
    activeTasks.forEach(task => {
      const contentDiv = task.querySelector('.todo-content');
      if (contentDiv) {
        if (contentDiv.classList.contains('completed')) {
          hasCompleted = true;
        } else {
          hasProgress = true;
        }
      }
    });
    if (hasCompleted) {
      const li = document.createElement('li');
      const btn = document.createElement('input');
      btn.type = 'button';
      btn.value = '已完成';
      btn.classList.add('btn-small', 'action-completed');
      li.appendChild(btn);
      filterUl.appendChild(li);
    }
    if (hasProgress) {
      const li = document.createElement('li');
      const btn = document.createElement('input');
      btn.type = 'button';
      btn.value = '进行中';
      btn.classList.add('btn-small', 'action-progress');
      li.appendChild(btn);
      filterUl.appendChild(li);
    }
    const batchUl = document.querySelector('.todo-func-list.batch');
    batchUl.querySelectorAll('li').forEach(li => {
      const btn = li.querySelector('input');
      if (btn && btn.classList.contains('completed-clear')) {
        li.remove();
      }
    });
    if (hasCompleted) {
      const li = document.createElement('li');
      const btn = document.createElement('input');
      btn.type = 'button';
      btn.value = '清除已完成';
      btn.classList.add('btn-small', 'completed-clear');
      li.appendChild(btn);
      batchUl.appendChild(li);
    }
    saveData();
  }

  // 为动态生成的过滤按钮添加事件
  document.addEventListener('click', function (e) {
    if (e.target.closest('.action-completed')) {
      updateSelected(e.target.closest('.action-completed'));
      const todoList = document.querySelector('.todo-list');
      todoList.innerHTML = '';
      activeTasks.forEach(task => {
        const contentDiv = task.querySelector('.todo-content');
        if (contentDiv && contentDiv.classList.contains('completed')) {
          todoList.appendChild(task);
        }
      });
      return;
    }
    if (e.target.closest('.action-progress')) {
      updateSelected(e.target.closest('.action-progress'));
      const todoList = document.querySelector('.todo-list');
      todoList.innerHTML = '';
      activeTasks.forEach(task => {
        const contentDiv = task.querySelector('.todo-content');
        if (contentDiv && !contentDiv.classList.contains('completed')) {
          todoList.appendChild(task);
        }
      });
      return;
    }
    if (e.target.closest('.completed-clear')) {
      for (let i = activeTasks.length - 1; i >= 0; i--) {
        const task = activeTasks[i];
        const contentDiv = task.querySelector('.todo-content');
        if (contentDiv && contentDiv.classList.contains('completed')) {
          activeTasks.splice(i, 1);
          const deleteBtn = task.querySelector('.btn-delete');
          if (deleteBtn) {
            deleteBtn.parentElement.removeChild(deleteBtn);
          }
          const restoreBtn = document.createElement('div');
          restoreBtn.classList.add('todo-btn', 'btn-restore');
          const restoreImg = document.createElement('img');
          restoreImg.src = "images/restore.svg";
          restoreImg.alt = "恢复";
          restoreBtn.appendChild(restoreImg);
          task.appendChild(restoreBtn);
          deletedTasks.push(task);
        }
      }
      renderActive();
      return;
    }
  });

  // 任务内容双击编辑
  document.querySelector('.todo-list').addEventListener('dblclick', function (e) {
    const contentDiv = e.target.closest('.todo-content');
    if (contentDiv) {
      let input = document.createElement('input');
      input.type = 'text';
      input.value = contentDiv.textContent;
      input.classList.add('edit-input');
      contentDiv.parentElement.replaceChild(input, contentDiv);
      input.focus();

      function saveEdit() {
        const newText = input.value.trim();
        if (newText !== '') {
          const newContentDiv = document.createElement('div');
          newContentDiv.classList.add('todo-content');
          newContentDiv.textContent = newText;
          input.parentElement.replaceChild(newContentDiv, input);
          saveData();
        } else {
          alert('内容不能为空！');
          input.focus();
        }
      }

      input.addEventListener('blur', saveEdit);
      input.addEventListener('keyup', function (e) {
        if (e.key === 'Enter') {
          saveEdit();
        }
      });
    }
  });


  // 调用加载数据函数，恢复之前存储的待办事项
  loadData();

});