// controllers/notificationController.js
const Notification = require('../models/Notification');

// 获取用户的通知
exports.getNotifications = async (req, res, next) => {
  try {
    const notifications = await Notification.findByUser(req.user.id);
    const unreadCount = await Notification.getUnreadCount(req.user.id);

    res.status(200).json({
      success: true,
      count: notifications.length,
      unreadCount,
      data: notifications
    });
  } catch (error) {
    next(error);
  }
};

// 标记通知为已读
exports.markAsRead = async (req, res, next) => {
  try {
    const notification = await Notification.markAsRead(req.params.id);

    res.status(200).json({
      success: true,
      message: '通知已标记为已读'
    });
  } catch (error) {
    next(error);
  }
};

// 标记所有通知为已读
exports.markAllAsRead = async (req, res, next) => {
  try {
    await Notification.markAllAsRead(req.user.id);

    res.status(200).json({
      success: true,
      message: '所有通知已标记为已读'
    });
  } catch (error) {
    next(error);
  }
};

// 删除通知
exports.deleteNotification = async (req, res, next) => {
  try {
    await Notification.delete(req.params.id);

    res.status(200).json({
      success: true,
      message: '通知已删除'
    });
  } catch (error) {
    next(error);
  }
};