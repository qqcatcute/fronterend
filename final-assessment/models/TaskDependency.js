// models/TaskDependency.js
const db = require('../config/db');

class TaskDependency {
  static async create(dependencyData) {
    const { taskId, dependsOnTaskId, createdBy } = dependencyData;

    try {
      const [result] = await db.query(
        'INSERT INTO TaskDependencies (taskId, dependsOnTaskId, createdBy) VALUES (?, ?, ?)',
        [taskId, dependsOnTaskId, createdBy]
      );

      return { id: result.insertId };
    } catch (error) {
      console.error('创建任务依赖失败:', error);
      throw error;
    }
  }

  static async findByTask(taskId) {
    try {
      const [rows] = await db.query(`
        SELECT td.*, t.title, t.status 
        FROM TaskDependencies td
        JOIN Tasks t ON td.dependsOnTaskId = t.id
        WHERE td.taskId = ?
      `, [taskId]);
      return rows;
    } catch (error) {
      console.error('查询任务依赖失败:', error);
      throw error;
    }
  }

  static async findDependents(taskId) {
    try {
      const [rows] = await db.query(`
        SELECT td.*, t.title, t.status 
        FROM TaskDependencies td
        JOIN Tasks t ON td.taskId = t.id
        WHERE td.dependsOnTaskId = ?
      `, [taskId]);
      return rows;
    } catch (error) {
      console.error('查询依赖该任务的任务失败:', error);
      throw error;
    }
  }

  static async delete(taskId, dependsOnTaskId) {
    try {
      await db.query(
        'DELETE FROM TaskDependencies WHERE taskId = ? AND dependsOnTaskId = ?',
        [taskId, dependsOnTaskId]
      );
      return true;
    } catch (error) {
      console.error('删除任务依赖失败:', error);
      throw error;
    }
  }

  // 检查是否会形成循环依赖
  static async checkCyclicDependency(taskId, dependsOnTaskId) {
    if (taskId === dependsOnTaskId) {
      return true; // 自己不能依赖自己
    }

    try {
      // 检查添加这个依赖是否会形成循环依赖
      const visited = new Set();
      return await this._dfs(dependsOnTaskId, taskId, visited);
    } catch (error) {
      console.error('检查循环依赖失败:', error);
      throw error;
    }
  }

  static async _dfs(current, target, visited) {
    if (current === target) {
      return true; // 找到循环
    }

    if (visited.has(current)) {
      return false;
    }

    visited.add(current);

    const [dependencies] = await db.query(
      'SELECT dependsOnTaskId FROM TaskDependencies WHERE taskId = ?',
      [current]
    );

    for (const dep of dependencies) {
      if (await this._dfs(dep.dependsOnTaskId, target, visited)) {
        return true;
      }
    }

    return false;
  }
}

module.exports = TaskDependency;