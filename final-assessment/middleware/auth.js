const jwt = require('jsonwebtoken');
const User = require('../models/User');

// 保护路由 - 验证JWT Token
exports.protect = async (req, res, next) => {
  let token;

  // 从请求头中获取token
  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith('Bearer')
  ) {
    token = req.headers.authorization.split(' ')[1];
  }

  // 检查token是否存在
  if (!token) {
    return res.status(401).json({ message: '未授权访问' });
  }

  try {
    // 验证token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // 将用户信息附加到请求对象
    req.user = await User.findByPk(decoded.id);

    if (!req.user) {
      return res.status(401).json({ message: '用户不存在' });
    }

    next();
  } catch (error) {
    console.error('JWT验证错误:', error.message);
    return res.status(401).json({ message: '未授权访问' });
  }
};

// 授权角色 - 添加这个函数
exports.authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        message: `用户角色 ${req.user ? req.user.role : '未知'} 无权访问此资源`
      });
    }
    next();
  };
};