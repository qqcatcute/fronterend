// models/TaskCommit.js
const db = require('../config/db');

class TaskCommit {
  static async create(commitData) {
    const { branchId, content, title, description, createdBy } = commitData;

    try {
      const [result] = await db.query(
        'INSERT INTO TaskCommits (branchId, content, title, description, createdBy) VALUES (?, ?, ?, ?, ?)',
        [branchId, content, title, description, createdBy]
      );

      const [commits] = await db.query('SELECT * FROM TaskCommits WHERE id = ?', [result.insertId]);
      return commits[0];
    } catch (error) {
      console.error('创建提交失败:', error);
      throw error;
    }
  }

  static async findByBranch(branchId) {
    try {
      const [rows] = await db.query(`
        SELECT tc.*, u.username, u.avatar 
        FROM TaskCommits tc
        JOIN Users u ON tc.createdBy = u.id
        WHERE tc.branchId = ?
        ORDER BY tc.createdAt DESC
      `, [branchId]);
      return rows;
    } catch (error) {
      console.error('查询分支提交失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query(`
        SELECT tc.*, u.username, u.avatar 
        FROM TaskCommits tc
        JOIN Users u ON tc.createdBy = u.id
        WHERE tc.id = ?
      `, [id]);
      return rows[0];
    } catch (error) {
      console.error('查询提交失败:', error);
      throw error;
    }
  }

  static async revertToBranch(branchId, commitId, userId) {
    try {
      // 获取要回退到的提交
      const [commits] = await db.query('SELECT * FROM TaskCommits WHERE id = ?', [commitId]);
      if (commits.length === 0) {
        throw new Error('未找到该提交');
      }

      const commit = commits[0];

      // 创建新的提交，内容与要回退到的提交相同
      const [result] = await db.query(
        'INSERT INTO TaskCommits (branchId, content, title, description, createdBy) VALUES (?, ?, ?, ?, ?)',
        [branchId, commit.content, `回退到 "${commit.title}"`, `回退到 ${new Date(commit.createdAt).toLocaleString()} 的提交`, userId]
      );

      const [newCommits] = await db.query('SELECT * FROM TaskCommits WHERE id = ?', [result.insertId]);
      return newCommits[0];
    } catch (error) {
      console.error('回退提交失败:', error);
      throw error;
    }
  }
}

module.exports = TaskCommit;