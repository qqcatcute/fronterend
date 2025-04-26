// controllers/historyController.js

const History = require('../models/History');
const Team = require('../models/Teams');
const User = require('../models/User');
const { validationResult } = require('express-validator');

// 获取当前用户可见的所有历史记录
exports.getUserHistory = async (req, res, next) => {
  try {
    // 提取查询参数
    const {
      type = 'all',
      team = 'all',
      action = 'all',
      startDate = '',
      endDate = '',
      keyword = '',
      page = 1,
      limit = 10
    } = req.query;

    // 构建过滤条件
    const filters = {
      type,
      teamId: team,
      action,
      startDate,
      endDate,
      keyword,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // 获取用户历史记录
    const historyResult = await History.getByUserId(req.user.id, filters);

    // 返回结果
    res.status(200).json({
      success: true,
      count: historyResult.data.length,
      totalCount: historyResult.totalCount,
      totalPages: Math.ceil(historyResult.totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      data: historyResult.data
    });
  } catch (error) {
    next(error);
  }
};

// 获取特定团队的历史记录
exports.getTeamHistory = async (req, res, next) => {
  try {
    const { teamId } = req.params;

    // 检查团队是否存在
    const team = await Team.findById(teamId);
    if (!team) {
      return res.status(404).json({ message: '未找到该团队' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(team.id, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该团队历史记录' });
    }

    // 提取查询参数
    const {
      type = 'all',
      action = 'all',
      userId = '',
      startDate = '',
      endDate = '',
      keyword = '',
      page = 1,
      limit = 10
    } = req.query;

    // 构建过滤条件
    const filters = {
      type,
      action,
      userId: userId ? parseInt(userId) : null,
      startDate,
      endDate,
      keyword,
      page: parseInt(page),
      limit: parseInt(limit)
    };

    // 获取团队历史记录
    const historyResult = await History.getByTeamId(teamId, filters);

    // 返回结果
    res.status(200).json({
      success: true,
      count: historyResult.data.length,
      totalCount: historyResult.totalCount,
      totalPages: Math.ceil(historyResult.totalCount / parseInt(limit)),
      currentPage: parseInt(page),
      data: historyResult.data
    });
  } catch (error) {
    next(error);
  }
};

// 获取特定任务的历史记录
exports.getTaskHistory = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // 检查用户是否有权限访问该任务
    // 这里省略具体检查逻辑，通常需要确认用户是任务所属团队的成员

    // 提取查询参数
    const {
      action = 'all',
      userId = '',
      startDate = '',
      endDate = ''
    } = req.query;

    // 构建过滤条件
    const filters = {
      action,
      userId: userId ? parseInt(userId) : null,
      startDate,
      endDate
    };

    // 获取任务历史记录
    const historyData = await History.getByTaskId(taskId, filters);

    // 返回结果
    res.status(200).json({
      success: true,
      count: historyData.length,
      data: historyData
    });
  } catch (error) {
    next(error);
  }
};

// 创建历史记录
exports.createHistory = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId, action, details } = req.body;

    // 创建历史记录
    const history = await History.create({
      taskId,
      userId: req.user.id,
      action,
      details
    });

    res.status(201).json({
      success: true,
      data: history
    });
  } catch (error) {
    next(error);
  }
};

// 删除历史记录（管理员功能）
exports.deleteHistory = async (req, res, next) => {
  try {
    // 确保用户是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以删除历史记录' });
    }

    const { id } = req.params;
    await History.delete(id);

    res.status(200).json({
      success: true,
      message: '历史记录已删除'
    });
  } catch (error) {
    next(error);
  }
};

// 清理历史记录（管理员功能）
exports.cleanupHistory = async (req, res, next) => {
  try {
    // 确保用户是管理员
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: '只有管理员可以清理历史记录' });
    }

    const { date } = req.body;
    if (!date) {
      return res.status(400).json({ message: '请提供日期参数' });
    }

    // 清理指定日期前的历史记录
    const count = await History.cleanupBefore(date);

    res.status(200).json({
      success: true,
      message: `已清理 ${count} 条历史记录`,
      count
    });
  } catch (error) {
    next(error);
  }
};

// 获取历史记录统计信息
exports.getHistoryStats = async (req, res, next) => {
  try {
    // 这里可以实现各种统计信息的查询
    // 例如：按用户统计、按时间段统计、按操作类型统计等

    // 目前只是一个示例，实际实现需要在 History 模型中添加相应的方法
    res.status(200).json({
      success: true,
      message: '统计功能待实现'
    });
  } catch (error) {
    next(error);
  }
};