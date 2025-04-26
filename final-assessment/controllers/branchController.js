// controllers/branchController.js
const TaskBranch = require('../models/TaskBranch');
const Task = require('../models/Task');
const Team = require('../models/Teams');
const { validationResult } = require('express-validator');

// 获取任务的所有分支
exports.getBranches = async (req, res, next) => {
  try {
    const { taskId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    const branches = await TaskBranch.findByTask(taskId);

    res.status(200).json({
      success: true,
      count: branches.length,
      data: branches
    });
  } catch (error) {
    next(error);
  }
};

// 创建新分支
exports.createBranch = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { taskId } = req.params;
    const { name, description, isDefault } = req.body;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    // 创建分支
    const branch = await TaskBranch.create({
      taskId,
      name,
      description,
      createdBy: req.user.id,
      isDefault: isDefault || false
    });

    res.status(201).json({
      success: true,
      data: branch
    });
  } catch (error) {
    next(error);
  }
};

// 设置默认分支
exports.setDefaultBranch = async (req, res, next) => {
  try {
    const { taskId, branchId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    // 检查分支是否存在
    const branch = await TaskBranch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: '未找到该分支' });
    }

    // 设置为默认分支
    await TaskBranch.setDefault(branchId, taskId);

    res.status(200).json({
      success: true,
      message: '已设置为默认分支'
    });
  } catch (error) {
    next(error);
  }
};

// 删除分支
exports.deleteBranch = async (req, res, next) => {
  try {
    const { taskId, branchId } = req.params;

    // 检查任务是否存在
    const task = await Task.findById(taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到该任务' });
    }

    // 检查用户是否是团队成员
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该任务' });
    }

    // 检查分支是否存在
    const branch = await TaskBranch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: '未找到该分支' });
    }

    // 只有分支创建者、团队管理员和任务创建者可以删除分支
    const canDelete =
      branch.createdBy === req.user.id ||
      task.createdBy === req.user.id ||
      membership.role === 'owner' ||
      membership.role === 'admin';

    if (!canDelete) {
      return res.status(403).json({ message: '无权删除该分支' });
    }

    // 删除分支
    await TaskBranch.delete(branchId);

    res.status(200).json({
      success: true,
      message: '分支已删除'
    });
  } catch (error) {
    if (error.message === '不能删除默认分支') {
      return res.status(400).json({ message: error.message });
    }
    next(error);
  }
};

// 获取分支最新内容
exports.getLatestContent = async (req, res, next) => {
  try {
    const { branchId } = req.params;

    // 检查分支是否存在
    const branch = await TaskBranch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: '未找到该分支' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(branch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该分支' });
    }

    const content = await TaskBranch.getLatestContent(branchId);

    res.status(200).json({
      success: true,
      content
    });
  } catch (error) {
    next(error);
  }
};