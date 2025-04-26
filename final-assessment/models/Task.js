// models/Task.js
const db = require('../config/db');

class Task {
  static async create(taskData) {
    const { title, description, teamId, createdBy, assignedTo, priority, deadline } = taskData;

    try {
      const [result] = await db.query(
        `INSERT INTO Tasks 
         (title, description, teamId, createdBy, assignedTo, priority, deadline) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [title, description, teamId, createdBy, assignedTo || null, priority || 'medium', deadline || null]
      );

      // 记录任务历史
      await db.query(
        `INSERT INTO TaskHistory (taskId, userId, action, details) 
         VALUES (?, ?, ?, ?)`,
        [result.insertId, createdBy, 'create', '创建了任务']
      );

      const [tasks] = await db.query('SELECT * FROM Tasks WHERE id = ?', [result.insertId]);
      return tasks[0];
    } catch (error) {
      console.error('创建任务失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM Tasks WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('查询任务失败:', error);
      throw error;
    }
  }

  static async findByTeam(teamId) {
    try {
      const [rows] = await db.query('SELECT * FROM Tasks WHERE teamId = ? ORDER BY createdAt DESC', [teamId]);
      return rows;
    } catch (error) {
      console.error('查询团队任务失败:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    try {
      const [rows] = await db.query(`
        SELECT t.* FROM Tasks t
        JOIN TeamMembers tm ON t.teamId = tm.teamId
        WHERE tm.userId = ? OR t.assignedTo = ?
        ORDER BY t.createdAt DESC
      `, [userId, userId]);
      return rows;
    } catch (error) {
      console.error('查询用户任务失败:', error);
      throw error;
    }
  }

  static async findAssignedToUser(userId) {
    try {
      const [rows] = await db.query('SELECT * FROM Tasks WHERE assignedTo = ? ORDER BY createdAt DESC', [userId]);
      return rows;
    } catch (error) {
      console.error('查询分配给用户的任务失败:', error);
      throw error;
    }
  }

  static async findAvailableDependencies(taskId, teamId) {
    try {
      const [rows] = await db.query(`
        SELECT t.* FROM Tasks t
        WHERE t.teamId = ? 
        AND t.id != ?
        AND t.id NOT IN (
          SELECT dependsOnTaskId FROM TaskDependencies WHERE taskId = ?
        )
      `, [teamId, taskId, taskId]);
      return rows;
    } catch (error) {
      console.error('查询可用依赖任务失败:', error);
      throw error;
    }
  }

  static async update(id, taskData) {
    const { title, description, status, priority, assignedTo, deadline } = taskData;
    const updateFields = [];
    const values = [];

    if (title) {
      updateFields.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updateFields.push('description = ?');
      values.push(description);
    }

    if (status) {
      updateFields.push('status = ?');
      values.push(status);
    }

    if (priority) {
      updateFields.push('priority = ?');
      values.push(priority);
    }

    if (assignedTo !== undefined) {
      updateFields.push('assignedTo = ?');
      values.push(assignedTo === null ? null : assignedTo);
    }

    if (deadline !== undefined) {
      updateFields.push('deadline = ?');
      values.push(deadline === null ? null : deadline);
    }

    if (updateFields.length === 0) {
      return await this.findById(id);
    }

    try {
      values.push(id);
      await db.query(
        `UPDATE Tasks SET ${updateFields.join(', ')} WHERE id = ?`,
        values
      );

      const [rows] = await db.query('SELECT * FROM Tasks WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('更新任务失败:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query('DELETE FROM Tasks WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除任务失败:', error);
      throw error;
    }
  }

  static async addComment(taskId, userId, content) {
    try {
      const [result] = await db.query(
        'INSERT INTO TaskComments (taskId, userId, content) VALUES (?, ?, ?)',
        [taskId, userId, content]
      );

      // 记录评论历史
      await db.query(
        'INSERT INTO TaskHistory (taskId, userId, action, details) VALUES (?, ?, ?, ?)',
        [taskId, userId, 'comment', '添加了评论']
      );

      const [comments] = await db.query(
        `SELECT tc.*, u.username, u.avatar 
         FROM TaskComments tc
         JOIN Users u ON tc.userId = u.id
         WHERE tc.id = ?`,
        [result.insertId]
      );

      return comments[0];
    } catch (error) {
      console.error('添加评论失败:', error);
      throw error;
    }
  }

  static async getComments(taskId) {
    try {
      const [rows] = await db.query(
        `SELECT tc.*, u.username, u.avatar 
         FROM TaskComments tc
         JOIN Users u ON tc.userId = u.id
         WHERE tc.taskId = ?
         ORDER BY tc.createdAt DESC`,
        [taskId]
      );
      return rows;
    } catch (error) {
      console.error('获取评论失败:', error);
      throw error;
    }
  }

  static async getHistory(taskId) {
    try {
      const [rows] = await db.query(
        `SELECT th.*, u.username, u.avatar 
         FROM TaskHistory th
         JOIN Users u ON th.userId = u.id
         WHERE th.taskId = ?
         ORDER BY th.createdAt DESC`,
        [taskId]
      );
      return rows;
    } catch (error) {
      console.error('获取任务历史失败:', error);
      throw error;
    }
  }

  static async addHistory(taskId, userId, action, details) {
    try {
      const [result] = await db.query(
        'INSERT INTO TaskHistory (taskId, userId, action, details) VALUES (?, ?, ?, ?)',
        [taskId, userId, action, details]
      );

      const [history] = await db.query('SELECT * FROM TaskHistory WHERE id = ?', [result.insertId]);
      return history[0];
    } catch (error) {
      console.error('添加任务历史失败:', error);
      throw error;
    }
  }
}

module.exports = Task;