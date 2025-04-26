// routes/notifications.js
const express = require('express');
const {
  getNotifications,
  markAsRead,
  markAllAsRead,
  deleteNotification
} = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

const router = express.Router();

// 所有路由都需要认证
router.use(protect);

// 获取我的通知
router.get('/', getNotifications);

// 标记通知为已读
router.put('/:id/read', markAsRead);

// 标记所有通知为已读
router.put('/read-all', markAllAsRead);

// 删除通知
router.delete('/:id', deleteNotification);

module.exports = router;