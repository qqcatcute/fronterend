// controllers/mergeController.js
const TaskBranch = require('../models/TaskBranch');
const TaskCommit = require('../models/TaskCommit');
const TaskConflict = require('../models/TaskConflict');
const Task = require('../models/Task');
const Team = require('../models/Teams');
const db = require('../config/db'); // 添加数据库连接导入
const { validationResult } = require('express-validator'); // 确保导入验证工具

// 检查合并可能性
exports.checkMerge = async (req, res, next) => {
  try {
    const { sourceBranchId, targetBranchId } = req.params;

    // 检查源分支是否存在
    const sourceBranch = await TaskBranch.findById(sourceBranchId);
    if (!sourceBranch) {
      return res.status(404).json({ message: '未找到源分支' });
    }

    // 检查目标分支是否存在
    const targetBranch = await TaskBranch.findById(targetBranchId);
    if (!targetBranch) {
      return res.status(404).json({ message: '未找到目标分支' });
    }

    // 检查两个分支是否属于同一任务
    if (sourceBranch.taskId !== targetBranch.taskId) {
      return res.status(400).json({ message: '不能合并不同任务的分支' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(sourceBranch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权执行合并操作' });
    }

    // 获取源分支和目标分支的最新内容
    const sourceContent = await TaskBranch.getLatestContent(sourceBranchId);
    const targetContent = await TaskBranch.getLatestContent(targetBranchId);

    // 简单检查是否有冲突（这里可以实现更复杂的冲突检测逻辑）
    const hasConflict = sourceContent !== targetContent && sourceContent !== '' && targetContent !== '';

    if (hasConflict) {
      // 创建冲突记录
      const conflictContent = `<<<<<<< 源分支 (${sourceBranch.name})\n${sourceContent}\n=======\n${targetContent}\n>>>>>>> 目标分支 (${targetBranch.name})`;

      const conflict = await TaskConflict.create({
        taskId: sourceBranch.taskId,
        sourceBranchId,
        targetBranchId,
        conflictContent
      });

      res.status(200).json({
        success: true,
        hasConflict: true,
        conflict: {
          id: conflict.id,
          content: conflictContent
        }
      });
    } else {
      res.status(200).json({
        success: true,
        hasConflict: false
      });
    }
  } catch (error) {
    console.error('检查合并时出错:', error);
    next(error);
  }
};

// 执行分支合并
exports.mergeBranches = async (req, res, next) => {
  try {
    const { sourceBranchId, targetBranchId } = req.params;

    // 检查源分支是否存在
    const sourceBranch = await TaskBranch.findById(sourceBranchId);
    if (!sourceBranch) {
      return res.status(404).json({ message: '未找到源分支' });
    }

    // 检查目标分支是否存在
    const targetBranch = await TaskBranch.findById(targetBranchId);
    if (!targetBranch) {
      return res.status(404).json({ message: '未找到目标分支' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(sourceBranch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权执行合并操作' });
    }

    // 获取源分支的最新内容
    const sourceContent = await TaskBranch.getLatestContent(sourceBranchId);

    // 直接合并：将源分支内容创建为目标分支的新提交
    const commit = await TaskCommit.create({
      branchId: targetBranchId,
      content: sourceContent,
      title: `合并自 ${sourceBranch.name}`,
      description: `从分支 "${sourceBranch.name}" 合并到 "${targetBranch.name}"`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: '分支合并成功',
      data: {
        commit,
        content: sourceContent
      }
    });
  } catch (error) {
    console.error('合并分支时出错:', error);
    next(error);
  }
};

// 获取未解决的冲突
exports.getConflicts = async (req, res, next) => {
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

    const conflicts = await TaskConflict.findByTask(taskId);

    res.status(200).json({
      success: true,
      count: conflicts.length,
      data: conflicts
    });
  } catch (error) {
    console.error('获取冲突时出错:', error);
    next(error);
  }
};

// 新增: 获取单个冲突详情
exports.getConflict = async (req, res, next) => {
  try {
    const { conflictId } = req.params;

    // 查找冲突记录
    const conflict = await TaskConflict.findById(conflictId);
    if (!conflict) {
      return res.status(404).json({ message: '未找到该冲突记录' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(conflict.taskId);
    if (!task) {
      return res.status(404).json({ message: '未找到关联任务' });
    }

    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权访问该冲突记录' });
    }

    res.status(200).json({
      success: true,
      data: conflict
    });
  } catch (error) {
    console.error('获取冲突详情时出错:', error);
    next(error);
  }
};

// 解决冲突 - 修改后的版本，增加管理员权限检查
exports.resolveConflict = async (req, res, next) => {
  try {
    // 添加验证结果检查
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { sourceBranchId, targetBranchId, resolvedContent } = req.body;

    // 检查源分支是否存在
    const sourceBranch = await TaskBranch.findById(sourceBranchId);
    if (!sourceBranch) {
      return res.status(404).json({ message: '未找到源分支' });
    }

    // 检查目标分支是否存在
    const targetBranch = await TaskBranch.findById(targetBranchId);
    if (!targetBranch) {
      return res.status(404).json({ message: '未找到目标分支' });
    }

    // 检查用户是否是团队成员
    const task = await Task.findById(sourceBranch.taskId);
    const membership = await Team.checkMembership(task.teamId, req.user.id);
    if (!membership) {
      return res.status(403).json({ message: '无权执行合并操作' });
    }

    // 新增：检查用户是否有管理员权限
    if (membership.role !== 'admin' && membership.role !== 'owner') {
      return res.status(403).json({
        message: '只有管理员或团队所有者才能解决冲突',
        role: membership.role
      });
    }

    // 查找未解决的冲突 - 使用 TaskConflict 模型
    const conflicts = await TaskConflict.findByTask(sourceBranch.taskId);
    const pendingConflict = conflicts.find(c =>
      c.sourceBranchId == sourceBranchId &&
      c.targetBranchId == targetBranchId &&
      c.status === 'pending'
    );

    if (pendingConflict) {
      // 解决冲突
      await TaskConflict.resolve(pendingConflict.id, req.user.id);
    }

    // 创建新的提交，包含解决冲突后的内容
    const commit = await TaskCommit.create({
      branchId: targetBranchId,
      content: resolvedContent,
      title: `解决与 ${sourceBranch.name} 的冲突`,
      description: `解决从分支 "${sourceBranch.name}" 合并到 "${targetBranch.name}" 的冲突`,
      createdBy: req.user.id
    });

    res.status(200).json({
      success: true,
      message: '冲突已解决，分支已合并',
      data: {
        commit,
        content: resolvedContent
      }
    });
  } catch (error) {
    console.error('解决冲突时出错:', error);
    next(error);
  }
};