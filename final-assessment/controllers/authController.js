const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const User = require('../models/User');
const { validationResult } = require('express-validator');

exports.register = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { username, email, phone, password } = req.body;

    // 检查手机号格式（如果提供）
    if (phone && !/^1\d{10}$/.test(phone)) {
      return res.status(400).json({
        message: '手机号格式不正确',
        detail: '请输入11位有效的手机号'
      });
    }

    // 检查必填字段
    if (!username) {
      return res.status(400).json({
        message: '请提供用户名',
        detail: '用户名是必填字段'
      });
    }

    if (!email && !phone) {
      return res.status(400).json({
        message: '请提供邮箱或手机号',
        detail: '邮箱和手机号至少需要提供一个'
      });
    }

    // 检查邮箱是否已存在
    if (email) {
      let userByEmail = await User.findOne({ email });
      if (userByEmail) {
        return res.status(400).json({
          message: '用户已存在',
          detail: '邮箱已被注册'
        });
      }
    }

    // 检查用户名是否已存在
    let userByUsername = await User.findOne({ username });
    if (userByUsername) {
      return res.status(400).json({
        message: '用户已存在',
        detail: '用户名已被使用'
      });
    }

    // 检查手机号是否已存在
    if (phone) {
      let userByPhone = await User.findOne({ phone });
      if (userByPhone) {
        return res.status(400).json({
          message: '用户已存在',
          detail: '手机号已被注册'
        });
      }
    }

    // 创建用户
    user = await User.create({ username, email, phone, password });

    sendTokenResponse(user, 201, res);
  } catch (error) {
    console.error('注册失败:', error);
    res.status(500).json({
      message: '服务器错误，注册失败',
      detail: error.message
    });
  }
};

// 登录页面
exports.login = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { email, username, phone, password } = req.body;

    // 确保至少提供一种登录方式
    if (!email && !username && !phone) {
      return res.status(400).json({ message: '请提供邮箱、用户名或手机号' });
    }

    // 查找用户
    let user;
    if (email) {
      user = await User.findOne({ email });
    } else if (username) {
      user = await User.findOne({ username });
    } else if (phone) {
      user = await User.findOne({ phone });
    }

    if (!user) {
      return res.status(401).json({ message: '用户名/邮箱/手机号或密码不正确' });
    }

    // 验证密码
    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(401).json({ message: '用户名/邮箱/手机号或密码不正确' });
    }

    sendTokenResponse(user, 200, res);
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.user.id);
    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.logout = async (req, res, next) => {
  res.status(200).json({
    success: true,
    message: '成功退出登录'
  });
};

// 在 authController.js 中更新 sendTokenResponse 函数

const sendTokenResponse = (user, statusCode, res) => {
  const jwtExpire = process.env.JWT_EXPIRE || '30d';
  const token = jwt.sign(
    { id: user.id, role: user.role },
    process.env.JWT_SECRET,
    { expiresIn: jwtExpire }
  );

  // 解析JWT_EXPIRE为天数（用于cookie设置）
  const expireDays = parseInt(jwtExpire, 10) || 30;
  const options = {
    expires: new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000),
    httpOnly: true
  };

  if (process.env.NODE_ENV === 'production') {
    options.secure = true;
  }

  res
    .status(statusCode)
    .json({
      success: true,
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        phone: user.phone,
        avatar: user.avatar || 'images/default-avatar.jpg', // 添加头像
        role: user.role
      }
    });
};