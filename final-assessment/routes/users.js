
const express = require('express');
const { check } = require('express-validator');
const upload = require('../middleware/fileUpload');

const {
  getUsers,
  getUser,
  updateUserRole,
  uploadAvatar,
  updatePassword // 新添加的方法
} = require('../controllers/userController');

const { protect, authorize } = require('../middleware/auth');

const router = express.Router();

// 所有用户路由都需要认证
router.use(protect);

// 头像上传路由 - 任何已认证用户都可以上传自己的头像
router.post('/avatar', upload.single('avatar'), uploadAvatar);

// 只有管理员可以访问的路由
router.get('/', authorize('admin'), getUsers);
router.get('/:id', authorize('admin'), getUser);
router.put(
  '/:id/role',
  [
    check('role', '角色是必填项').not().isEmpty(),
    check('role').isIn(['user', 'admin'])
  ],
  authorize('admin'),
  updateUserRole
);

// 修改密码路由 - 任何已认证用户都可以修改自己的密码
router.put(
  '/password',
  [
    check('currentPassword', '当前密码是必填项').not().isEmpty(),
    check('newPassword', '新密码至少需要6个字符').isLength({ min: 6 })
  ],
  updatePassword
);

module.exports = router;