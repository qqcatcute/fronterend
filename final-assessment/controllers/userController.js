const User = require('../models/User');
const bcrypt = require('bcryptjs');
const { validationResult } = require('express-validator');

exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.findAll();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users
    });
  } catch (error) {
    next(error);
  }
};

exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findByPk(req.params.id);

    if (!user) {
      return res.status(404).json({ message: '未找到该用户' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.updateUserRole = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { role } = req.body;

    const user = await User.updateRole(req.params.id, role);

    if (!user) {
      return res.status(404).json({ message: '未找到该用户' });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    next(error);
  }
};

exports.uploadAvatar = async (req, res, next) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: '请选择一个文件上传' });
    }

    // 统一使用这种格式的路径
    const avatarPath = `/uploads/avatars/${req.file.filename}`;

    // 更新用户头像
    const user = await User.updateAvatar(req.user.id, avatarPath);

    res.status(200).json({
      success: true,
      message: '头像上传成功',
      data: {
        avatar: avatarPath
      }
    });
  } catch (error) {
    next(error);
  }
};

// 修改密码
exports.updatePassword = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { currentPassword, newPassword } = req.body;

    // 获取当前用户
    const user = await User.findByPk(req.user.id);

    if (!user) {
      return res.status(404).json({ message: '用户不存在' });
    }

    // 验证当前密码
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.status(401).json({ message: '当前密码不正确' });
    }

    // 加密新密码
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(newPassword, salt);

    // 更新密码
    await User.updatePassword(user.id, hashedPassword);

    res.status(200).json({
      success: true,
      message: '密码已成功更新'
    });
  } catch (error) {
    next(error);
  }
};