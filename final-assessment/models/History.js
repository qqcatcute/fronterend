// models/History.js
const db = require('../config/db');

class History {
  /**
   * 获取系统中的所有历史记录
   * 支持按类型、团队、操作类型和日期过滤
   */
  static async getAll(filters = {}) {
    try {
      // 构建基础查询
      let query = `
        SELECT
          th.id,
          th.taskId,
          th.userId,
          th.action,
          th.details,
          th.createdAt,
          t.title AS taskTitle,
          t.teamId,
          tm.name AS teamName,
          u.username,
          u.avatar,
          'task' AS type
        FROM TaskHistory th
        LEFT JOIN Tasks t ON th.taskId = t.id
        LEFT JOIN Teams tm ON t.teamId = tm.id
        LEFT JOIN Users u ON th.userId = u.id
      `;

      // 构建WHERE条件
      const conditions = [];
      const params = [];

      // 按团队筛选
      if (filters.teamId && filters.teamId !== 'all') {
        conditions.push('t.teamId = ?');
        params.push(filters.teamId);
      }

      // 按操作类型筛选
      if (filters.action && filters.action !== 'all') {
        conditions.push('th.action = ?');
        params.push(filters.action);
      }

      // 按用户筛选
      if (filters.userId) {
        conditions.push('th.userId = ?');
        params.push(filters.userId);
      }

      // 按日期范围筛选
      if (filters.startDate) {
        conditions.push('th.createdAt >= ?');
        params.push(filters.startDate + ' 00:00:00');
      }

      if (filters.endDate) {
        conditions.push('th.createdAt <= ?');
        params.push(filters.endDate + ' 23:59:59');
      }

      // 搜索关键词
      if (filters.keyword) {
        conditions.push('(th.details LIKE ? OR t.title LIKE ? OR u.username LIKE ?)');
        const likeParam = `%${filters.keyword}%`;
        params.push(likeParam, likeParam, likeParam);
      }

      // 添加WHERE子句（如果有条件）
      if (conditions.length > 0) {
        query += ' WHERE ' + conditions.join(' AND ');
      }

      // 按时间降序排序
      query += ' ORDER BY th.createdAt DESC';

      // 添加分页
      const limit = parseInt(filters.limit || 10);
      const page = parseInt(filters.page || 1);
      if (page && limit) {
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      // 执行查询
      const [rows] = await db.query(query, params);

      // 获取总记录数（用于分页）
      let totalCount = 0;
      if (page && limit) {
        let countQuery = `
          SELECT COUNT(*) as count
          FROM TaskHistory th
          LEFT JOIN Tasks t ON th.taskId = t.id
          LEFT JOIN Teams tm ON t.teamId = tm.id
          LEFT JOIN Users u ON th.userId = u.id
        `;

        if (conditions.length > 0) {
          countQuery += ' WHERE ' + conditions.join(' AND ');
        }

        const [countResult] = await db.query(countQuery, params.slice(0, params.length - 2)); // 去掉LIMIT和OFFSET参数
        totalCount = countResult[0].count;
      }

      // 格式化结果
      const formattedRows = rows.map(row => ({
        id: row.id,
        title: row.details,
        taskTitle: row.taskTitle,
        taskId: row.taskId,
        type: row.type,
        action: row.action,
        teamId: row.teamId,
        teamName: row.teamName,
        user: {
          id: row.userId,
          name: row.username,
          avatar: row.avatar || '/images/default-avatar.jpg'
        },
        date: row.createdAt,
        link: row.taskId ? `task-details.html?id=${row.taskId}` : null
      }));

      return {
        data: formattedRows,
        totalCount: totalCount || formattedRows.length
      };
    } catch (error) {
      console.error('获取历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取指定用户的历史记录
   */
  static async getByUserId(userId, filters = {}) {
    try {
      // 构建基础查询
      let query = `
        SELECT
          th.id,
          th.taskId,
          th.userId,
          th.action,
          th.details,
          th.createdAt,
          t.title AS taskTitle,
          t.teamId,
          tm.name AS teamName,
          u.username,
          u.avatar,
          'task' AS type
        FROM TaskHistory th
        LEFT JOIN Tasks t ON th.taskId = t.id
        LEFT JOIN Teams tm ON t.teamId = tm.id
        LEFT JOIN Users u ON th.userId = u.id
        LEFT JOIN TeamMembers tmem ON tm.id = tmem.teamId
        WHERE (th.userId = ? OR tmem.userId = ?)
      `;

      // 参数数组
      const params = [userId, userId];

      // 按团队筛选
      if (filters.teamId && filters.teamId !== 'all') {
        query += ' AND t.teamId = ?';
        params.push(filters.teamId);
      }

      // 按操作类型筛选
      if (filters.action && filters.action !== 'all') {
        query += ' AND th.action = ?';
        params.push(filters.action);
      }

      // 按类型筛选
      if (filters.type && filters.type !== 'all') {
        query += ' AND ? = ?'; // 由于当前只有task类型，这里形式上加上条件
        params.push(filters.type, 'task');
      }

      // 按日期范围筛选
      if (filters.startDate) {
        query += ' AND th.createdAt >= ?';
        params.push(filters.startDate + ' 00:00:00');
      }

      if (filters.endDate) {
        query += ' AND th.createdAt <= ?';
        params.push(filters.endDate + ' 23:59:59');
      }

      // 搜索关键词
      if (filters.keyword) {
        query += ' AND (th.details LIKE ? OR t.title LIKE ?)';
        const likeParam = `%${filters.keyword}%`;
        params.push(likeParam, likeParam);
      }

      // 按时间降序排序
      query += ' ORDER BY th.createdAt DESC';

      // 添加分页
      const limit = parseInt(filters.limit || 10);
      const page = parseInt(filters.page || 1);
      if (page && limit) {
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      // 执行查询
      const [rows] = await db.query(query, params);

      // 获取总记录数（用于分页）
      let totalCount = 0;
      if (page && limit) {
        let countQuery = `
          SELECT COUNT(*) as count
          FROM TaskHistory th
          LEFT JOIN Tasks t ON th.taskId = t.id
          LEFT JOIN Teams tm ON t.teamId = tm.id
          LEFT JOIN TeamMembers tmem ON tm.id = tmem.teamId
          WHERE (th.userId = ? OR tmem.userId = ?)
        `;
        const countParams = [userId, userId];

        // 添加过滤条件
        if (filters.teamId && filters.teamId !== 'all') {
          countQuery += ' AND t.teamId = ?';
          countParams.push(filters.teamId);
        }

        if (filters.action && filters.action !== 'all') {
          countQuery += ' AND th.action = ?';
          countParams.push(filters.action);
        }

        if (filters.type && filters.type !== 'all') {
          countQuery += ' AND ? = ?';
          countParams.push(filters.type, 'task');
        }

        if (filters.startDate) {
          countQuery += ' AND th.createdAt >= ?';
          countParams.push(filters.startDate + ' 00:00:00');
        }

        if (filters.endDate) {
          countQuery += ' AND th.createdAt <= ?';
          countParams.push(filters.endDate + ' 23:59:59');
        }

        if (filters.keyword) {
          countQuery += ' AND (th.details LIKE ? OR t.title LIKE ?)';
          const likeParam = `%${filters.keyword}%`;
          countParams.push(likeParam, likeParam);
        }

        const [countResult] = await db.query(countQuery, countParams);
        totalCount = countResult[0].count;
      }

      // 格式化结果
      const formattedRows = rows.map(row => ({
        id: row.id,
        title: row.details,
        taskTitle: row.taskTitle,
        taskId: row.taskId,
        type: row.type,
        action: row.action,
        teamId: row.teamId,
        teamName: row.teamName,
        user: {
          id: row.userId,
          name: row.username,
          avatar: row.avatar || '/images/default-avatar.jpg'
        },
        date: row.createdAt,
        link: row.taskId ? `task-details.html?id=${row.taskId}` : null
      }));

      return {
        data: formattedRows,
        totalCount: totalCount || formattedRows.length
      };
    } catch (error) {
      console.error('获取用户历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定团队的历史记录
   */
  static async getByTeamId(teamId, filters = {}) {
    try {
      // 构建基础查询
      let query = `
        SELECT
          th.id,
          th.taskId,
          th.userId,
          th.action,
          th.details,
          th.createdAt,
          t.title AS taskTitle,
          t.teamId,
          tm.name AS teamName,
          u.username,
          u.avatar,
          'task' AS type
        FROM TaskHistory th
        LEFT JOIN Tasks t ON th.taskId = t.id
        LEFT JOIN Teams tm ON t.teamId = tm.id
        LEFT JOIN Users u ON th.userId = u.id
        WHERE t.teamId = ?
      `;

      // 参数数组
      const params = [teamId];

      // 按操作类型筛选
      if (filters.action && filters.action !== 'all') {
        query += ' AND th.action = ?';
        params.push(filters.action);
      }

      // 按用户筛选
      if (filters.userId) {
        query += ' AND th.userId = ?';
        params.push(filters.userId);
      }

      // 按日期范围筛选
      if (filters.startDate) {
        query += ' AND th.createdAt >= ?';
        params.push(filters.startDate + ' 00:00:00');
      }

      if (filters.endDate) {
        query += ' AND th.createdAt <= ?';
        params.push(filters.endDate + ' 23:59:59');
      }

      // 搜索关键词
      if (filters.keyword) {
        query += ' AND (th.details LIKE ? OR t.title LIKE ? OR u.username LIKE ?)';
        const likeParam = `%${filters.keyword}%`;
        params.push(likeParam, likeParam, likeParam);
      }

      // 按时间降序排序
      query += ' ORDER BY th.createdAt DESC';

      // 添加分页
      const limit = parseInt(filters.limit || 10);
      const page = parseInt(filters.page || 1);
      if (page && limit) {
        const offset = (page - 1) * limit;
        query += ' LIMIT ? OFFSET ?';
        params.push(limit, offset);
      }

      // 执行查询
      const [rows] = await db.query(query, params);

      // 获取总记录数（用于分页）
      let totalCount = 0;
      if (page && limit) {
        let countQuery = `
          SELECT COUNT(*) as count
          FROM TaskHistory th
          LEFT JOIN Tasks t ON th.taskId = t.id
          WHERE t.teamId = ?
        `;
        const countParams = [teamId];

        // 添加过滤条件
        if (filters.action && filters.action !== 'all') {
          countQuery += ' AND th.action = ?';
          countParams.push(filters.action);
        }

        if (filters.userId) {
          countQuery += ' AND th.userId = ?';
          countParams.push(filters.userId);
        }

        if (filters.startDate) {
          countQuery += ' AND th.createdAt >= ?';
          countParams.push(filters.startDate + ' 00:00:00');
        }

        if (filters.endDate) {
          countQuery += ' AND th.createdAt <= ?';
          countParams.push(filters.endDate + ' 23:59:59');
        }

        if (filters.keyword) {
          countQuery += ' AND (th.details LIKE ? OR t.title LIKE ?)';
          const likeParam = `%${filters.keyword}%`;
          countParams.push(likeParam, likeParam);
        }

        const [countResult] = await db.query(countQuery, countParams);
        totalCount = countResult[0].count;
      }

      // 格式化结果
      const formattedRows = rows.map(row => ({
        id: row.id,
        title: row.details,
        taskTitle: row.taskTitle,
        taskId: row.taskId,
        type: row.type,
        action: row.action,
        teamId: row.teamId,
        teamName: row.teamName,
        user: {
          id: row.userId,
          name: row.username,
          avatar: row.avatar || '/images/default-avatar.jpg'
        },
        date: row.createdAt,
        link: row.taskId ? `task-details.html?id=${row.taskId}` : null
      }));

      return {
        data: formattedRows,
        totalCount: totalCount || formattedRows.length
      };
    } catch (error) {
      console.error('获取团队历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 获取特定任务的历史记录
   */
  static async getByTaskId(taskId, filters = {}) {
    try {
      // 构建基础查询
      let query = `
        SELECT
          th.id,
          th.taskId,
          th.userId,
          th.action,
          th.details,
          th.createdAt,
          t.title AS taskTitle,
          t.teamId,
          tm.name AS teamName,
          u.username,
          u.avatar,
          'task' AS type
        FROM TaskHistory th
        LEFT JOIN Tasks t ON th.taskId = t.id
        LEFT JOIN Teams tm ON t.teamId = tm.id
        LEFT JOIN Users u ON th.userId = u.id
        WHERE th.taskId = ?
      `;

      // 参数数组
      const params = [taskId];

      // 按操作类型筛选
      if (filters.action && filters.action !== 'all') {
        query += ' AND th.action = ?';
        params.push(filters.action);
      }

      // 按用户筛选
      if (filters.userId) {
        query += ' AND th.userId = ?';
        params.push(filters.userId);
      }

      // 按日期范围筛选
      if (filters.startDate) {
        query += ' AND th.createdAt >= ?';
        params.push(filters.startDate + ' 00:00:00');
      }

      if (filters.endDate) {
        query += ' AND th.createdAt <= ?';
        params.push(filters.endDate + ' 23:59:59');
      }

      // 按时间降序排序
      query += ' ORDER BY th.createdAt DESC';

      // 执行查询
      const [rows] = await db.query(query, params);

      // 格式化结果
      return rows.map(row => ({
        id: row.id,
        title: row.details,
        taskTitle: row.taskTitle,
        taskId: row.taskId,
        type: row.type,
        action: row.action,
        teamId: row.teamId,
        teamName: row.teamName,
        user: {
          id: row.userId,
          name: row.username,
          avatar: row.avatar || '/images/default-avatar.jpg'
        },
        date: row.createdAt
      }));
    } catch (error) {
      console.error('获取任务历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 记录历史操作
   * @param {Object} historyData 历史记录数据
   * @returns {Object} 创建的历史记录
   */
  static async create(historyData) {
    const { taskId, userId, action, details } = historyData;

    try {
      const [result] = await db.query(
        'INSERT INTO TaskHistory (taskId, userId, action, details) VALUES (?, ?, ?, ?)',
        [taskId, userId, action, details]
      );

      const [history] = await db.query('SELECT * FROM TaskHistory WHERE id = ?', [result.insertId]);
      return history[0];
    } catch (error) {
      console.error('创建历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 删除历史记录
   * @param {number} id 历史记录ID
   * @returns {boolean} 是否成功删除
   */
  static async delete(id) {
    try {
      await db.query('DELETE FROM TaskHistory WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除历史记录失败:', error);
      throw error;
    }
  }

  /**
   * 清理指定时间前的历史记录（用于维护）
   * @param {string} date 日期字符串，格式：YYYY-MM-DD
   * @returns {number} 删除的记录数
   */
  static async cleanupBefore(date) {
    try {
      const [result] = await db.query(
        'DELETE FROM TaskHistory WHERE createdAt < ?',
        [`${date} 00:00:00`]
      );

      return result.affectedRows;
    } catch (error) {
      console.error('清理历史记录失败:', error);
      throw error;
    }
  }
}

module.exports = History;