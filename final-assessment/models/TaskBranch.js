// models/TaskBranch.js
const db = require('../config/db');
const TaskCommit = require('./TaskCommit');

class TaskBranch {
  static async create(branchData) {
    const { taskId, name, description, createdBy, isDefault } = branchData;

    try {
      // 如果设置为默认分支，需要将其他分支设为非默认
      if (isDefault) {
        await db.query(
          'UPDATE TaskBranches SET isDefault = FALSE WHERE taskId = ?',
          [taskId]
        );
      }

      const [result] = await db.query(
        'INSERT INTO TaskBranches (taskId, name, description, createdBy, isDefault) VALUES (?, ?, ?, ?, ?)',
        [taskId, name, description, createdBy, isDefault || false]
      );

      const [branches] = await db.query('SELECT * FROM TaskBranches WHERE id = ?', [result.insertId]);
      return branches[0];
    } catch (error) {
      console.error('创建分支失败:', error);
      throw error;
    }
  }

  static async findByTask(taskId) {
    try {
      const [rows] = await db.query('SELECT * FROM TaskBranches WHERE taskId = ?', [taskId]);
      return rows;
    } catch (error) {
      console.error('查询任务分支失败:', error);
      throw error;
    }
  }

  static async findById(id) {
    try {
      const [rows] = await db.query('SELECT * FROM TaskBranches WHERE id = ?', [id]);
      return rows[0];
    } catch (error) {
      console.error('查询分支失败:', error);
      throw error;
    }
  }

  static async setDefault(branchId, taskId) {
    try {
      // 先将所有分支设为非默认
      await db.query(
        'UPDATE TaskBranches SET isDefault = FALSE WHERE taskId = ?',
        [taskId]
      );

      // 将指定分支设为默认
      await db.query(
        'UPDATE TaskBranches SET isDefault = TRUE WHERE id = ?',
        [branchId]
      );

      return true;
    } catch (error) {
      console.error('设置默认分支失败:', error);
      throw error;
    }
  }

  static async delete(id) {
    try {
      // 检查是否为默认分支
      const [branch] = await db.query('SELECT isDefault FROM TaskBranches WHERE id = ?', [id]);
      if (branch.length > 0 && branch[0].isDefault) {
        throw new Error('不能删除默认分支');
      }

      await db.query('DELETE FROM TaskBranches WHERE id = ?', [id]);
      return true;
    } catch (error) {
      console.error('删除分支失败:', error);
      throw error;
    }
  }

  static async getLatestContent(branchId) {
    try {
      // 获取分支最新提交
      const [commits] = await db.query(
        'SELECT * FROM TaskCommits WHERE branchId = ? ORDER BY createdAt DESC LIMIT 1',
        [branchId]
      );

      if (commits.length > 0) {
        return commits[0].content;
      }

      return '';  // 如果没有提交，返回空字符串
    } catch (error) {
      console.error('获取分支最新内容失败:', error);
      throw error;
    }
  }
}

module.exports = TaskBranch;