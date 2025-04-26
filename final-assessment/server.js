const dotenv = require('dotenv');
dotenv.config();//环境配置

const express = require('express');
const cors = require('cors');
const path = require('path'); // 添加 path 模块
const db = require('./config/db');// 引入数据库连接和初始化
const app = express();
const fs = require('fs');

// 确保上传目录存在
const uploadsDir = path.join(__dirname, 'public', 'uploads');
const avatarsDir = path.join(uploadsDir, 'avatars');

// 创建目录（如果不存在）
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

if (!fs.existsSync(avatarsDir)) {
  fs.mkdirSync(avatarsDir);
}

// 中间件
app.use(express.json());

// CORS配置
app.use(cors({
  origin: ['http://localhost:5500', 'http://127.0.0.1:5500'], // 允许的前端地址
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true // 允许携带凭证
}));

// 静态文件服务配置
app.use(express.static(path.join(__dirname, 'public')));

// 路由导入
const authRoutes = require('./routes/auth');
const userRoutes = require('./routes/users');
const teamRoutes = require('./routes/teams');
const taskRoutes = require('./routes/tasks');
const dependencyRoutes = require('./routes/dependencies'); // 添加依赖路由
const notificationRoutes = require('./routes/notifications');
const historyRoutes = require('./routes/history');
const versionControlRoutes = require('./routes/versionControl');

// 路由注册 - 按正确顺序定义
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/teams', teamRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api', dependencyRoutes); // 注册依赖路由
app.use('/api/notifications', notificationRoutes);
app.use('/api/history', historyRoutes);
app.use('/api', versionControlRoutes);

// 基础路由
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 通配符路由 - 放在所有API路由之后
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 错误处理中间件 - 放在所有路由之后
app.use((err, req, res, next) => {
  console.error('服务器错误:', err);
  // 返回详细错误信息（仅在开发环境）
  res.status(500).json({
    message: '服务器错误',
    error: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined // 仅在开发环境显示堆栈
  });
});

const PORT = process.env.PORT || 5000;

// 启动服务器
app.listen(PORT, () => {
  console.log(`服务器运行在端口: ${PORT}`);
});