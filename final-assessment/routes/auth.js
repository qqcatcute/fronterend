const express = require('express');
const { check } = require('express-validator');
const {
  register,
  login,
  getMe,
  logout
} = require('../controllers/authController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 注册路由
router.post(
  '/register',
  [
    check('username', '用户名是必填项').not().isEmpty(),
    check('email', '请提供有效的邮箱')
      .optional({ checkFalsy: true })  // 允许为空
      .isEmail(),
    check('phone', '请提供有效的手机号码')
      .optional({ checkFalsy: true })  // 允许为空
      .matches(/^1\d{10}$/),  // 验证11位手机号
    check('password', '请输入至少6个字符的密码').isLength({ min: 6 }),
    // 至少提供邮箱或手机号
    check().custom((value, { req }) => {
      if (!req.body.email && !req.body.phone) {
        throw new Error('邮箱或手机号必须提供一个');
      }
      return true;
    })
  ],
  register
);

// 登录路由
router.post(
  '/login',
  [
    check('email', '请提供有效的邮箱')
      .optional({ checkFalsy: true })
      .isEmail(),
    check('username', '用户名不能为空')
      .optional({ checkFalsy: true }),
    check('phone', '请提供有效的手机号码')
      .optional({ checkFalsy: true })
      .matches(/^1\d{10}$/),
    check('password', '密码是必填项').exists(),
    // 至少提供一种登录方式
    check().custom((value, { req }) => {
      if (!req.body.email && !req.body.username && !req.body.phone) {
        throw new Error('请提供邮箱、用户名或手机号');
      }
      return true;
    })
  ],
  login
);

// 获取当前用户
router.get('/me', protect, getMe);

// 退出登录
router.get('/logout', protect, logout);

module.exports = router;