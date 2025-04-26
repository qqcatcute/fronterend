// models/TaskConflict.js
const db = require('../config/db');

class TaskConflict {
  static async create(conflictData) {
    const { taskId, sourceBranchId, targetBranchId, conflictContent } = conflictData;

    try {
      const [result] = await db.query(
        'INSERT INTO TaskConflicts (taskId, sourceBranchId, targetBranchId, conflictContent) VALUES (?, ?, ?, ?)',
        [taskId, sourceBranchId, targetBranchId, conflictContent]
      );

      const [conflicts] = await db.query('SELECT * FROM TaskConflicts WHERE id = ?', [result.insertId]);
      return conflicts[0];
    } catch (error) {
      console.error('创建冲突记录失败:', error);
      throw error;
    }
  }

  static async findByTask(taskId) {
    try {
      const [rows] = await db.query('SELECT * FROM TaskConflicts WHERE taskId = ? AND status = "pending"', [taskId]);
      return rows;
    } catch (error) {
      console.error('查询任务冲突失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM TaskConflicts WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('查询冲突记录失败:', error);
      throw error;
    }
  }

  static async resolve(id, resolvedBy) {
    try {
      await db.query(
        'UPDATE TaskConflicts SET status = "resolved", resolvedAt = CURRENT_TIMESTAMP, resolvedBy = ? WHERE id = ?',
        [resolvedBy, id]
      );

      return true;
    } catch (error) {
      console.error('解决冲突失败:', error);
      throw error;
    }
  }
}

module.exports = TaskConflict;