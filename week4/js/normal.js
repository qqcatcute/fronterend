document.addEventListener('DOMContentLoaded', function () {
  // 初始模型数据
  const initialModels = [
    {
      modelName: "openai",
      modelUrl: "https://chat.openai.com/",
      modelDesc: "由OpenAI开发，以强大的自然语言处理能力著称，支持多任务处理，广泛应用于对话、创作和代码生成，代表作为GPT系列模型。"
    },
    {
      modelName: "deepseek",
      modelUrl: "https://chat.deepseek.com/",
      modelDesc: "深度求索公司推出的开源大模型，专注高效推理与长文本处理，支持128K上下文，适合代码、数学及复杂逻辑任务。"
    },
    {
      modelName: "腾讯元宝",
      modelUrl: "https://yuanbao.tencent.com/",
      modelDesc: "腾讯推出的企业级大模型，强调安全与落地应用，支持多模态交互，适用于金融、医疗等行业场景优化。"
    }
  ];

  // DOM元素
  const modelListEl = document.getElementById('modelList');
  const layersContainerEl = document.getElementById('layersContainer');
  const addModelBtn = document.getElementById('addModelBtn');
  const addLayerBtn = document.getElementById('addLayerBtn');
  const modelFormEl = document.getElementById('modelForm');
  const newModelFormEl = document.getElementById('newModelForm');
  const cancelAddModelBtn = document.getElementById('cancelAddModel');
  const modelDetailsEl = document.getElementById('modelDetails');
  const closeDetailBtn = document.getElementById('closeDetail');
  const deleteModelBtn = document.getElementById('deleteModel');
  const overlayEl = document.getElementById('overlay');
  const submitWorkbenchBtn = document.getElementById('submitWorkbench');
  const userInputFormEl = document.getElementById('userInputForm');
  const questionFormEl = document.getElementById('questionForm');
  const cancelQuestionBtn = document.getElementById('cancelQuestion');
  const modelPropertiesEl = document.getElementById('modelProperties');
  const propertiesFormEl = document.getElementById('propertiesForm');
  const cancelPropertiesBtn = document.getElementById('cancelProperties');

  // 当前状态变量
  let models = [...initialModels]; // 复制初始模型数据
  let layerCount = 0;
  let currentModelId = null;
  let currentWorkbenchModelId = null;

  // 初始化
  function init() {
    renderModelList();
    setupEventListeners();
  }

  // 渲染模型库中模型列表 数组遍历创建 model数组 index正在处理的元素
  function renderModelList() {
    modelListEl.innerHTML = '';
    models.forEach((model, index) => {
      const modelEl = document.createElement('div');
      modelEl.className = 'model-item';
      modelEl.draggable = true;
      //设置属性名称和属性值
      modelEl.setAttribute('data-model-id', index);
      //注意是反引号
      modelEl.innerHTML = `${model.modelName}`;

      // 添加拖拽事件
      modelEl.addEventListener('dragstart', handleDragStart);
      // 添加点击事件显示详情
      modelEl.addEventListener('click', (e) => {
        e.stopPropagation(); // 防止事件冒泡
        showModelDetails(index);
      });

      modelListEl.appendChild(modelEl);
    });
  }

  // 设置事件监听器
  function setupEventListeners() {
    // 模型表单
    addModelBtn.addEventListener('click', showAddModelForm);
    cancelAddModelBtn.addEventListener('click', hideAddModelForm);
    newModelFormEl.addEventListener('submit', handleAddModel);

    // 模型详情
    closeDetailBtn.addEventListener('click', hideModelDetails);
    deleteModelBtn.addEventListener('click', handleDeleteModel);

    // 层级
    addLayerBtn.addEventListener('click', addLayer);

    // 工作台提交
    submitWorkbenchBtn.addEventListener('click', showUserInputForm);

    // 用户输入表单
    cancelQuestionBtn.addEventListener('click', hideUserInputForm);
    questionFormEl.addEventListener('submit', handleSubmitQuestion);

    // 模型属性表单
    cancelPropertiesBtn.addEventListener('click', hideModelProperties);
    propertiesFormEl.addEventListener('submit', handleSaveProperties);

    // 点击遮罩层关闭模态框
    overlayEl.addEventListener('click', () => {
      hideAddModelForm();
      hideModelDetails();
      hideUserInputForm();
      hideModelProperties();
    });
  }

  // ===== 模型库相关功能 =====

  // 显示添加模型表单
  function showAddModelForm() {
    modelFormEl.style.display = 'block';
    overlayEl.style.display = 'block';
  }

  // 隐藏添加模型表单
  function hideAddModelForm() {
    modelFormEl.style.display = 'none';
    overlayEl.style.display = 'none';
    newModelFormEl.reset();
    //重置表单，将表单中的所有输入框恢复到它们的初始状态
  }

  // 处理添加模型
  function handleAddModel(e) {
    e.preventDefault();
    //这里是阻止表单的默认提交行为

    const modelName = document.getElementById('modelName').value;
    const modelUrl = document.getElementById('modelUrl').value;
    const modelDesc = document.getElementById('modelDesc').value;

    const newModel = {
      modelName,
      modelUrl,
      modelDesc
    };
  //获取值并且存储添加到数组中
    models.push(newModel);
    renderModelList();
    hideAddModelForm();
  }

  // 显示模型详情 这里的id是指索引号
  function showModelDetails(modelId) {
    currentModelId = modelId;
    const model = models[modelId];

    document.getElementById('detailModelName').textContent = model.modelName;
    document.getElementById('detailModelUrl').textContent = model.modelUrl;
    document.getElementById('detailModelDesc').textContent = model.modelDesc;

    modelDetailsEl.style.display = 'block';
    overlayEl.style.display = 'block';
  }

  // 隐藏模型详情
  function hideModelDetails() {
    modelDetailsEl.style.display = 'none';
    overlayEl.style.display = 'none';
    currentModelId = null;
  }

  // 处理删除模型
  function handleDeleteModel() {
    if (currentModelId !== null) {
      models.splice(currentModelId, 1);
      //从这个索引号开始删掉一个
      renderModelList();
      hideModelDetails();
    }
  }

  // ===== 拖拽相关功能 =====

  // 处理拖拽开始
  function handleDragStart(e) {
    //dataTransfer 是拖拽事件中的一个属性，用来存储和管理拖拽过程中需要传递的数据 setData 方法用于将数据存储到拖拽操作中。它的第一个参数是数据类型（这里是 'text/plain'，表示普通文本），第二个参数是数据的实际值。这里存储的是拖拽目标元素的 data-model-id 属性值。
    e.dataTransfer.setData('text/plain', e.target.getAttribute('data-model-id'));
    //getAttribute('data-model-id') 是用来获取该元素的 data-model-id 属性值
    e.target.classList.add('dragging');
  }

  // 处理拖拽结束
  function handleDragEnd(e) {
    e.target.classList.remove('dragging');
  }

  // 处理拖拽经过
  function handleDragOver(e) {
    e.preventDefault();
    //默认行为：浏览器不允许放置拖拽元素
    e.target.classList.add('drag-over');
  }

  // 处理拖拽离开
  function handleDragLeave(e) {
    e.target.classList.remove('drag-over');
  }

  // 处理放置
  function handleDrop(e) {
    e.preventDefault();

    //e.currentTarget 是指目标区域，即将拖拽元素放置到的区域
    const layerModelsEl = e.currentTarget;
    layerModelsEl.classList.remove('drag-over');

    const modelId = e.dataTransfer.getData('text/plain');
    const model = models[modelId];

    //model 是一个对象：在 JavaScript 中，非 null 和 undefined 的对象被认为是 真值（truthy value）。即使模型的属性 modelId 是 0，只要 models[0] 存在并且不为 null 或 undefined，它就被视为真值（truthy）。
    if (model) {
      // 创建工作台模型元素
      const workbenchModelEl = document.createElement('div');
      workbenchModelEl.className = 'workbench-model';
      //注意反引号
      workbenchModelEl.innerHTML = `
            ${model.modelName}
            <span class="delete-model" title="删除模型">×</span>
        `;

      // 存储模型数据 setAttribute 用于修改现有元素的属性值。如果属性已经存在，它会更新该属性的值；如果属性不存在，它会创建新的属性并赋值
      workbenchModelEl.setAttribute('data-model-name', model.modelName);
      workbenchModelEl.setAttribute('data-model-url', model.modelUrl);
      workbenchModelEl.setAttribute('data-model-weight', '1');
      workbenchModelEl.setAttribute('data-model-prompt', '');

      // 添加点击事件设置属性
      workbenchModelEl.addEventListener('click', (e) => {
        if (!e.target.classList.contains('delete-model')) {
          showModelProperties(workbenchModelEl);
        }
      });

      // 添加删除事件
      const deleteBtn = workbenchModelEl.querySelector('.delete-model');
      deleteBtn.addEventListener('click', () => {
        workbenchModelEl.remove();
      });

      // 添加到层级
      layerModelsEl.appendChild(workbenchModelEl);
    }
  }

  // ===== 工作台相关功能 =====

  // 添加层级
  function addLayer() {
    layerCount++;
    const layerId = `layer-${layerCount}`;

    const layerEl = document.createElement('div');
    layerEl.className = 'layer';
    //模板字面量是 JavaScript 中的一种语法，用反引号（`）括起来的字符串，可以嵌入变量或表达式
    layerEl.innerHTML = `
        <div class="layer-header">
            <h3>层级 ${layerCount}</h3>
            <div class="layer-parallel">
                <label>
                    <input type="checkbox" class="parallel-checkbox"> 并行执行
                </label>
                <button type="button" class="delete-layer">删除层级</button>
            </div>
        </div>
        <div class="layer-models" id="${layerId}"></div>
    `;

    // 添加拖拽事件监听器
    const layerModelsEl = layerEl.querySelector('.layer-models');
    layerModelsEl.addEventListener('dragover', handleDragOver);
    layerModelsEl.addEventListener('dragleave', handleDragLeave);
    layerModelsEl.addEventListener('drop', handleDrop);

    // 添加删除层级事件
    const deleteLayerBtn = layerEl.querySelector('.delete-layer');
    deleteLayerBtn.addEventListener('click', () => {
      layerEl.remove();
    });

    layersContainerEl.appendChild(layerEl);
  }

  // 显示模型属性
  function showModelProperties(modelEl) {
    currentWorkbenchModelId = modelEl;

    // 填充属性表单
    document.getElementById('modelWeight').value = modelEl.getAttribute('data-model-weight');
    document.getElementById('modelPrompt').value = modelEl.getAttribute('data-model-prompt');

    modelPropertiesEl.style.display = 'block';
    overlayEl.style.display = 'block';
  }

  // 隐藏模型属性
  function hideModelProperties() {
    modelPropertiesEl.style.display = 'none';
    overlayEl.style.display = 'none';
    currentWorkbenchModelId = null;
    propertiesFormEl.reset();
  }

  // 处理保存属性
  function handleSaveProperties(e) {
    e.preventDefault();

    if (currentWorkbenchModelId) {
      const weight = document.getElementById('modelWeight').value;
      const prompt = document.getElementById('modelPrompt').value;

      currentWorkbenchModelId.setAttribute('data-model-weight', weight);
      currentWorkbenchModelId.setAttribute('data-model-prompt', prompt);

      hideModelProperties();
    }
  }

  // ===== 提交相关功能 =====

  // 显示用户输入表单
  function showUserInputForm() {
    // 检查工作台是否有层级
    if (layersContainerEl.children.length === 0) {
      alert('请至少添加一个层级并拖入模型！');
      return;
    }

    userInputFormEl.style.display = 'block';
    overlayEl.style.display = 'block';
  }

  // 隐藏用户输入表单
  function hideUserInputForm() {
    userInputFormEl.style.display = 'none';
    overlayEl.style.display = 'none';
    questionFormEl.reset();
  }

  // 处理提交问题
  function handleSubmitQuestion(e) {
    e.preventDefault();

    const question = document.getElementById('userQuestion').value;
    const imageFile = document.getElementById('userImage').files[0];

    // 收集工作台数据
    const workbenchData = collectWorkbenchData();

    // 如果有图片，转为base64
    if (imageFile) {
      const reader = new FileReader();
      reader.onload = function (event) {
        const imageBase64 = event.target.result;
        submitData(question, imageBase64, workbenchData);
      };
      reader.readAsDataURL(imageFile);
    } else {
      submitData(question, "", workbenchData);
    }
  }

  // 收集工作台数据
  function collectWorkbenchData() {
    const modelList = [];

    // 遍历所有层级
    const layers = layersContainerEl.querySelectorAll('.layer');
    layers.forEach((layer, layerIndex) => {
      const isParallel = layer.querySelector('.parallel-checkbox').checked ? 1 : 0;
      const layerModels = layer.querySelector('.layer-models');
      const workbenchModels = layerModels.querySelectorAll('.workbench-model');

      if (workbenchModels.length > 0) {
        const models = [];

        // 收集层级中的所有模型
        workbenchModels.forEach(modelEl => {
          const modelData = {
            modelName: modelEl.getAttribute('data-model-name'),
            modelUrl: modelEl.getAttribute('data-model-url'),
            isAPI: 0, // 默认不是API
            weight: parseInt(modelEl.getAttribute('data-model-weight'))
          };

          // 如果有提示词，添加question字段
          const prompt = modelEl.getAttribute('data-model-prompt');
          if (prompt) {
            modelData.question = prompt;
          }

          models.push(modelData);
        });

        // 添加层级数据
        modelList.push({
          layer: layerIndex + 1,
          parallel: isParallel,
          models: models
        });
      }
    });

    return modelList;
  }

  // 提交数据到后端
  function submitData(content, image, modelList) {
    const data = {
      content,
      image,
      modelList
    };

    console.log('准备提交的数据:', data);

    // 发送到后端
    fetch('http://localhost:3000/api', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(data)
    })
      .then(response => response.json())
      .then(data => {
        console.log('提交成功:', data);
        alert('数据提交成功！');
        hideUserInputForm();
      })
      .catch(error => {
        console.error('提交失败:', error);
        alert('数据提交失败，请查看控制台了解详情。');
      });
  }

  // 初始化应用
  init();
});

