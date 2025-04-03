# fronterend
前端代码
# 第一周进度：
## 复习了html5和css3,比较熟悉js,完成了小米官网页面头部制作
- 下载app部分是使用了css（js也可以）鼠标经过事件 购物车部分同理 下拉的时候有一个类似平滑展开的效果 是使用了max-height的变化 从0到盒子高度 添加过渡即可 
- 发现了一个bug 就是大盒子如果设置为灰色 container里边如果我不设置背景色而是让它继承大盒子背景色 当浏览器视口缩小到比container小的时候 内容下边背景色会消失 尝试多种方法（伪元素等无法解决）最后感觉直接再给container这个盒子设置一个背景色就行
- xiaomi手机 和redmi手机有下拉框 这个的html部分的结构逻辑不太好 因为这两个盒子是在container里边的 下拉框如果是它们的子元素 那么宽度会被限制 所以最后这两个下拉框其实是与container同级 我还不太会看网页代码中这种下拉框的代码 不会找 待解决 好吧 这里也有bug待解决 也是浏览器视口变化导致的问题 然后鼠标移开也是有个延时消失的效果
- 左边框 轮播图的左方 这个其实也是头部的一个div盒子的内容 我发现给div设置了width但是没有height(好像是这样)的话 里边如果没有内容 div盒子并没有占据位置 反正占据位置我给了它一个空格 左边框透明 可看见背景色 
- 轮播图 重新学习了一遍 获取元素 然后定义数组放图片 给一个i变量用来遍历数组 改变图片（尝试了两种方法 注释掉了一种）然后定时器轮播是调用右按钮点击事件 其中按钮鼠标经过会改变背景 不太会用ps工具 我直接尝试调数据把背景图挪动的 待改进
- 搜索框点击事件 练习的是css 鼠标经过没有消失 这个做的不太好 可能用js有个焦点消失（应该是这个吧）事件会比较好 鼠标停留会让盒子定住 定时器被清除 移开会复原
- 本周进步：结构比较之前更清晰了 熟练了一点 解决了一些bug 命名规则模仿小米 更加规范 js练习过后也好了不少 
# 第二周进度：
## 熟练了html和css，熟悉了js更多的逻辑，完成了todolist的复刻
- html部分：复刻了案例，感觉这个网站做得很漂亮，暂时没有创新的想法，也有时间限制的原因，想要重点练手一下js的逻辑。
- css部分：学到了定义全局变量自定义变量，这个后续更改网页颜色应该会比较方便，可以一键换主题色，像边框什么的也很有特点，normal.css是直接复制的，对于一些默认的浏览器的设置我不太清楚，style.css是每一个按钮分块查找样式一点点填补的，跟着学，认识了一些之前没有见过的样式，不过我的一些数据跟网页不一样，很神奇。做了响应式布局，有些是有变化的。然后动画方面，就是定义动画，然后调用，主要样式直接模仿就可以了，感觉动画效果可能会有什么网站专门做一些现成的？不过看得懂代码，也算复习了，有那个3d深度效果的其实我一直感觉有点像只是改变了大小，不太懂这个属性。
- js部分简直是折磨，我一开始没搞懂那个按钮的逻辑，就开始做了，做完一个一点还有镶套的另外的东西，总而言之就是缝缝补补，并且造成很多bug,点击事件还会覆盖等等令人悲伤的事情，还把已经做好的功能误删，非常搞心态，所以一边存版本，一边测试一边改， 还是有bug,逻辑超出我的思考能力，待改进，复习了很多，具体就写在js代码注释里边吧。生活不易啊。还是得往后学，边练手边努力持续不断地学。
- js部分：复习了箭头函数，mapjoin等等方法来渲染，数组等知识，创建新节点，给父元素添加新的子节点等等，还有删除结点，保存到本地存储的功能是转换成json数据，渲染的时候再解析，渲染还会检查是否是已经完成的等等，用到事件委托，冒泡阻止默认事件等，切换的一些逻辑跟之前那个轮播图小圆点差不多，更多功能有一些自己边写的注释， 不过主要是辅助我自己理解，并且有一个功能：就是第一行的清除全部被我不小心删了，版本回调也没救回来，好像是哪里的重复注册覆盖了，修没了有点悲伤。
- 要求实现：基础全实现，按钮逻辑仿原网站，有一定量的bug但并非致死量（修不动了不敢修了），进阶完成了导入导出、动画效果、多语言（假），获取时间努努力感觉能做但是时间有点紧张之后有空再补吧，暂时先这个代码了。
# 第三周进度：
- html和css部分：比较简陋，部分参考了腾讯问卷配色等。
- js部分：先定义数组，存放模型数据，通过遍历数组把模型部分渲染出来。然后代码部分是先定义了变量等，然后设置监听事件，在监听事件里边调用函数，函数被抽离出来放在后边处理相关数据。学了新的拖拽事件，相关知识了解被我注释在代码里边，还有一个添加模型的时候会周边变暗是添加了遮罩层。发送到后台的数据是用来fetch，nodejs处理是用了第三方包express。目前还都比较简陋，相关知识的串联度还不是很够，我还处于边学习的状态，部分nodejs知识点学起来有详而不全的感觉，串联不起来，继续学习中。目前代码可以拿到用户传过来的数据显示在我自己的终端，图片也用base64的格式存储了起来，但是大模型还不会回答。
