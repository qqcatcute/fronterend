// controllers/commitController.js
const TaskCommit = require('../models/TaskCommit');
const TaskBranch = require('../models/TaskBranch');
const Task = require('../models/Task');
const Team = require('../models/Teams');
const { validationResult } = require('express-validator');

// 获取分支的所有提交
exports.getCommits = async (req, res, next) => {
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

    const commits = await TaskCommit.findByBranch(branchId);

    res.status(200).json({
      success: true,
      count: commits.length,
      data: commits
    });
  } catch (error) {
    next(error);
  }
};

// 创建新提交
exports.createCommit = async (req, res, next) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { branchId } = req.params;
    const { title, description, content } = req.body;

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

    // 创建提交
    const commit = await TaskCommit.create({
      branchId,
      title,
      description,
      content,
      createdBy: req.user.id
    });

    res.status(201).json({
      success: true,
      data: commit
    });
  } catch (error) {
    next(error);
  }
};

// 获取特定提交
exports.getCommit = async (req, res, next) => {
  try {
    const { commitId } = req.params;

    const commit = await TaskCommit.findById(commitId);
    if (!commit) {
      return res.status(404).json({ message: '未找到该提交' });
    }

    // 获取分支信息
    const branch = await TaskBranch.findById(commit.branchId);

    // 检查用户是否是团队成员
    const task = await Task.findById(branch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该提交' });
    }

    res.status(200).json({
      success: true,
      data: commit
    });
  } catch (error) {
    next(error);
  }
};

// 回退到特定提交
exports.revertToCommit = async (req, res, next) => {
  try {
    const { branchId, commitId } = req.params;

    // 检查分支是否存在
    const branch = await TaskBranch.findById(branchId);
    if (!branch) {
      return res.status(404).json({ message: '未找到该分支' });
    }

    // 检查提交是否存在
    const commit = await TaskCommit.findById(commitId);
    if (!commit) {
      return res.status(404).json({ message: '未找到该提交' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(branch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权执行此操作' });
    }

    // 执行回退操作
    const revertCommit = await TaskCommit.revertToBranch(branchId, commitId, req.user.id);

    res.status(200).json({
      success: true,
      message: '已成功回退到指定版本',
      data: {
        commit: revertCommit,
        content: revertCommit.content
      }
    });
  } catch (error) {
    next(error);
  }
};