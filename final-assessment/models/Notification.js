// models/Notification.js
const db = require('../config/db');

class Notification {
  static async create(notificationData) {
    const { userId, content, type, relatedId } = notificationData;

    try {
      const [result] = await db.query(
        'INSERT INTO Notifications (userId, content, type, relatedId) VALUES (?, ?, ?, ?)',
        [userId, content, type, relatedId || null]
      );

      const [notifications] = await db.query('SELECT * FROM Notifications WHERE id = ?', [result.insertId]);
      return notifications[0];
    } catch (error) {
      console.error('创建通知失败:', error);
      throw error;
    }
  }

  static async findByUser(userId, limit = 20) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM Notifications WHERE userId = ? ORDER BY createdAt DESC LIMIT ?',
        [userId, limit]
      );
      return rows;
    } catch (error) {
      console.error('查询用户通知失败:', error);
      throw error;
    }
  }

  static async getUnreadCount(userId) {
    try {
      const [rows] = await db.query(
        'SELECT COUNT(*) as count FROM Notifications WHERE userId = ? AND isRead = false',
        [userId]
      );
      return rows[0].count;
    } catch (error) {
      console.error('获取未读通知数量失败:', error);
      throw error;
    }
  }

  static async markAsRead(id) {
    try {
      await db.query('UPDATE Notifications SET isRead = true WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('标记通知为已读失败:', error);
      throw error;
    }
  }

  static async markAllAsRead(userId) {
    try {
      await db.query('UPDATE Notifications SET isRead = true WHERE userId = ?', [userId]);
      return true;
    } catch (error) {
      console.error('标记所有通知为已读失败:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query('DELETE FROM Notifications WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除通知失败:', error);
      throw error;
    }
  }
}

module.exports = Notification;