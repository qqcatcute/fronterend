// models/Team.js
const db = require('../config/db');

class Team {
  static async create(teamData) {
    const { name, description, createdBy } = teamData;

    try {
      const [result] = await db.query(
        'INSERT INTO Teams (name, description, createdBy) VALUES (?, ?, ?)',
        [name, description, createdBy]
      );

      // 创建团队的同时将创建者添加为团队拥有者
      await db.query(
        'INSERT INTO TeamMembers (teamId, userId, role) VALUES (?, ?, ?)',
        [result.insertId, createdBy, 'owner']
      );

      const [team] = await db.query('SELECT * FROM Teams WHERE id = ?', [result.insertId]);
      return team[0];
    } catch (error) {
      console.error('创建团队失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM Teams WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('查询团队失败:', error);
      throw error;
    }
  }

  static async findByUser(userId) {
    try {
      const [rows] = await db.query(`
        SELECT t.* FROM Teams t
        JOIN TeamMembers tm ON t.id = tm.teamId
        WHERE tm.userId = ?
      `, [userId]);
      return rows;
    } catch (error) {
      console.error('查询用户团队失败:', error);
      throw error;
    }
  }

  static async update(id, teamData) {
    const { name, description } = teamData;

    try {
      await db.query(
        'UPDATE Teams SET name = ?, description = ? WHERE id = ?',
        [name, description, id]
      );

      const [rows] = await db.query('SELECT * FROM Teams WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('更新团队失败:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      await db.query('DELETE FROM Teams WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除团队失败:', error);
      throw error;
    }
  }

  static async addMember(teamId, userId, role = 'member') {
    try {
      await db.query(
        'INSERT INTO TeamMembers (teamId, userId, role) VALUES (?, ?, ?)',
        [teamId, userId, role]
      );
      return true;
    } catch (error) {
      console.error('添加团队成员失败:', error);
      throw error;
    }
  }

  static async removeMember(teamId, userId) {
    try {
      await db.query(
        'DELETE FROM TeamMembers WHERE teamId = ? AND userId = ?',
        [teamId, userId]
      );
      return true;
    } catch (error) {
      console.error('移除团队成员失败:', error);
      throw error;
    }
  }

  static async updateMemberRole(teamId, userId, role) {
    try {
      await db.query(
        'UPDATE TeamMembers SET role = ? WHERE teamId = ? AND userId = ?',
        [role, teamId, userId]
      );
      return true;
    } catch (error) {
      console.error('更新成员角色失败:', error);
      throw error;
    }
  }

  static async getMembers(teamId) {
    try {
      const [rows] = await db.query(`
        SELECT u.id, u.username, u.email, u.avatar, tm.role 
        FROM Users u
        JOIN TeamMembers tm ON u.id = tm.userId
        WHERE tm.teamId = ?
      `, [teamId]);
      return rows;
    } catch (error) {
      console.error('获取团队成员失败:', error);
      throw error;
    }
  }

  static async checkMembership(teamId, userId) {
    try {
      const [rows] = await db.query(
        'SELECT * FROM TeamMembers WHERE teamId = ? AND userId = ?',
        [teamId, userId]
      );
      return rows.length > 0 ? rows[0] : null;
    } catch (error) {
      console.error('检查成员身份失败:', error);
      throw error;
    }
  }

  // 获取用户在任务相关团队中的角色
  static async getUserRoleByTaskId(taskId, userId) {
    try {
      const [rows] = await db.query(`
        SELECT tm.role FROM TeamMembers tm
        JOIN Tasks t ON tm.teamId = t.teamId
        WHERE t.id = ? AND tm.userId = ?
      `, [taskId, userId]);

      return rows.length > 0 ? rows[0].role : null;
    } catch (error) {
      console.error('获取任务相关用户角色失败:', error);
      throw error;
    }
  }
}

module.exports = Team;